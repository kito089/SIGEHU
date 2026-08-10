import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ComprasService } from '../../../services/compras.service';
import { Compra } from '../../../core/models/compra.model';
import { ToastService } from '../../../core/services/toast.service';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { DetailModalComponent } from '../../../shared/components/detail-modal/detail-modal.component';

/* =========================================================================
   SIGEHU — Órdenes de Compra (listado).
   Datos reales vía GET /Compras. Acciones: Ver detalle (modal con cabecera
   y materiales), Editar (navega al formulario con queryParam id) y Eliminar
   (soft-delete con modal de confirmación, RNF-07).
   Soporta apertura directa del detalle con ?ver=<id> (patrón igual a Obras),
   usado por el Dashboard al hacer clic en una "Compra pendiente".
   ========================================================================= */

@Component({
  selector: 'app-ordenes-compra',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent, ConfirmModalComponent, DetailModalComponent],
  templateUrl: './ordenes-compra.component.html',
  styleUrl: './ordenes-compra.component.scss',
})
export class OrdenesCompraComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private service = inject(ComprasService);
  private toast = inject(ToastService);

  compras: Compra[] = [];
  searchTerm = '';
  cargando = false;

  // Detalle directo (?ver=<id>), reutiliza el modal de detalle existente.
  private detallePendienteId: number | null = null;

  selectedCompra: Compra | null = null;
  cargandoDetalle = false;

  compraAEliminar: Compra | null = null;
  confirmarEliminacion = false;
  eliminando = false;

  columns: DataTableColumn[] = [
    { key: 'idCompra', label: 'Compra' },
    { key: 'nombreTrabajador', label: 'Trabajador asignado' },
    { key: 'fechaCompra', label: 'Fecha' },
    { key: 'recibida', label: 'Estado' },
    { key: 'notas', label: 'Notas' },
  ];

  ngOnInit(): void {
    this.cargarCompras();

    // Apertura directa del detalle desde el Dashboard (?ver=<id>).
    this.route.queryParamMap.subscribe(params => {
      const ver = params.get('ver');
      this.detallePendienteId = ver ? Number(ver) || null : null;
      this.abrirDetallePendiente();
    });
  }

  async cargarCompras(): Promise<void> {
    this.cargando = true;
    try {
      this.compras = await firstValueFrom(this.service.listar());
    } catch {
      this.compras = [];
    } finally {
      this.cargando = false;
      this.abrirDetallePendiente();
    }
  }

  private abrirDetallePendiente(): void {
    const id = this.detallePendienteId;
    if (id == null) return;
    const compra = this.compras.find(c => c.idCompra === id);
    if (!compra) return;
    this.detallePendienteId = null;
    void this.verDetalle(compra);
  }

  get comprasFiltradas(): Compra[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.compras;

    return this.compras.filter(c =>
      `#${c.idCompra}`.toLowerCase().includes(term) ||
      c.nombreTrabajador.toLowerCase().includes(term) ||
      (c.notas ?? '').toLowerCase().includes(term) ||
      (c.recibida ? 'recibida' : 'pendiente').includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  formatoFecha(valor?: string): string {
    if (!valor) return '—';

    // El backend normaliza a "YYYY-MM-DD HH:MM" (sin zona horaria).
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/.exec(valor.trim());
    if (m) {
      const [, anio, mes, dia, hora, min] = m;
      return `${dia}/${mes}/${anio} ${hora}:${min}`;
    }

    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return valor;
    const dia = String(d.getDate()).padStart(2, '0');
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const anio = d.getFullYear();
    const hora = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${anio} ${hora}:${min}`;
  }

  totalMateriales(compra: Compra): number {
    return compra.detalles?.length ?? 0;
  }

  trackDetalle(index: number, detalle: { idProveedor: number; idMaterial: number }): string {
    return `${detalle.idProveedor}|${detalle.idMaterial}`;
  }

  // ── Detalles ────────────────────────────────────────────────────────────
  async verDetalle(compra: Compra): Promise<void> {
    this.selectedCompra = compra;
    // El listado (GET /Compras) no incluye Detalles[], por lo que las filas
    // llegan con `detalles: []`. Siempre se re-hidrata con GET /Compras/:id
    // para mostrar materiales y la fecha de registro reales.
    if (!compra.detalles || compra.detalles.length === 0) {
      this.cargandoDetalle = true;
      try {
        const detalle = await firstValueFrom(this.service.obtener(compra.idCompra));
        this.selectedCompra = detalle;
      } catch {
        this.toast.error('No se pudieron cargar los detalles de la compra.');
      } finally {
        this.cargandoDetalle = false;
      }
    }
  }

  cerrarDetalle(): void {
    this.selectedCompra = null;
  }

  // ── Editar ──────────────────────────────────────────────────────────────
  editarCompra(compra: Compra): void {
    this.router.navigate(['/admin/orden/nueva'], { queryParams: { id: compra.idCompra } });
  }

  // ── Eliminar ────────────────────────────────────────────────────────────
  eliminarCompra(compra: Compra): void {
    this.compraAEliminar = compra;
    this.confirmarEliminacion = true;
  }

  cancelarEliminacion(): void {
    this.confirmarEliminacion = false;
    this.compraAEliminar = null;
  }

  async confirmarEliminar(): Promise<void> {
    if (!this.compraAEliminar) return;
    this.eliminando = true;
    try {
      await firstValueFrom(this.service.desactivar(this.compraAEliminar.idCompra));
      this.compras = this.compras.filter(c => c.idCompra !== this.compraAEliminar!.idCompra);
      if (this.selectedCompra?.idCompra === this.compraAEliminar.idCompra) {
        this.selectedCompra = null;
      }
      this.toast.success('Compra eliminada correctamente');
      this.confirmarEliminacion = false;
      this.compraAEliminar = null;
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    } finally {
      this.eliminando = false;
    }
  }

  nuevaCompra(): void {
    this.router.navigate(['/admin/orden/nueva']);
  }
}