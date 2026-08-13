import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../services/auth.service';
import { EnvService } from '../../../services/env.service';
import { OfflineSyncService } from '../../../services/offline-sync.service';
import { WorkerLayoutService } from '../../../core/services/worker-layout.service';
import { PermisosService } from '../../../core/services/permisos.service';
import { MobileHeaderComponent } from '../../../shared/components/layout/mobile-header/mobile-header.component';

interface MaterialObra {
  idMaterial?: number;
  Nombre?: string;
  Cantidad?: number;
  Medida?: string;
  UnidadMedida?: string;
  Notas?: string;
}

interface FotoObra {
  idFotoObra: number;
  RutaArchivo: string;
  EstadosObra_idEstadoObra?: number;
  SubioNombre?: string;
  RolSubio?: string;
  FechaCreacion?: string | Date;
}

interface NotaObra {
  idNotaObra: number;
  Nota: string;
  EstadosObra_idEstadoObra?: number;
  AutorNombre?: string;
  RolAutor?: string;
  FechaCreacion?: string | Date;
}

interface ObraFabricacion {
  ID: number;
  NOMBRE: string;
  NOMBRECLIENTE?: string;
  DIRECCION?: string;
  ESTADO: string;
  ANCHO?: number;
  ALTO?: number;
  PROFUNDIDAD?: number;
  FECHAINICIO?: string | Date;
  FECHAENTREGA?: string | Date;
  ESPECIFICACIONES?: string;
  MATERIALES?: MaterialObra[];
}

interface FotoPendiente {
  file: File;
  url: string;
}

