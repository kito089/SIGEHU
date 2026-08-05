import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../services/api.service';
import { EnvService } from '../../../../services/env.service';
import { TrabajadoresRefreshService } from '../../../../services/trabajadores-refresh.service';
import { ToastService } from '../../../../core/services/toast.service';

/* =========================================================================
   SIGEHU — Nuevo / Actualizar Trabajador (componente Angular standalone)

   Sirve tanto para alta como para edición: si recibe [trabajadorId] (por
   @Input o por queryParam `id`) carga los datos existentes y cambia el
   título/botón a modo edición.

   Conexión al backend:
     - GET    /Trabajadores/:id         → carga datos para edición
     - POST   /Trabajadores             → alta
     - PUT    /Trabajadores/:id         → edición
     - POST   /Trabajadores/:id/imss    → subida del documento IMSS (multipart)
   ========================================================================= */

@Component({
  selector: 'app-trabajador-new',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './trabajadornew.component.html',
  styleUrls: ['./trabajadornew.component.css'],
})
export class TrabajadorNewComponent implements OnInit {

  // Si viene con id (por @Input o por queryParam), es edición.
  @Input() trabajadorId: number | null = null;

  form: FormGroup;
  loading = false;
  guardando = false;

  documentoSeleccionado: File | null = null;
  isDragging = false;
  rutaDocumentoExistente = '';
  documentoExistenteVisible = false;

  private previewUrl: string | null = null;

  oficios = [
    'Especialista en Corte y Soldadura',
    'Especialista en Pintura',
    'Levantamiento y medidas',
    'Ayudante General',
    'Otro',
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private api: ApiService,
    private env: EnvService,
    private refreshService: TrabajadoresRefreshService,
    private toast: ToastService
  ) {
    this.form = this.fb.group({
      usuario: ['', [Validators.required, Validators.minLength(3), Validators.pattern(/^[a-zA-Z0-9._-]+$/)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      oficio: ['', [Validators.required]],
      // Permite "+", números y espacios (máx. 15 dígitos). Se sanea antes de enviar.
      telefono: ['', [Validators.required, Validators.pattern(/^\+?[\d\s]{7,16}$/)]],
      correo: ['', [Validators.email]],
      observaciones: [''],
    });
  }

  ngOnInit(): void {
    const qId = this.route.snapshot.queryParamMap.get('id');
    if (qId) {
      this.trabajadorId = Number(qId) || null;
    }

    if (this.trabajadorId) {
      this.loading = true;
      this.fetchTrabajador(this.trabajadorId).then(trabajador => {
        this.form.patchValue(trabajador);
        this.rutaDocumentoExistente = trabajador.rutaDocumentoImss || '';
        this.documentoExistenteVisible = !!trabajador.rutaDocumentoImss;
        this.loading = false;
      });
    }
  }

  get esEdicion(): boolean {
    return this.trabajadorId !== null;
  }

  formatearTamano(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  // ── Teléfono ─────────────────────────────────────────────────────────────
  // Filtra en vivo: solo "+", números y espacios.
  onTelefonoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = input.value.replace(/[^\d+ ]/g, '');
    if (limpio !== input.value) {
      input.value = limpio;
      this.form.get('telefono')?.setValue(limpio);
    }
  }

  private sanitizarTelefono(telefono: string): string | null {
    if (!telefono) return null;
    const comprimido = telefono.replace(/[\s\-()]/g, '');
    return /^\+?\d{1,15}$/.test(comprimido) ? comprimido : null;
  }

  // ── Drag & Drop ──────────────────────────────────────────────────────────
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer && event.dataTransfer.files.length > 0) {
      this.seleccionarArchivo(event.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.seleccionarArchivo(input.files[0]);
    }
    input.value = '';
  }

  private seleccionarArchivo(file: File): void {
    if (!/\.(pdf|jpg|jpeg|png|webp|gif)$/i.test(file.name) && !file.type.startsWith('image/')) {
      this.toast.warning('Solo se permiten archivos PDF o imágenes');
      return;
    }
    this.documentoSeleccionado = file;
  }

  quitarDocumento(): void {
    if (this.previewUrl) {
      URL.revokeObjectURL(this.previewUrl);
      this.previewUrl = null;
    }
    if (this.documentoSeleccionado) {
      this.documentoSeleccionado = null;
    } else if (this.documentoExistenteVisible) {
      this.documentoExistenteVisible = false;
      this.rutaDocumentoExistente = '';
    }
  }

  previsualizarDocumento(): void {
    // 1. Documento recién seleccionado (blob local).
    if (this.documentoSeleccionado) {
      if (this.previewUrl) {
        window.open(this.previewUrl, '_blank');
        return;
      }
      this.previewUrl = URL.createObjectURL(this.documentoSeleccionado);
      window.open(this.previewUrl, '_blank');
      return;
    }

    // 2. Documento existente (ruta relativa en BD: uploads/imss/...).
    if (this.rutaDocumentoExistente) {
      if (/^(blob:|https?:|data:)/i.test(this.rutaDocumentoExistente)) {
        window.open(this.rutaDocumentoExistente, '_blank');
        return;
      }
      const base = (this.env.getBaseUrl() || '').replace(/\/+$/, '');
      window.open(base + '/' + this.rutaDocumentoExistente.replace(/^\/+/, ''), '_blank');
    }
  }

  nombreArchivoExistente(): string {
    const ruta = this.rutaDocumentoExistente;
    if (!ruta) return '';
    const ultimo = ruta.split('/').pop() || '';
    return ultimo || this.rutaDocumentoExistente;
  }

  // ── Persistencia ─────────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Corrige los campos marcados antes de guardar');
      return;
    }

