import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';

/* =========================================================================
   SIGEHU — Kits de Instalación (componente Angular standalone)
   Módulo M7 / RF-22 (CRUD de Kits) y RF-23 (Checklist de Kit para ruta).
   Sustituye fetchKits() por tu llamada real (GET /api/kits) cuando conectes
   el backend.
   ========================================================================= */

interface KitRow {
  id: number;
  nombre: string;
  descripcion: string;
  totalMateriales: number;
  activo: boolean;
}

@Component({
  selector: 'app-kits',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent],
  templateUrl: './kits.component.html',
  styleUrl: './kits.component.scss',
})
export class KitsComponent implements OnInit {

  kits: KitRow[] = [];
  searchTerm = '';

  columns: DataTableColumn[] = [
    { key: 'nombre', label: 'Nombre del Kit' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'totalMateriales', label: 'Materiales', align: 'center' },
    { key: 'activo', label: 'Estado' },
  ];

  ngOnInit(): void {
    this.fetchKits().then(kits => {
      this.kits = kits;
    });
  }

  // Ajusta esto a tu endpoint real cuando conectes el backend, p. ej.:
  // constructor(private kitsService: KitsService) {}
  // private fetchKits(): Promise<KitRow[]> {
  //   return firstValueFrom(this.kitsService.listar());
  // }
  private async fetchKits(): Promise<KitRow[]> {
    return [
      { id: 1, nombre: 'Kit Herrería Básico', descripcion: 'Herramienta manual y consumibles para instalación de puertas', totalMateriales: 14, activo: true },
      { id: 2, nombre: 'Kit Fachada', descripcion: 'Silicona, taquetes y herrajes para fachada de vidrio', totalMateriales: 9, activo: true },
      { id: 3, nombre: 'Kit Escaleras', descripcion: 'Nivel, plomada y fijaciones para armado de escaleras', totalMateriales: 11, activo: false },
    ];
  }

  get kitsFiltrados(): KitRow[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.kits;

    return this.kits.filter(k =>
      k.nombre.toLowerCase().includes(term) ||
      k.descripcion.toLowerCase().includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  estadoLabel(activo: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }

  nuevoKit(): void {
    // this.router.navigate(['/kits/nuevo']);
    alert('Aquí se abriría el formulario para registrar un nuevo kit de instalación.');
  }

  verChecklist(kit: KitRow): void {
    alert(`Aquí se abriría el checklist del kit "${kit.nombre}" (RF-23).`);
  }

  editarKit(kit: KitRow): void {
    alert(`Aquí se abriría el formulario de edición para "${kit.nombre}".`);
  }
}
