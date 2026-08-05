import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';

/* =========================================================================
   SIGEHU — Gestión de Proveedores (componente Angular standalone)
   Sustituye fetchProveedores() por tu llamada real (GET /api/proveedores)
   cuando conectes el backend.
   ========================================================================= */

type DatoFinanciero = 'credito' | 'contado' | 'anticipo' | null;

interface Proveedor {
  id: number;
  empresa: string;
  giroPrincipal: string; // aún no se usa en BD, pero ya viene contemplado (se agregará después)
  contacto: string;
  telefono: string;
  datoFinanciero: DatoFinanciero;
  totalMateriales: number;
}

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent],
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.scss',
})
export class ProveedoresComponent implements OnInit {

  proveedores: Proveedor[] = [];
  searchTerm = '';
  selectedProveedor: Proveedor | null = null;

  columns: DataTableColumn[] = [
    { key: 'empresa', label: 'Empresa / Distribuidor' },
    { key: 'contacto', label: 'Contacto de Compras' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'datoFinanciero', label: 'Datos Financieros' },
  ];

  ngOnInit(): void {
    this.fetchProveedores().then(proveedores => {
      this.proveedores = proveedores;
    });
  }

  // Ajusta esto a tu endpoint real cuando conectes el backend, p. ej.:
  // constructor(private proveedoresService: ProveedoresService) {}
  // private fetchProveedores(): Promise<Proveedor[]> {
  //   return firstValueFrom(this.proveedoresService.listar());
  // }
  private async fetchProveedores(): Promise<Proveedor[]> {
    return [
      { id: 1, empresa: 'Aceros Monterrey', giroPrincipal: 'Distribuidor de perfiles y lámina',
        contacto: 'Ing. Berta Vda. de Silva', telefono: '333-664-0286',
        datoFinanciero: 'credito', totalMateriales: 18 },
      { id: 2, empresa: 'Herrajes y Chapas de Occidente', giroPrincipal: 'Ferretería industrial',
        contacto: 'Lic. Martha Gómez', telefono: '331-825-1785',
        datoFinanciero: null, totalMateriales: 9 },
      { id: 3, empresa: 'Pinturas y Recubrimientos del Valle', giroPrincipal: 'Pinturas industriales y anticorrosivos',
        contacto: 'Sr. Raúl Peña', telefono: '333-210-4477',
        datoFinanciero: 'contado', totalMateriales: 12 },
    ];
  }

  get proveedoresFiltrados(): Proveedor[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.proveedores;

    return this.proveedores.filter(p =>
      p.empresa.toLowerCase().includes(term) ||
      p.contacto.toLowerCase().includes(term) ||
      p.telefono.includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  financieroLabel(dato: DatoFinanciero): string {
    switch (dato) {
      case 'credito':  return 'Política de crédito';
      case 'contado':  return 'Pago de contado';
      case 'anticipo': return 'Requiere anticipo';
      default:         return '—';
    }
  }

  verCatalogo(proveedor: Proveedor): void {
    this.selectedProveedor = proveedor;
    // Alternativa: this.router.navigate(['/proveedores', proveedor.id, 'catalogo']);
  }

  cerrarDetalle(): void {
    this.selectedProveedor = null;
  }

  editarProveedor(proveedor: Proveedor): void {
    // this.router.navigate(['/proveedores/editar', proveedor.id]);
    alert(`Aquí se abriría el formulario de edición para "${proveedor.empresa}".`);
  }

  eliminarProveedor(proveedor: Proveedor): void {
    const confirmado = confirm(`¿Eliminar a "${proveedor.empresa}"? Esta acción no se puede deshacer.`);
    if (!confirmado) return;

    // Sustituir por la llamada real, p. ej.:
    // this.proveedoresService.eliminar(proveedor.id).subscribe(() => { ... });
    this.proveedores = this.proveedores.filter(p => p.id !== proveedor.id);
    if (this.selectedProveedor?.id === proveedor.id) {
      this.selectedProveedor = null;
    }
  }

  nuevoProveedor(): void {
    //this.router.navigate(['/proveedores/nuevo']);
  }
}