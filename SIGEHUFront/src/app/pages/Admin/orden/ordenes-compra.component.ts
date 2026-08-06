import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { DetailModalComponent } from '../../../shared/components/detail-modal/detail-modal.component';

/* =========================================================================
   SIGEHU — Órdenes de Compra (componente Angular standalone)
   RF-17 (Cotización y compra de insumos) / RF-19 (Autorización de compras).
   Estados: "Cotizada", "Autorizada", "Recibida" y "Cancelada".
   Sustituye fetchOrdenes() por tu llamada real al backend.
   ========================================================================= */

type EstadoOrden = 'Cotizada' | 'Enviada' | 'Autorizada' | 'Recibida' | 'Cancelada';

interface OrdenRow {
  id: number;
  folio: string;
  proveedor: string;
  descripcion: string;
  total: number;
  estado: EstadoOrden;
}

@Component({
  selector: 'app-ordenes-compra',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent, ConfirmModalComponent, DetailModalComponent],
  templateUrl: './ordenes-compra.component.html',
  styleUrl: './ordenes-compra.component.scss',
})
export class OrdenesCompraComponent implements OnInit {

  private route = inject(ActivatedRoute);

  ordenes: OrdenRow[] = [];
  searchTerm = '';
  pendienteAutorizar: OrdenRow | null = null;

  // Modal de detalle ("Ver Detalle").
  selectedOrden: OrdenRow | null = null;
  private detallePendienteId: number | null = null;

  columns: DataTableColumn[] = [
    { key: 'folio', label: 'Folio' },
    { key: 'proveedor', label: 'Proveedor' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'estado', label: 'Estado' },
  ];

  ngOnInit(): void {
    this.fetchOrdenes().then(ordenes => {
      this.ordenes = ordenes;
      this.abrirDetallePendiente();
    });

    // Apertura directa del detalle desde el buscador global (?ver=<id>).
    this.route.queryParamMap.subscribe(params => {
      const ver = params.get('ver');
      this.detallePendienteId = ver ? Number(ver) || null : null;
      this.abrirDetallePendiente();
    });
  }

  private abrirDetallePendiente(): void {
    const id = this.detallePendienteId;
    if (id == null) return;
    const orden = this.ordenes.find(o => o.id === id);
    if (!orden) return;
    this.detallePendienteId = null;
    this.verDetalle(orden);
  }

  verDetalle(orden: OrdenRow): void {
    this.selectedOrden = orden;
  }

  cerrarDetalle(): void {
    this.selectedOrden = null;
  }

  // Ajusta esto a tu endpoint real cuando conectes el backend.
  // constructor(private comprasService: ComprasService) {}
  // private fetchOrdenes(): Promise<OrdenRow[]> {
  //   return firstValueFrom(this.comprasService.listar());
  // }
  private async fetchOrdenes(): Promise<OrdenRow[]> {
    return [
      { id: 1, folio: 'OC-0001', proveedor: 'Herrería El Águila', descripcion: 'Compra de PTR y lámina cal.14', total: 48600, estado: 'Autorizada' },
      { id: 2, folio: 'OC-0002', proveedor: 'Tornillos y Ferretería GYA', descripcion: 'Paquete de tornillería y consumibles', total: 12400, estado: 'Enviada' },
      { id: 3, folio: 'OC-0003', proveedor: 'Aceros del Bajío', descripcion: 'Ángulos y soleras para fachada', total: 23900, estado: 'Recibida' },
      { id: 4, folio: 'OC-0004', proveedor: 'Dist. Metales Norte', descripcion: 'Lámina troquelada', total: 9800, estado: 'Cancelada' },
    ];
  }

  get ordenesFiltradas(): OrdenRow[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.ordenes;

    return this.ordenes.filter(o =>
      o.folio.toLowerCase().includes(term) ||
      o.proveedor.toLowerCase().includes(term) ||
      o.descripcion.toLowerCase().includes(term) ||
      o.estado.toLowerCase().includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  estadoClass(estado: EstadoOrden): string {
    switch (estado) {
      case 'Cotizada': return 'badge-estado--info';
      case 'Enviada': return 'badge-estado--warning';
      case 'Autorizada': return 'badge-estado--ok';
      case 'Recibida': return 'badge-estado--ok';
      case 'Cancelada': return 'badge-estado--danger';
    }
  }

  formatoTotal(total: number): string {
    return `$${total.toLocaleString('es-MX')}`;
  }

  nuevaOrden(): void {
    alert('Aquí se abriría el formulario para generar una nueva orden de compra (RF-17).');
  }

  autorizar(orden: OrdenRow): void {
    this.pendienteAutorizar = orden;
  }

  get mensajeAutorizacion(): string {
    return this.pendienteAutorizar
      ? `¿Autorizar la orden ${this.pendienteAutorizar.folio} por $${this.pendienteAutorizar.total.toLocaleString('es-MX')} con ${this.pendienteAutorizar.proveedor}?`
      : '';
  }

  cancelarAutorizacion(): void {
    this.pendienteAutorizar = null;
  }

  confirmarAutorizacion(): void {
    const orden = this.pendienteAutorizar;
    if (!orden) return;
    alert(`Orden ${orden.folio} autorizada.`);
    this.pendienteAutorizar = null;
  }
}