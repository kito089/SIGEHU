import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { EnvService } from '../../../services/env.service';
import { OfflineSyncService } from '../../../services/offline-sync.service';
import { WorkerLayoutService } from '../../../core/services/worker-layout.service';
import { PermisosService } from '../../../core/services/permisos.service';
import { WorkerHeaderComponent } from '../../../shared/components/worker-header/worker-header.component';

interface ObraLevantamiento {
  ID: number;
  IDOBRA?: number;
  NOMBRE: string;
  NOMBREOBRA?: string;
  CLIENTE_NOMBRE?: string;
  NOMBRECLIENTE?: string;
  DIRECCION?: string;
  DIRECCIONOBRA?: string;
  TELEFONO?: string;
  ESTADO?: string;
  ESTADOBRA?: string;
  IDESTADOOBRA?: number;
}

interface FotoPendiente {
  file: File;
  url: string;
}

@Component({
  selector: 'app-levantamientos',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule, WorkerHeaderComponent],
  templateUrl: './levantamientos.component.html',
  styleUrls: ['./levantamientos.component.scss'],
})
export class LevantamientosComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private env = inject(EnvService);
  private offline = inject(OfflineSyncService);
  private layout = inject(WorkerLayoutService);
  private permisos = inject(PermisosService);
  private router = inject(Router);

  obras: ObraLevantamiento[] = [];
  selectedObra: ObraLevantamiento | null = null;
  loading = false;
  error = false;
  guardando = false;
  finalizado = false;

  // Datos reales de la obra seleccionada (cargados desde /Obras/detalle/:id).
  detalle: {
    cliente?: string;
    direccion?: string;
    telefono?: string;
  } = {};

  // Fotos seleccionadas (cámara o galería). Se suben individualmente.
  fotos: FotoPendiente[] = [];
  mapsVisible = false;

  form: FormGroup;

  constructor() {
    this.form = this.fb.group({
      alto: ['', [Validators.required, Validators.min(0)]],
      ancho: ['', [Validators.required, Validators.min(0)]],
      profundidad: ['', [Validators.min(0)]],
      observaciones: [''],
    });
  }

  ngOnInit(): void {
    this.layout.setPageTitle('Levantamiento');
    this.cargarObras();
  }

  ngOnDestroy(): void {
    this.fotos.forEach(f => URL.revokeObjectURL(f.url));
  }

  volver(): void {
    this.router.navigateByUrl('/movil/actividades');
  }

  cargarObras(): void {
    this.loading = true;
    this.error = false;
    this.api.get<any[]>('/Obras').subscribe({
      next: (data) => {
        this.loading = false;
        const normalizadas = (data || []).map(o => ({
          ID: Number(o.IDOBRA ?? o.ID ?? o.idObra),
          NOMBRE: o.NOMBREOBRA ?? o.NOMBRE ?? o.NombreObra ?? 'Obra sin nombre',
          CLIENTE_NOMBRE: o.NOMBRECLIENTE ?? o.CLIENTE_NOMBRE ?? o.NombreCliente,
          DIRECCION: o.DIRECCIONOBRA ?? o.DIRECCION ?? o.DireccionObra,
          TELEFONO: o.TELEFONOCLIENTE ?? o.TELEFONO,
          ESTADO: o.ESTADOBRA ?? o.ESTADO ?? o.EstadoObra,
          IDESTADOOBRA: Number(o.IDESTADOOBRA ?? o.idEstadoObra ?? 0)
        }));
        // Solo obras en etapa de Levantamiento (2). Una vez en "Pendiente de
        // aceptación" (8) ya no son accionables para el trabajador.
        this.obras = normalizadas.filter(o =>
          o.ESTADO?.toLowerCase().includes('levantamiento')
        );
        if (this.obras.length > 0) {
          this.seleccionarObra(this.obras[0]);
        } else {
          this.selectedObra = null;
        }
      },
      error: () => {
        this.loading = false;
        this.error = true;
      }
    });
  }

  reintentar(): void {
    this.cargarObras();
  }

  seleccionarObra(obra: ObraLevantamiento): void {
    if (this.selectedObra?.ID === obra.ID) return;
    this.selectedObra = obra;
    this.finalizado = false;
    this.detalle = {
      cliente: obra.CLIENTE_NOMBRE || 'Cliente asignado',
      direccion: obra.DIRECCION || '',
      telefono: obra.TELEFONO || ''
    };
    this.limpiarFotos();
    this.form.reset({ alto: '', ancho: '', profundidad: '', observaciones: '' });

    // Carga permisos granulares del trabajador para esta obra.
    const user = this.auth.getUser();
    if (user && obra.ID) {
      this.permisos.cargarPermisos(obra.ID, user.idTrabajador);
    }

    // Detalle para obtener teléfono/dirección fiables (VW_DETALLE_OBRA).
    this.api.get<any>(`/Obras/detalle/${obra.ID}`).subscribe({
      next: (d) => {
        if (!d) return;
        this.detalle = {
          cliente: d.NOMBRECLIENTE ?? d.NombreCliente ?? this.detalle.cliente,
          direccion: d.DIRECCIONOBRA ?? d.DireccionObra ?? this.detalle.direccion,
          telefono: d.TELEFONOCLIENTE ?? d.TelefonoCliente ?? this.detalle.telefono
        };
      },
      error: () => { /* se conserva el detalle mínimo del listado */ }
    });
  }

  // ── Permisos granulares (whitelist por defecto) ──────────────────────────
  get puedeVerDireccion(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'direccion_instalacion');
  }

  get puedeVerTelefono(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'telefono_cliente');
  }

  get puedeSubirFotos(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'subir_fotos');
  }

  get puedeConfirmarActividad(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'confirmar_actividad');
  }

  // ── Mapa: previsualización retráctil + abrir Google Maps ──────────────────
  get direccionNormalizada(): string {
    return (this.detalle.direccion || '').trim();
  }

  get mapsEmbedUrl(): string {
    const q = encodeURIComponent(this.direccionNormalizada || this.selectedObra?.NOMBRE || '');
    return `https://www.google.com/maps?q=${q}&output=embed`;
  }

  toggleMaps(): void {
    this.mapsVisible = !this.mapsVisible;
  }

  abrirGoogleMaps(): void {
    const dir = this.direccionNormalizada;
    if (!dir) {
      this.toast.warning('No hay dirección registrada para abrir en el mapa.');
      return;
    }
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dir)}`;
    // Capacitor usa '_system' para abrir el navegador/navegador de mapas del SO;
    // web/Electron abren una pestaña nueva.
    const target = this.env.isMobile() ? '_system' : '_blank';
    window.open(url, target);
  }

  // ── Fotos: cámara (+ galería), múltiples, subida individual ────────────────
  onCamara(event: Event): void {
    this.agregarArchivos((event.target as HTMLInputElement).files);
    (event.target as HTMLInputElement).value = '';
  }

  onGaleria(event: Event): void {
    this.agregarArchivos((event.target as HTMLInputElement).files);
    (event.target as HTMLInputElement).value = '';
  }

  private agregarArchivos(files: FileList | null): void {
    if (!files) return;
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      this.fotos = [...this.fotos, { file: f, url: URL.createObjectURL(f) }];
    }
  }

  quitarFoto(idx: number): void {
    const [quitada] = this.fotos.splice(idx, 1);
    if (quitada) URL.revokeObjectURL(quitada.url);
    this.fotos = [...this.fotos];
  }

  private limpiarFotos(): void {
    this.fotos.forEach(f => URL.revokeObjectURL(f.url));
    this.fotos = [];
  }

  // ── Finalizar Levantamiento ────────────────────────────────────────────────
  async submitLevantamiento(): Promise<void> {
    if (this.guardando || this.finalizado) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Completa las dimensiones requeridas (Alto y Ancho).');
      return;
    }
    if (!this.selectedObra) return;

    const obraId = this.selectedObra.ID;
    const v = this.form.value;
    const nota = v.observaciones?.trim()
      ? v.observaciones.trim()
      : 'Levantamiento de medidas completado.';

    this.guardando = true;
    const payload = {
      estado: 'Levantamiento Finalizado',
      alto: v.alto,
      ancho: v.ancho,
      profundidad: v.profundidad,
      nota
    };

    try {
      await firstValueFrom(this.api.put(`/Obras/${obraId}`, payload));
      // La transición de estado + nota ocurren en el backend; ahora sube cada
      // foto de forma individual (una petición por archivo).
      await this.subirFotos(obraId);
      this.guardando = false;
      this.finalizado = true;
      this.limpiarFotos();
      this.toast.success('Levantamiento finalizado. Queda pendiente de aceptación.');
      // Remueve la obra de la lista accionable.
      this.obras = this.obras.filter(o => o.ID !== obraId);
      this.selectedObra = this.obras[0] ?? null;
      if (this.selectedObra) this.seleccionarObra(this.selectedObra);
    } catch {
      this.guardando = false;
      // Offline (RF-35): se encola la finalización y cada foto para sincronizar.
      this.offline.enqueue('PUT', `/Obras/${obraId}`, payload);
      for (const f of this.fotos) {
        await this.offline.enqueueFile(`/Obras/${obraId}/fotos`, f.file);
      }
      this.finalizado = true;
      this.toast.info('Sin conexión: levantamiento guardado en cola local (RF-35).');
    }
  }

  private async subirFotos(obraId: number): Promise<void> {
    const tipo = 'Levantamiento';
    for (const f of this.fotos) {
      const fd = new FormData();
      fd.append('foto', f.file);
      fd.append('tipo', tipo);
      try {
        await firstValueFrom(this.api.uploadFile(`/Obras/${obraId}/fotos`, fd));
      } catch {
        // Una foto fallida no bloquea la finalización; se encola offline.
        await this.offline.enqueueFile(`/Obras/${obraId}/fotos`, f.file);
      }
    }
  }
}