@Component({
  selector: 'app-fabricacion-campo',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, MobileHeaderComponent],
  templateUrl: './fabricacion.component.html',
  styleUrls: ['./fabricacion.component.scss']
})
export class FabricacionComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private env = inject(EnvService);
  private offline = inject(OfflineSyncService);
  private layout = inject(WorkerLayoutService);
  private permisos = inject(PermisosService);
  private router = inject(Router);

  obras: ObraFabricacion[] = [];
  selectedObra: ObraFabricacion | null = null;
  loading = false;
  error = false;
  guardando = false;
  finalizado = false;

  // Obra tocada desde "Actividades" (history.state.actividadId): se preselecciona
  // en lugar de quedarse en la primera de la lista.
  obraDestinoId: number | null = null;

  materiales: MaterialObra[] = [];
  fotos: FotoObra[] = [];
  fotoPrincipal: FotoObra | null = null;
  notas: NotaObra[] = [];

  fotosPendientes: FotoPendiente[] = [];
  notaAvance = '';

  medidasExpanded = false;
  materialesExpanded = false;
  zoomVisible = false;
  modalFinalizarAbierto = false;

  ngOnInit(): void {
    this.layout.setPageTitle('Fabricación');
    this.obraDestinoId = this.leerDestino();
    this.cargarObrasFabricacion();
  }

  private leerDestino(): number | null {
    const id = (history.state as { actividadId?: number } | null)?.actividadId;
    return typeof id === 'number' && Number.isFinite(id) ? id : null;
  }

  ngOnDestroy(): void {
    this.limpiarFotosPendientes();
  }

  volver(): void {
    this.router.navigateByUrl('/movil/actividades');
  }

  reintentar(): void {
    this.cargarObrasFabricacion();
  }

  cargarObrasFabricacion(): void {
    this.loading = true;
    this.error = false;
    this.api.get<any[]>('/Obras').subscribe({
      next: (data) => {
        this.loading = false;
        const normalizadas = (data || []).map(o => ({
          ID: Number(o.IDOBRA ?? o.ID),
          NOMBRE: o.NOMBREOBRA ?? o.NOMBRE ?? 'Obra sin nombre',
          NOMBRECLIENTE: o.NOMBRECLIENTE,
          DIRECCION: o.DIRECCIONOBRA ?? o.DIRECCION,
          ESTADO: o.ESTADOBRA ?? o.ESTADO ?? '',
          ANCHO: o.ANCHO ?? o.Ancho,
          ALTO: o.ALTO ?? o.Alto,
          PROFUNDIDAD: o.PROFUNDIDAD ?? o.Profundidad,
          FECHAINICIO: o.FECHAINICIO ?? o.FechaInicio,
          FECHAENTREGA: o.FECHAENTREGA ?? o.FechaEntrega,
          ESPECIFICACIONES: o.ESPECIFICACIONES ?? o.Especificaciones
        }));
        // Solo obras en etapa En fabricación (3); si ya están en
        // "Pendiente de aceptación" (8) no son accionables.
        this.obras = normalizadas.filter(o =>
          o.ESTADO?.toLowerCase().includes('fabric') &&
          !o.ESTADO?.toLowerCase().includes('pendiente de acept')
        );
        if (this.obras.length > 0) {
          const objetivo = this.obraDestinoId != null
            ? this.obras.find(o => o.ID === this.obraDestinoId)
            : undefined;
          this.seleccionarObra(objetivo ?? this.obras[0]);
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

  seleccionarObra(obra: ObraFabricacion): void {
    if (this.selectedObra?.ID === obra.ID) return;
    this.selectedObra = obra;
    this.finalizado = false;
    this.materiales = [];
    this.fotos = [];
    this.fotoPrincipal = null;
    this.notas = [];
    this.medidasExpanded = false;
    this.materialesExpanded = false;
    this.notaAvance = '';
    this.limpiarFotosPendientes();

    const user = this.auth.getUser();
    if (user && obra.ID) {
      this.permisos.cargarPermisos(obra.ID, user.idTrabajador);
    }

    if (obra.ID) {
      this.cargarMateriales(obra.ID);
      this.cargarFotos(obra.ID);
      this.cargarNotas(obra.ID);
    }
  }

  private cargarMateriales(obraId: number): void {
    this.api.get<MaterialObra[]>(`/Obras/${obraId}/materiales`).subscribe({
      next: (mats) => this.materiales = mats || [],
      error: () => { this.materiales = []; }
    });
  }

  private cargarFotos(obraId: number): void {
    this.api.get<FotoObra[]>(`/Obras/${obraId}/fotos`).subscribe({
      next: (lista) => {
        this.fotos = this.ordenarFotosPorProcedencia(lista || []);
        this.fotoPrincipal = this.fotos[0] ?? null;
      },
      error: () => { this.fotos = []; }
    });
  }

  // Reordenamiento: fotos del propietario (asignadas por administrador)
  // primero, luego las del levantamiento del trabajador, preservando la autoría.
  private ordenarFotosPorProcedencia(fotos: FotoObra[]): FotoObra[] {
    const esAdmin = (f: FotoObra) => {
      const rol = String(f.RolSubio ?? '').toLowerCase();
      return rol && rol !== 'trabajador';
    };
    return [...fotos].sort((a, b) => {
      const aAdmin = esAdmin(a) ? 0 : 1;
      const bAdmin = esAdmin(b) ? 0 : 1;
      if (aAdmin !== bAdmin) return aAdmin - bAdmin;
      return 0;
    });
  }

  private cargarNotas(obraId: number): void {
    this.api.get<NotaObra[]>(`/Obras/${obraId}/notas`).subscribe({
      next: (lista) => this.notas = this.ordenarNotasPorProcedencia(lista || []),
      error: () => { this.notas = []; }
    });
  }

  private ordenarNotasPorProcedencia(notas: NotaObra[]): NotaObra[] {
    const esAdmin = (n: NotaObra) => {
      const rol = String(n.RolAutor ?? '').toLowerCase();
      return rol && rol !== 'trabajador';
    };
    return [...notas].sort((a, b) => {
      const aAdmin = esAdmin(a) ? 0 : 1;
      const bAdmin = esAdmin(b) ? 0 : 1;
      if (aAdmin !== bAdmin) return aAdmin - bAdmin;
      return 0;
    });
  }

  get puedeVerDireccion(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'direccion_instalacion');
  }

  get puedeVerMedidas(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'medidas');
  }

  get puedeVerMateriales(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'medidas');
  }

  get puedeVerNotas(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'notas_obra');
  }

  get puedeVerFotos(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'fotos_referencia');
  }

  get puedeSubirFotos(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'subir_fotos');
  }

  get puedeConfirmarActividad(): boolean {
    return this.permisos.puedeVerCampo(this.selectedObra?.ID, 'confirmar_actividad');
  }

  // ── Utilidades de presentación ────────────────────────────────────────────
  fotoUrl(ruta: string): string {
    if (!ruta) return '';
    const base = this.env.getBaseUrl().replace(/\/$/, '');
    return ruta.startsWith('http') ? ruta : `${base}/${ruta.replace(/^\/+/, '')}`;
  }

  get fechaEntrega(): string {
    const v = this.selectedObra?.FECHAENTREGA ?? this.selectedObra?.FECHAINICIO;
    if (!v) return 'Sin fecha';
    const d = new Date(v as string);
    if (isNaN(d.getTime())) return 'Sin fecha';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  }

  esNotaAdmin(n: NotaObra): boolean {
    const rol = String(n.RolAutor ?? '').toLowerCase();
    return !!rol && rol !== 'trabajador';
  }

  esFotoAdmin(f: FotoObra): boolean {
    const rol = String(f.RolSubio ?? '').toLowerCase();
    return !!rol && rol !== 'trabajador';
  }

  seleccionarFotoPrincipal(f: FotoObra): void {
    this.fotoPrincipal = f;
  }

  abrirZoom(): void {
    if (this.fotoPrincipal) this.zoomVisible = true;
  }

  cerrarZoom(): void {
    this.zoomVisible = false;
  }

  toggleMedidas(): void {
    this.medidasExpanded = !this.medidasExpanded;
  }

  toggleMateriales(): void {
    this.materialesExpanded = !this.materialesExpanded;
  }

  // ── Finalización ──────────────────────────────────────────────────────────
  abrirModalFinalizar(): void {
    if (this.guardando || this.finalizado) return;
    this.modalFinalizarAbierto = true;
  }

  cerrarModalFinalizar(): void {
    if (this.guardando) return;
    this.modalFinalizarAbierto = false;
    this.notaAvance = '';
    this.limpiarFotosPendientes();
  }

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
      this.fotosPendientes = [...this.fotosPendientes, { file: f, url: URL.createObjectURL(f) }];
    }
  }

  quitarFotoPendiente(idx: number): void {
    const [quitada] = this.fotosPendientes.splice(idx, 1);
    if (quitada) URL.revokeObjectURL(quitada.url);
    this.fotosPendientes = [...this.fotosPendientes];
  }

  private limpiarFotosPendientes(): void {
    this.fotosPendientes.forEach(f => URL.revokeObjectURL(f.url));
    this.fotosPendientes = [];
  }

  async finalizarFabricacion(): Promise<void> {
    if (this.guardando || this.finalizado) return;
    if (!this.selectedObra) return;
    if (!this.puedeConfirmarActividad) {
      this.toast.warning('No tienes permiso para confirmar la fabricación.');
      return;
    }

    const obraId = this.selectedObra.ID;
    const nota = this.notaAvance?.trim()
      ? this.notaAvance.trim()
      : 'Fabricación completada en taller.';

    this.guardando = true;
    const payload = {
      estado: 'Fabricacion Finalizada',
      nota
    };

    try {
      await firstValueFrom(this.api.put(`/Obras/${obraId}`, payload));
      // Subida individual (una petición por archivo).
      await this.subirFotosPendientes(obraId);
      this.guardando = false;
      this.finalizado = true;
      this.modalFinalizarAbierto = false;
      this.notaAvance = '';
      this.limpiarFotosPendientes();
      this.toast.success('Fabricación finalizada. Queda pendiente de aceptación.');
      this.obras = this.obras.filter(o => o.ID !== obraId);
      this.selectedObra = this.obras[0] ?? null;
      if (this.selectedObra) {
        this.seleccionarObra(this.selectedObra);
      } else {
        this.materiales = [];
        this.fotos = [];
        this.fotoPrincipal = null;
        this.notas = [];
      }
    } catch {
      this.guardando = false;
      this.offline.enqueue('PUT', `/Obras/${obraId}`, payload);
      for (const f of this.fotosPendientes) {
        await this.offline.enqueueFile(`/Obras/${obraId}/fotos`, f.file);
      }
      this.finalizado = true;
      this.modalFinalizarAbierto = false;
      this.toast.info('Sin conexión: fabricación guardada en cola local (RF-35).');
    }
  }

  private async subirFotosPendientes(obraId: number): Promise<void> {
    const tipo = 'Fabricacion';
    for (const f of this.fotosPendientes) {
      const fd = new FormData();
      fd.append('foto', f.file);
      fd.append('tipo', tipo);
      try {
        await firstValueFrom(this.api.uploadFile(`/Obras/${obraId}/fotos`, fd));
      } catch {
        await this.offline.enqueueFile(`/Obras/${obraId}/fotos`, f.file);
      }
    }
  }
}
