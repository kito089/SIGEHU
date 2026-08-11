import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../../services/api.service';
import { AuthService } from '../../../../../services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';

/* =========================================================================
   SIGEHU — Nueva Obra (modal desde el detalle de Cliente)

   Ampliado para el checklist "Trabajos/Obras":
     - Cliente asociado (automático según el cliente del detalle).
     - Dirección: combobox con la dirección general del cliente (Direccion /
       DireccionFiscal) y opción "Otra dirección…" para escribir una nueva.
     - Medidas estimadas: Ancho, Alto y Profundidad.
     - Primeras notas y fotos: se registran en la etapa "Levantamientos"
       (idEstadoObra = 2) tras crear la obra.

   Emite `creada` tras persistir (POST /Obras) para que el detalle recargue
   el árbol, y `cancelar` al cerrar.
   ========================================================================= */

interface OpcionCliente {
  idCliente: number;
  nombre: string;
}

interface OpcionTrabajo {
  idTrabajo: number;
  nombre: string;
}

@Component({
  selector: 'app-nueva-obra-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './nueva-obra-modal.component.html',
  styleUrls: ['./nueva-obra-modal.component.scss'],
})
export class NuevaObraModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  @Input() idClienteInicial: number | null = null;

  // Trabajo preseleccionado (acordeón → "Agregar Obra" a un trabajo existente).
  @Input() idTrabajoInicial: number | null = null;

  // Dirección precargada: usada por el flujo "Nuevo Trabajo → Agregar Obra"
  // para precargar la dirección del trabajo en el modal de la obra.
  @Input() direccionPrecargada: string | null = null;

  // Oculta el selector "Tipo de trabajo": cuando el modal se usa como paso 2
  // del flujo "Nuevo Trabajo", el trabajo aún no existe y no debe poder
  // elegirse uno distinto (se vinculará al trabajo recién creado).
  @Input() ocultarCampoTrabajo = false;

  // Emite el id de la obra creada para que el flujo de "Nuevo Trabajo" pueda
  // vincularla a un trabajo recién creado.
  @Output() creada = new EventEmitter<number>();
  @Output() cancelar = new EventEmitter<void>();

  form: FormGroup;
  cargando = false;
  guardando = false;

  clientes: OpcionCliente[] = [];
  trabajos: OpcionTrabajo[] = [];

  // Direcciones del cliente seleccionado (para el combobox) + bandera que
  // habilita el input de "Otra dirección…".
  direccionesCliente: { label: string; valor: string }[] = [];
  usarOtraDireccion = false;

  // Fotos a subir (asignadas a Levantamientos, idEstadoObra=2) con su vista previa.
  fotosSeleccionadas: { file: File; nombre: string; url: string }[] = [];

  // Etapa del checklist "Primeras notas" / fotos → Levantamientos (id 2).
  private readonly ESTADO_LEVANTAMIENTOS = 2;

  constructor() {
    this.form = this.fb.group({
      idCliente: [null, [Validators.required]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      idTrabajo: [null],
      fechaInicio: ['', [Validators.required]],
      direccion: [''],
      ancho: [null],
      alto: [null],
      profundidad: [null],
      notasIniciales: [''],
    });
  }

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    try {
      await this.cargarClientes();
      if (this.idClienteInicial != null) {
        this.form.patchValue({ idCliente: this.idClienteInicial });
        await this.onClienteCambio();

        // Trabajo preseleccionado: fuerza el selector a ese trabajo (activo).
        if (this.idTrabajoInicial != null) {
          this.form.patchValue({ idTrabajo: this.idTrabajoInicial });
        }

        // Precargar la dirección del trabajo en el flujo "Nuevo Trabajo → Obra".
        const precargada = this.direccionPrecargada?.trim();
        if (precargada && !this.form.get('direccion')?.value) {
          this.usarOtraDireccion = true;
          this.form.patchValue({ direccion: precargada });
        }
      }
    } finally {
      this.cargando = false;
    }
  }

  private async cargarClientes(): Promise<void> {
    try {
      const rows: any[] = await firstValueFrom(this.api.get<any[]>('/Clientes'));
      this.clientes = (rows || [])
        .filter((r) => r.ACTIVO ?? r.Activo ?? r.activo ?? true)
        .map((r) => ({
          idCliente: Number(r.IDCLIENTE ?? r.idCliente ?? r.id),
          nombre: String(r.NOMBRE ?? r.Nombre ?? r.nombre ?? ''),
        }))
        .filter((c) => c.idCliente && c.nombre);
    } catch {
      this.clientes = [];
    }
  }

  private async cargarTrabajos(idCliente: number): Promise<void> {
    try {
      const raw: any = await firstValueFrom(this.api.get<any>('/Clientes/' + idCliente + '/trabajos'));
      const lista = Array.isArray(raw?.trabajos) ? raw.trabajos : [];
      this.trabajos = lista.map((t: any) => ({
        idTrabajo: Number(t.IDTRABAJO ?? t.idTrabajo),
        nombre: String(t.NOMBRE ?? t.Nombre ?? t.nombre ?? ''),
      }));
    } catch {
      this.trabajos = [];
    }
  }

  // Carga los trabajos y las direcciones del cliente (general y fiscal) para
  // el combobox de dirección.
  async onClienteCambio(): Promise<void> {
    const id = this.form.get('idCliente')?.value;
    this.form.patchValue({ idTrabajo: null, direccion: '' });
    this.usarOtraDireccion = false;
    this.direccionesCliente = [];

    if (id == null) {
      this.trabajos = [];
      return;
    }

    await this.cargarTrabajos(Number(id));

    try {
      const raw: any = await firstValueFrom(this.api.get<any>('/Clientes/' + Number(id)));
      const direccion = String(raw.DIRECCION ?? raw.Direccion ?? raw.direccion ?? '').trim();
      const direccionFiscal = String(raw.DIRECCIONFISCAL ?? raw.DireccionFiscal ?? raw.direccionFiscal ?? '').trim();
      const opciones: { label: string; valor: string }[] = [];
      if (direccion) opciones.push({ label: 'Dirección del cliente: ' + direccion, valor: direccion });
      if (direccionFiscal && direccionFiscal !== direccion) {
        opciones.push({ label: 'Dirección fiscal: ' + direccionFiscal, valor: direccionFiscal });
      }
      this.direccionesCliente = opciones;
    } catch {
      this.direccionesCliente = [];
    }
  }

  // Dirección combobox: preseleccionó una dirección conocida → escribir otra.
  onDireccionSelect(valor: string): void {
    if (valor === '__otra__') {
      this.usarOtraDireccion = true;
      this.form.patchValue({ direccion: '' });
    } else {
      this.usarOtraDireccion = false;
      this.form.patchValue({ direccion: valor });
    }
  }

  // Archivos de foto → levantamientos. Validación genérica (se reutiliza la
  // del backend: JPEG/JPG/PNG/WEBP, máx 10MB).
  onFotosChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    this.fotosSeleccionadas = files.map((file) => ({
      file,
      nombre: file.name,
      url: URL.createObjectURL(file),
    }));
  }

  quitarFoto(idx: number): void {
    const quitada = this.fotosSeleccionadas.splice(idx, 1)[0];
    if (quitada?.url) {
      URL.revokeObjectURL(quitada.url);
    }
  }

  async onGuardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    const raw = this.form.getRawValue();

    try {
      const res: any = await firstValueFrom(this.api.post<any>('/Obras', {
        idCliente: raw.idCliente,
        Nombre: raw.nombre.trim(),
        Direccion: raw.direccion?.trim() || null,
        idTrabajo: raw.idTrabajo ?? null,
        FechaInicio: raw.fechaInicio || null,
        Ancho: raw.ancho != null && raw.ancho !== '' ? Number(raw.ancho) : null,
        Alto: raw.alto != null && raw.alto !== '' ? Number(raw.alto) : null,
        Profundidad: raw.profundidad != null && raw.profundidad !== '' ? Number(raw.profundidad) : null,
      }));

      const idObra = Number(res?.idObra ?? 0);

      // Primeras notas → Levantamientos.
      if (raw.notasIniciales?.trim()) {
        await this.registrarNota(idObra, raw.notasIniciales.trim());
      }

      // Fotos → Levantamientos.
      for (const foto of this.fotosSeleccionadas) {
        await this.subirFoto(idObra, foto.file);
      }
      this.fotosSeleccionadas = [];

      this.toast.success('Obra creada correctamente');
      this.creada.emit(idObra);
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    } finally {
      this.guardando = false;
    }
  }

  // El trabajador actual proviene de la sesión (auth). Si no está disponible
  // (sesión corrupta) se deja al backend decidir con su contexto por defecto.
  private idTrabajadorActual(): number | null {
    return this.auth.getUser()?.idTrabajador ?? null;
  }

  private async registrarNota(idObra: number, nota: string): Promise<void> {
    const idTrabajador = this.idTrabajadorActual();
    if (!idTrabajador) return;
    try {
      await firstValueFrom(this.api.post<any>(`/Obras/${idObra}/notas`, {
        idEstadoObra: this.ESTADO_LEVANTAMIENTOS,
        idTrabajador,
        nota,
      }));
    } catch {
      // No bloquea la creación de la obra.
    }
  }

  private async subirFoto(idObra: number, file: File): Promise<void> {
    const idTrabajador = this.idTrabajadorActual();
    if (!idTrabajador) return;
    try {
      const fd = new FormData();
      fd.append('foto', file, file.name);
      fd.append('idEstadoObra', String(this.ESTADO_LEVANTAMIENTOS));
      fd.append('idTrabajador', String(idTrabajador));
      await firstValueFrom(this.api.uploadFile<any>(`/Obras/${idObra}/fotos`, fd));
    } catch {
      // No bloquea la creación de la obra.
    }
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}