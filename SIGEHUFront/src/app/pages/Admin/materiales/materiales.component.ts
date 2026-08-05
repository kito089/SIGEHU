import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';

/* =========================================================================
   SIGEHU — Gestión de Materiales / Herramientas (componente Angular standalone)
   Módulo M9 / RF-16 (Asignación de Insumos/Materiales) y catálogo base.
   Sustituye fetchMateriales() por tu llamada real (GET /api/materiales)
   cuando conectes el backend.
   ========================================================================= */

type CategoriaMaterial = 'Estructural' | 'Lamina' | 'Tubular' | 'Consumible' | 'Herramienta' | 'Acabado' | null;

interface MaterialRow {
  id: number;
  clave: string;
  descripcion: string;
  categoria: CategoriaMaterial;
  unidad: string;
  precio: number;
}

@Component({
  selector: 'app-materiales',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent],
  templateUrl: './materiales.component.html',
  styleUrl: './materiales.component.scss',
})
export class MaterialesComponent implements OnInit {

  materiales: MaterialRow[] = [];
  searchTerm = '';

  columns: DataTableColumn[] = [
    { key: 'clave', label: 'Código' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'categoria', label: 'Categoría' },
    { key: 'unidad', label: 'U. Medida' },
    { key: 'precio', label: 'Precio', align: 'right' },
  ];

  ngOnInit(): void {
    this.fetchMateriales().then(materiales => {
      this.materiales = materiales;
    });
  }

  // Ajusta esto a tu endpoint real cuando conectes el backend, p. ej.:
  // constructor(private materialesService: MaterialesService) {}
  // private fetchMateriales(): Promise<MaterialRow[]> {
  //   return firstValueFrom(this.materialesService.listar());
  // }
  private async fetchMateriales(): Promise<MaterialRow[]> {
    return [
      { id: 1, clave: 'PTR-200-14', descripcion: 'PTR Verde 2x2 Cal14', categoria: 'Estructural', unidad: 'Tramo', precio: 1200 },
      { id: 2, clave: 'LAM-14N', descripcion: 'Lámina Negra Cal14', categoria: 'Lamina', unidad: 'Pieza', precio: 2500 },
      { id: 3, clave: 'ANG-100-18', descripcion: 'Ángulo 1x1/8', categoria: 'Tubular', unidad: 'Tramo', precio: 530 },
      { id: 4, clave: 'DIS-COR-45', descripcion: 'Disco Corte 4.5"', categoria: 'Consumible', unidad: 'Pieza', precio: 35 },
      { id: 5, clave: 'TLZ-CIN-100', descripcion: 'Cinta métrica 100 m', categoria: 'Herramienta', unidad: 'Pieza', precio: 480 },
      { id: 6, clave: 'PNT-ANT-19', descripcion: 'Pintura anticorrosiva', categoria: 'Acabado', unidad: 'Litro', precio: 190 },
    ];
  }

  get materialesFiltrados(): MaterialRow[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.materiales;

    return this.materiales.filter(m =>
      m.descripcion.toLowerCase().includes(term) ||
      m.clave.toLowerCase().includes(term) ||
      (m.categoria ?? '').toLowerCase().includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  categoriaLabel(cat: CategoriaMaterial): string {
    return cat ?? '—';
  }

  formatoPrecio(precio: number): string {
    return `$${precio.toLocaleString('es-MX')}`;
  }

  nuevoMaterial(): void {
    // this.router.navigate(['/materiales/nuevo']);
    alert('Aquí se abriría el formulario para registrar un nuevo material.');
  }

  editarMaterial(material: MaterialRow): void {
    // this.router.navigate(['/materiales/editar', material.id]);
    alert(`Aquí se abriría el formulario de edición para "${material.descripcion}".`);
  }
}
