import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { ApiService } from '../../../services/api.service';
import { EnvService } from '../../../services/env.service';
import { TrabajadoresRefreshService } from '../../../services/trabajadores-refresh.service';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { DetailModalComponent } from '../../../shared/components/detail-modal/detail-modal.component';

export interface Trabajador {
  id: number;
  usuario: string;
  nombre: string;
  telefono: string;
  correo: string;
  observaciones: string;
  totalObras: number;
  obrasAsignadas: string[];
  documentoImssUrl?: string;
}

@Component({
  selector: 'app-trabajadores',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent, ConfirmModalComponent, DetailModalComponent],
  templateUrl: './trabajadores.component.html',
  styleUrl: './trabajadores.component.scss',
})
export class TrabajadoresComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private env = inject(EnvService);
  private refreshService = inject(TrabajadoresRefreshService);


  trabajadores: Trabajador[] = [];
  searchTerm = '';
  selectedTrabajador: Trabajador | null = null;
  pendienteEliminar: Trabajador | null = null;
  private refreshSub: Subscription | null = null;
  private detallePendienteId: number | null = null;

  columns: DataTableColumn[] = [
    { key: 'usuario', label: 'Usuario' },
    { key: 'nombre', label: 'Trabajador' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'totalObras', label: 'Obra(s) asignada(s)' },
  ];

  ngOnInit(): void {
    this.cargarTrabajadores();

    // Recarga cuando `trabajador-new` confirma un guardado.
    this.refreshSub = this.refreshService.cambios$.subscribe(() => {
      this.cargarTrabajadores();
    });

    // Apertura directa del detalle desde el buscador global (?ver=<id>).
    this.route.queryParamMap.subscribe(params => {
      const ver = params.get('ver');
      this.detallePendienteId = ver ? Number(ver) || null : null;
      this.abrirDetallePendiente();
    });
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  cargarTrabajadores(): void {
    this.fetchTrabajadores().then(trabajadores => {
      this.trabajadores = trabajadores;
      this.abrirDetallePendiente();
    });
  }

  private abrirDetallePendiente(): void {
    const id = this.detallePendienteId;
    if (id == null) return;
    const trabajador = this.trabajadores.find(t => t.id === id);
    if (!trabajador) return;
    this.detallePendienteId = null;
    this.verTrabajador(trabajador);
  }

  private mapTrabajador(raw: any): Trabajador {
    return {
      id: raw.IDTRABAJADOR ?? raw.idTrabajador,
      usuario: raw.NOMBREUSUARIO ?? raw.nombreUsuario ?? '',
      nombre: raw.NOMBRECOMPLETO ?? raw.nombreCompleto ?? '',
      telefono: raw.TELEFONO ?? raw.telefono ?? '',
      correo: raw.CORREO ?? raw.correo ?? '',
      observaciones: raw.OBSERVACIONES ?? raw.observaciones ?? '',
      totalObras: Number(raw.TOTALOBRAS ?? raw.totalObras ?? 0),
      obrasAsignadas: [],
      documentoImssUrl: raw.RUTADOCUMENTOIMSS ?? raw.rutaDocumentoImss ?? '',
    };
  }

  private async fetchTrabajadores(): Promise<Trabajador[]> {
    const rows: unknown[] = await firstValueFrom(this.api.get<any[]>('/Trabajadores'));
    return (rows || []).map(row => this.mapTrabajador(row));
  }

  private async fetchObrasAsignadas(id: number): Promise<string[]> {
    const rows: any[] = await firstValueFrom(this.api.get<any[]>('/Trabajadores/' + id + '/obras'));
    return (rows || []).map(row => row.NOMBREOBRA ?? row.nombreObra ?? 'Obra sin nombre');
  }

  get trabajadoresFiltrados(): Trabajador[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.trabajadores;

    return this.trabajadores.filter(t =>
      t.nombre.toLowerCase().includes(term) ||
      t.usuario.toLowerCase().includes(term) ||
      t.telefono.includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  obrasLabel(totalObras: number): string {
    if (!totalObras || totalObras === 0) return 'Sin obras asignadas';
    return `${totalObras} ${totalObras === 1 ? 'obra asignada' : 'obras asignadas'}`;
  }

  async verTrabajador(trabajador: Trabajador): Promise<void> {
    this.selectedTrabajador = trabajador;
    try {
      trabajador.obrasAsignadas = await this.fetchObrasAsignadas(trabajador.id);
    } catch {
      trabajador.obrasAsignadas = [];
    }
  }

  cerrarDetalle(): void {
    this.selectedTrabajador = null;
  }

  abrirDocumentoImss(url?: string): void {
    if (!url) return;

    // Si ya es URL absoluta o blob, se abre tal cual.
    if (/^(blob:|https?:|data:)/i.test(url)) {
      window.open(url, '_blank');
      return;
    }

    const base = (this.env.getBaseUrl() || '').replace(/\/+$/, '');
    window.open(base + '/' + url.replace(/^\/+/, ''), '_blank');
  }

  eliminarTrabajador(trabajador: Trabajador): void {
    this.pendienteEliminar = trabajador;
  }

  get mensajeEliminacion(): string {
    return this.pendienteEliminar
      ? `¿Eliminar a "${this.pendienteEliminar.nombre}"? Esta acción no se puede deshacer.`
      : '';
  }

  cancelarEliminacion(): void {
    this.pendienteEliminar = null;
  }

  async confirmarEliminacion(): Promise<void> {
    const trabajador = this.pendienteEliminar;
    if (!trabajador) return;

    try {
      await firstValueFrom(this.api.delete('/Trabajadores/' + trabajador.id));
      this.trabajadores = this.trabajadores.filter(t => t.id !== trabajador.id);
      if (this.selectedTrabajador?.id === trabajador.id) {
        this.selectedTrabajador = null;
      }
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    } finally {
      this.pendienteEliminar = null;
    }
  }

  actualizarDatos(trabajador: Trabajador): void {
    this.router.navigate(['/admin/trabajadores/nuevo'], {
      queryParams: { id: trabajador.id }
    });
  }

  nuevoTrabajador(): void {
    this.router.navigate(['/admin/trabajadores/nuevo']);
  }
}