    const raw = this.form.getRawValue();
    const telefono = this.sanitizarTelefono(raw.telefono || '');
    if (raw.telefono && telefono === null) {
      this.toast.error('Teléfono inválido: usa solo "+" y números, máximo 15 dígitos');
      return;
    }

    this.guardando = true;

    const payload: Record<string, unknown> = {
      Usuario: raw.usuario,
      Nombre: raw.nombre,
      Telefono: telefono,
      Correo: raw.correo || null,
      Observaciones: raw.observaciones || null,
      RutaDocumentoIMSS: this.rutaDocumentoExistente || null,
    };

    // En edición, si existía documento y ya no está visible → eliminarlo.
    if (this.trabajadorId && !this.documentoSeleccionado && this.rutaDocumentoExistente === '') {
      payload['RutaDocumentoIMSS'] = null;
      payload['deleteImss'] = true;
    }

    try {
      let id: number;
      if (this.trabajadorId) {
        payload['Tipo'] = 2; // TiposUsuarios: 1 = Propietario, 2 = Trabajador
        await firstValueFrom(this.api.put('/Trabajadores/' + this.trabajadorId, payload));
        id = this.trabajadorId;
      } else {
        payload['Contra'] = this.contraPorDefecto();
        payload['Tipo'] = 2; // TiposUsuarios: 1 = Propietario, 2 = Trabajador
        const created: any = await firstValueFrom(this.api.post('/Trabajadores', payload));
        id = Number(created?.idTrabajador ?? 0);
      }

      if (this.documentoSeleccionado) {
        await this.subirDocumento(id, this.documentoSeleccionado);
        this.quitarDocumento();
      }

      this.toast.success(this.esEdicion ? 'Trabajador actualizado correctamente' : 'Trabajador creado correctamente');
      this.refreshService.notificarCambio();
      this.router.navigate(['/admin/trabajadores']);
    } catch (err) {
      // El interceptor ya notifica los errores HTTP con el mensaje del backend.
      // Solo mostramos el fallback genérico cuando el backend no envió un mensaje útil.
      const mensajeBackend = (err as any)?.error?.error;
      if (!mensajeBackend) {
        this.toast.error('Error de comunicación: no se pudo completar la transacción de datos.');
      }
      console.error('[trabajadornew] Error al guardar:', err);
    } finally {
      this.guardando = false;
    }
  }

  private async subirDocumento(id: number, file: File): Promise<void> {
    const formData = new FormData();
    formData.append('imss', file, file.name);
    await firstValueFrom(this.api.uploadFile('/Trabajadores/' + id + '/imss', formData));
  }

  cancelar(): void {
    this.router.navigate(['/admin/trabajadores']);
  }

  private contraPorDefecto(): string {
    return '123456';
  }

  // ── Carga para edición ───────────────────────────────────────────────────
  private async fetchTrabajador(id: number): Promise<any> {
    const raw: any = await firstValueFrom(this.api.get('/Trabajadores/' + id));
    return {
      usuario: raw.NOMBREUSUARIO ?? raw.nombreUsuario ?? '',
      nombre: raw.NOMBRECOMPLETO ?? raw.nombreCompleto ?? '',
      telefono: raw.TELEFONO ?? raw.telefono ?? '',
      correo: raw.CORREO ?? raw.correo ?? '',
      observaciones: raw.OBSERVACIONES ?? raw.observaciones ?? '',
      rutaDocumentoImss: raw.RUTADOCUMENTOIMSS ?? raw.rutaDocumentoImss ?? '',
    };
  }
}