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
import { WorkerHeaderComponent } from '../../../shared/components/worker-header/worker-header.component';

interface ObraInstalacion {
  ID: number;
  NOMBRE: string;
  NOMBRECLIENTE?: string;
  TELEFONO?: string;
  DIRECCION?: string;
  ESTADO?: string;
}

interface KitItem {
  idChecklistItem: number;
  NombreMaterial: string;
  Cantidad?: number;
  UnidadMedida?: string;
  NotasKit?: string;
  Marcado?: boolean | number;
}

interface KitAsignado {
  IDOBRAKIT?: number;
  idObraKit?: number;
  IDKIT?: number;
  idKit?: number;
  NOMBRE?: string;
  Nombre?: string;
  DESCRIPCION?: string;
  Descripcion?: string;
  ASIGNADOPOR?: string;
  AsignadoPor?: string;
  Materiales?: KitItem[];
}

interface FotoPendiente {
  file: File;
  url: string;
}

@Component({
  selector: 'app-instalacion',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, WorkerHeaderComponent],
  templateUrl: './instalacion.component.html',
  styleUrls: ['./instalacion.component.scss'],
})
export class InstalacionComponent implements OnInit, OnDestroy {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private env = inject(EnvService);
  private offline = inject(OfflineSyncService);
  private layout = inject(WorkerLayoutService);
  private permisos = inject(PermisosService);
  private router = inject(Router);

  obrasInstalacion: ObraInstalacion[] = [];
  selectedObra: ObraInstalacion | null = null;
  loading = false;
  error = false;
  confirmando = false;
  finalizado = false;

  kit: KitAsignado | null = null;
  items: KitItem[] = [];
  detalle: { cliente?: string; direccion?: string; telefono?: string } = {};

  notaInstalacion = '';
  fotosPendientes: FotoPendiente[] = [];
  mapsVisible = false;
  modalFinalizarAbierto = false;

  ngOnInit(): void {
    this.layout.setPageTitle('Instalación');
    this.cargarInstalaciones();
  }

  ngOnDestroy(): void {
    this.limpiarFotosPendientes();
  }

  volver(): void {
    this.router.navigateByUrl('/movil/actividades');
  }

  reintentar(): void {
    this.cargarInstalaciones();
  }

