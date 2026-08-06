import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { DetailModalComponent } from '../../../shared/components/detail-modal/detail-modal.component';

/* =========================================================================
   SIGEHU — Garantías (componente Angular standalone)
   RF-27 (Control de Garantías de Obra). Estado transitorio: "Pendiente",
   "En proceso" o "Cerrada" (con cierre de garantía vía modal de confirmación,
   RNF-07). Sustituye fetchGarantias() por tu llamada real al backend.
   ========================================================================= */

type EstadoGarantia = 'Pendiente' | 'En proceso' | 'Cerrada';

interface GarantiaRow {
  id: number;
  folio: string;
  obra: string;
  descripcion: string;
  estado: EstadoGarantia;
  fecha: string;
}

@Component({
  selector: 'app-garantias',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent, ConfirmModalComponent, DetailModalComponent],
  templateUrl: './garantias.component.html',
  styleUrl: './garantias.component.scss',
})
export class GarantiasComponent implements OnInit {

  private route = inject(ActivatedRoute);

  garantias: GarantiaRow[] = [];
  pendienteCierre: GarantiaRow | null = null;
  searchTerm = '';

  // Modal de detalle ("Ver Detalle").
  selectedGarantia: GarantiaRow | null = null;
  private detallePendienteId: number | null = null;

  columns: DataTableColumn[] = [
    { key: 'folio', label: 'Folio' },
    { key: 'obra', label: 'Obra' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'estado', label: 'Estado' },
  ];

  constructor() {}

  ngOnInit(): void {
    this.fetchGarantias().then(garantias => {
      this.garantias = garantias;
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
    const garantia = this.garantias.find(g => g.id === id);
    if (!garantia) return;
    this.detallePendienteId = null;
    this.verDetalle(garantia);
  }

  verDetalle(garantia: GarantiaRow): void {
    this.selectedGarantia = garantia;
  }

  cerrarDetalle(): void {
    this.selectedGarantia = null;
  }

  // Ajusta esto a tu endpoint real cuando conectes el backend.
  // constructor(private garantiasService: GarantiasService) {}
  // private fetchGarantias(): Promise<GarantiaRow[]> {
  //   return firstValueFrom(this.garantiasService.listar());
  // }
  private async fetchGarantias(): Promise<GarantiaRow[]> {
    return [
      { id: 1, folio: 'GAR-0001', obra: 'Puerta de acceso principal', descripcion: 'Oxidación en bisagras', estado: 'Pendiente', fecha: '2026-07-28' },
      { id: 2, folio: 'GAR-0002', obra: 'Protecciones ventanas', descripcion: 'Soldadura con fuga', estado: 'En proceso', fecha: '2026-07-21' },
      { id: 3, folio: 'GAR-0003', obra: 'Bodega Central', descripcion: 'Acabado de pintura', estado: 'Cerrada', fecha: '2026-07-10' },
    ];
  }

  get garantiasFiltradas(): GarantiaRow[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.garantias;

    return this.garantias.filter(g =>
      g.obra.toLowerCase().includes(term) ||
      g.descripcion.toLowerCase().includes(term) ||
      g.folio.toLowerCase().includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  estadoClass(estado: EstadoGarantia): string {
    switch (estado) {
      case 'Pendiente': return 'badge-estado--warning';
      case 'En proceso': return 'badge-estado--info';
      case 'Cerrada': return 'badge-estado--ok';
    }
  }

  nuevaGarantia(): void {
    alert('Aquí se abriría el formulario para registrar una nueva garantía.');
  }

  abrirReporte(garantia: GarantiaRow): void {
    alert(`Aquí se abriría el reporte de la garantía ${garantia.folio} (RF-27).`);
  }

  cerrarGarantia(garantia: GarantiaRow): void {
    this.pendienteCierre = garantia;
  }

  get mensajeCierre(): string {
    return this.pendienteCierre
      ? `¿Estás seguro de cerrar la garantía ${this.pendienteCierre.folio} de "${this.pendienteCierre.obra}"? Esta acción es definitiva.`
      : '';
  }

  cancelarCierre(): void {
    this.pendienteCierre = null;
  }

  confirmarCierre(): void {
    const garantia = this.pendienteCierre;
    if (!garantia) return;
    alert(`Garantía ${garantia.folio} cerrada.`);
    this.pendienteCierre = null;
  }
}
