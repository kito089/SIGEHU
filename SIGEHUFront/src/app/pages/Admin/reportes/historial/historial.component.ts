import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { FilterBarComponent, FilterOption } from '../../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../../shared/components/data-table/data-table.component';
import { DetailModalComponent } from '../../../../shared/components/detail-modal/detail-modal.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { AuditoriaService, AuditoriaRegistro, AuditoriaDetalle } from '../../../../services/auditoria.service';

/* =========================================================================
   SIGEHU — Historial completo de auditorías (RF-33).

   Página independiente que muestra TODOS los eventos de Auditorias /
   AuditoriasDetalles con filtros (búsqueda + día), paginación cliente y
   modal de detalles de cambios por campo para actualizaciones.
   ========================================================================= */

@Component({
  selector: 'app-historial',
  standalone: true,
  imports: [
    CommonModule,
    FilterBarComponent,
    DataTableComponent,
    DetailModalComponent,
    EmptyStateComponent,
    SkeletonComponent,
  ],
  templateUrl: './historial.component.html',
  styleUrl: './historial.component.scss',
})
export class HistorialComponent implements OnInit {
  private router = inject(Router);
  private auditoria = inject(AuditoriaService);

  historial: AuditoriaRegistro[] = [];
  cargando = false;
  busqueda = '';
  filtroDia = '';
  error = false;

  columnas: DataTableColumn[] = [
    { key: 'id', label: 'ID', width: '70px' },
    { key: 'accion', label: 'Acción' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'usuario', label: 'Usuario' },
    { key: 'fecha', label: 'Fecha' },
  ];

  // ── Paginación (cliente) ────────────────────────────────────────────────
  tamanoPagina = 20;
  paginaActual = 1;

  get paginasTotales(): number {
    return Math.max(1, Math.ceil(this.historialFiltrado.length / this.tamanoPagina));
  }

  get paginaSlice(): AuditoriaRegistro[] {
    const inicio = (this.paginaActual - 1) * this.tamanoPagina;
    return this.historialFiltrado.slice(inicio, inicio + this.tamanoPagina);
  }

  get rangoPagina(): string {
    if (this.historialFiltrado.length === 0) return '0 registros';
    const inicio = (this.paginaActual - 1) * this.tamanoPagina + 1;
    const fin = Math.min(this.paginaActual * this.tamanoPagina, this.historialFiltrado.length);
    return `${inicio}–${fin} de ${this.historialFiltrado.length}`;
  }

  // ── Filtros ─────────────────────────────────────────────────────────────
  get diaOpciones(): FilterOption[] {
    const dias = Array.from(new Set(this.historial.map(a => this.aDia(a.fecha))));
    dias.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0));
    return [
      { value: '', label: 'Todos los días' },
      ...dias.map(d => ({ value: d, label: this.formatearDia(d) })),
    ];
  }

  get historialFiltrado(): AuditoriaRegistro[] {
    const term = this.busqueda.trim().toLowerCase();
    return this.historial.filter(a => {
      const porDia = !this.filtroDia || this.aDia(a.fecha) === this.filtroDia;
      const porTexto = !term
        || a.descripcion.toLowerCase().includes(term)
        || a.usuario.toLowerCase().includes(term)
        || a.tabla.toLowerCase().includes(term);
      return porDia && porTexto;
    });
  }

  // ── Modal de detalles de una actualización ──────────────────────────────
  detalleRegistro: AuditoriaRegistro | null = null;
  detalleCampos: AuditoriaDetalle[] = [];
  detalleCargando = false;

  ngOnInit(): void {
    this.cargar();
  }

  async cargar(): Promise<void> {
    this.cargando = true;
    this.error = false;
    try {
      this.historial = await firstValueFrom(this.auditoria.historial());
      this.paginaActual = 1;
    } catch {
      this.error = true;
      this.historial = [];
    } finally {
      this.cargando = false;
    }
  }

  onBusqueda(term: string): void {
    this.busqueda = term;
    this.paginaActual = 1;
  }

  onFiltroDia(dia: string): void {
    this.filtroDia = dia;
    this.paginaActual = 1;
  }

  irAPagina(pagina: number): void {
    if (pagina < 1 || pagina > this.paginasTotales) return;
    this.paginaActual = pagina;
  }

  async verDetalles(registro: AuditoriaRegistro): Promise<void> {
    this.detalleRegistro = registro;
    this.detalleCampos = [];
    this.detalleCargando = true;
    try {
      this.detalleCampos = await firstValueFrom(this.auditoria.detalles(registro.id));
    } catch {
      this.detalleCampos = [];
    } finally {
      this.detalleCargando = false;
    }
  }

  cerrarDetalles(): void {
    this.detalleRegistro = null;
    this.detalleCampos = [];
  }

  volver(): void {
    this.router.navigate(['/admin/reportes']);
  }

  // ── Helpers de presentación ─────────────────────────────────────────────
  etiquetaAccion(accion: string): string {
    switch (accion) {
      case 'INSERT': return 'Creación';
      case 'UPDATE': return 'Actualización';
      case 'DELETE': return 'Eliminación';
      default: return accion;
    }
  }

  badgeClass(accion: string): string {
    switch (accion) {
      case 'INSERT': return 'badge--ok';
      case 'UPDATE': return 'badge--info';
      case 'DELETE': return 'badge--danger';
      default: return 'badge--info';
    }
  }

  fechaHora(fecha: Date): string {
    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    const hh = String(fecha.getHours()).padStart(2, '0');
    const min = String(fecha.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${fecha.getFullYear()} · ${hh}:${min}`;
  }

  private aDia(fecha: Date): string {
    const dd = String(fecha.getDate()).padStart(2, '0');
    const mm = String(fecha.getMonth() + 1).padStart(2, '0');
    return `${fecha.getFullYear()}-${mm}-${dd}`;
  }

  private formatearDia(dia: string): string {
    const [yyyy, mm, dd] = dia.split('-');
    return `${dd}/${mm}/${yyyy}`;
  }
}