  cargarInstalaciones(): void {
    this.loading = true;
    this.error = false;
    this.api.get<any[]>('/Obras').subscribe({
      next: (data) => {
        this.loading = false;
        const normalizadas = (data || []).map(o => ({
          ID: Number(o.IDOBRA ?? o.ID),
          NOMBRE: o.NOMBREOBRA ?? o.NOMBRE ?? 'Obra sin nombre',
          NOMBRECLIENTE: o.NOMBRECLIENTE,
          TELEFONO: o.TELEFONOCLIENTE ?? o.TELEFONO,
          DIRECCION: o.DIRECCIONOBRA ?? o.DIRECCION,
          ESTADO: o.ESTADOBRA ?? o.ESTADO ?? ''
        }));
        // Instalación programada (4). Si ya está en "Pendiente de aceptación"
        // (8) no es accionable.
        this.obrasInstalacion = normalizadas.filter(o =>
          o.ESTADO?.toLowerCase().includes('instalaci') &&
          !o.ESTADO?.toLowerCase().includes('pendiente de acept')
        );
        if (this.obrasInstalacion.length > 0) {
          this.seleccionarObra(this.obrasInstalacion[0]);
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

  seleccionarObra(obra: ObraInstalacion): void {
    if (this.selectedObra?.ID === obra.ID) return;
    this.selectedObra = obra;
    this.finalizado = false;
    this.kit = null;
    this.items = [];
    this.detalle = {
      cliente: obra.NOMBRECLIENTE || 'Cliente asignado',
      direccion: obra.DIRECCION || '',
      telefono: obra.TELEFONO || ''
    };
    this.notaInstalacion = '';
    this.mapsVisible = false;
    this.limpiarFotosPendientes();

    const user = this.auth.getUser();
    if (user && obra.ID) {
      this.permisos.cargarPermisos(obra.ID, user.idTrabajador);
    }

    this.api.get<any>(`/Obras/detalle/${obra.ID}`).subscribe({
      next: (d) => {
        if (!d) return;
        this.detalle = {
          cliente: d.NOMBRECLIENTE ?? d.NombreCliente ?? this.detalle.cliente,
          direccion: d.DIRECCIONOBRA ?? d.DireccionObra ?? this.detalle.direccion,
          telefono: d.TELEFONOCLIENTE ?? d.TelefonoCliente ?? this.detalle.telefono
        };
      },
      error: () => {}
    });

    this.cargarKit(obra.ID);
  }

  private cargarKit(obraId: number): void {
    this.api.get<KitAsignado | null>(`/Obras/${obraId}/kit`).subscribe({
      next: (k) => {
        this.kit = k ?? null;
        this.items = (k?.Materiales ?? []).map((m: any) => ({
          idChecklistItem: Number(m.idChecklistItem ?? m.IDCHECKLISTITEM),
          NombreMaterial: m.NOMBREMATERIAL ?? m.NombreMaterial,
          Cantidad: m.CANTIDAD ?? m.Cantidad,
          UnidadMedida: m.UNIDADMEDIDA ?? m.UnidadMedida,
          NotasKit: m.NOTASKIT ?? m.NotasKit,
          Marcado: Boolean(m.MARCADO ?? m.Marcado)
        }));
      },
      error: () => {
        this.kit = null;
        this.items = [];
      }
    });
  }

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
    const target = this.env.isMobile() ? '_system' : '_blank';
    window.open(url, target);
  }

  get porcentajeVerificado(): number {
    if (this.items.length === 0) return 0;
    const ok = this.items.filter(i => i.Marcado).length;
    return Math.round((ok / this.items.length) * 100);
  }

  get checklistCompleto(): boolean {
    return this.items.length > 0 && this.porcentajeVerificado === 100;
  }

  async toggleItem(item: KitItem, event: Event): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    if (this.confirmando || this.finalizado) return;
    const nuevo = !item.Marcado;
    item.Marcado = nuevo;

    try {
      await firstValueFrom(this.api.patch(
        `/Obras/${this.selectedObra?.ID}/kit/checklist/${item.idChecklistItem}`,
        { marcado: nuevo }
      ));
    } catch {
      item.Marcado = !nuevo;
      this.toast.warning('No se pudo actualizar el checklist. Reintentando…');
    }
  }

  // ── Finalizar Instalación ──────────────────────────────────────────────────
  abrirModalFinalizar(): void {
    if (this.confirmando || this.finalizado) return;
    if (!this.checklistCompleto) {
      this.toast.warning('Completa todo el checklist del kit antes de finalizar la instalación.');
      return;
    }
    if (!this.puedeConfirmarActividad) {
      this.toast.warning('No tienes permiso para confirmar la instalación.');
      return;
    }
    this.modalFinalizarAbierto = true;
  }

  cerrarModalFinalizar(): void {
    if (this.confirmando) return;
    this.modalFinalizarAbierto = false;
    this.notaInstalacion = '';
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

  async finalizarInstalacion(): Promise<void> {
    if (this.confirmando || this.finalizado) return;
    if (!this.selectedObra) return;
    if (!this.puedeConfirmarActividad) {
      this.toast.warning('No tienes permiso para confirmar la instalación.');
      return;
    }

    // Validación local de backend (simétrica a la validación real).
    if (!this.checklistCompleto) {
      this.toast.warning('El checklist del kit debe estar completo.');
      return;
    }

    const obraId = this.selectedObra.ID;
    const nota = this.notaInstalacion?.trim()
      ? this.notaInstalacion.trim()
      : 'Instalación finalizada en domicilio del cliente.';

    this.confirmando = true;
    const payload = {
      estado: 'Instalacion Finalizada',
      nota
    };

    try {
      await firstValueFrom(this.api.put(`/Obras/${obraId}`, payload));
      await this.subirFotosPendientes(obraId);
      this.confirmando = false;
      this.finalizado = true;
      this.modalFinalizarAbierto = false;
      this.notaInstalacion = '';
      this.limpiarFotosPendientes();
      this.toast.success('Instalación finalizada. Queda pendiente de aceptación.');
      this.obrasInstalacion = this.obrasInstalacion.filter(o => o.ID !== obraId);
      this.selectedObra = this.obrasInstalacion[0] ?? null;
      if (this.selectedObra) {
        this.seleccionarObra(this.selectedObra);
      } else {
        this.kit = null;
        this.items = [];
      }
    } catch (err: any) {
      this.confirmando = false;
      const msg = err?.error?.error || err?.error?.message;
      if (msg) {
        this.toast.warning(msg);
      } else {
        this.offline.enqueue('PUT', `/Obras/${obraId}`, payload);
        for (const f of this.fotosPendientes) {
          await this.offline.enqueueFile(`/Obras/${obraId}/fotos`, f.file);
        }
        this.finalizado = true;
        this.modalFinalizarAbierto = false;
        this.toast.info('Sin conexión: instalación guardada en cola local (RF-35).');
      }
    }
  }

  private async subirFotosPendientes(obraId: number): Promise<void> {
    const tipo = 'Instalacion';
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
