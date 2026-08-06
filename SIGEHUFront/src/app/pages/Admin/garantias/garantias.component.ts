import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ConfirmService } from '../../../core/services/confirm.service';

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
  imports: [CommonModule, FilterBarComponent, DataTableComponent],
  templateUrl: './garantias.component.html',
  styleUrl: './garantias.component.scss',
})
export class GarantiasComponent implements OnInit {
  private confirm = inject(ConfirmService);

  garantias: GarantiaRow[] = [];
  searchTerm = '';

  columns: DataTableColumn[] = [
    { key: 'folio', label: 'Folio' },
    { key: 'obra', label: 'Obra' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'fecha', label: 'Fecha' },
    { key: 'estado', label: 'Estado' },
  ];

  ngOnInit(): void {
    this.fetchGarantias().then(garantias => {
      this.garantias = garantias;
    });
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

  async cerrarGarantia(garantia: GarantiaRow): Promise<void> {
    const confirmado = await this.confirm.confirmar(
      'Cerrar garantía',
      `¿Estás seguro de cerrar la garantía ${garantia.folio} de "${garantia.obra}"? Esta acción es definitiva.`,
      { confirmarText: 'Cerrar garantía', danger: true }
    );
    if (confirmado) {
      alert(`Garantía ${garantia.folio} cerrada.`);
    }
  }
}
