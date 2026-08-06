import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProveedoresService } from '../../../services/proveedores.service';
import { Proveedor } from '../../../core/models/proveedor.model';
import { ToastService } from '../../../core/services/toast.service';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { DetailModalComponent } from '../../../shared/components/detail-modal/detail-modal.component';

/* =========================================================================
   SIGEHU — Proveedores (listado).
   Datos reales vía GET /Proveedores. Acciones: Ver catálogo (modal con
   datos descriptivos), Editar (navega al formulario con queryParam id) y
   Eliminar (soft-delete del proveedor con modal de confirmación, RNF-07).
   El modal de detalles muestra la lista de materiales del catálogo.
   ======================================================================== */

@Component({
  selector: 'app-proveedores',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent, ConfirmModalComponent, DetailModalComponent],
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.scss',
})
export class ProveedoresComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private service = inject(ProveedoresService);
  private toast = inject(ToastService);

  proveedores: Proveedor[] = [];
  searchTerm = '';
  cargando = false;

  selectedProveedor: Proveedor | null = null;
  private detallePendienteId: number | null = null;

  proveedorAEliminar: Proveedor | null = null;
  confirmarEliminacion = false;
  eliminando = false;

  columns: DataTableColumn[] = [
    { key: 'nombre', label: 'Empresa / Distribuidor' },
    { key: 'contactoCompras', label: 'Contacto de Compras' },
    { key: 'telefono', label: 'Teléfono' },
    { key: 'materiales', label: 'Materiales', align: 'center' },
  ];

  ngOnInit(): void {
    this.cargarProveedores();

    // Apertura directa del detalle desde el buscador global (?ver=<id>).
    this.route.queryParamMap.subscribe(params => {
      const ver = params.get('ver');
      this.detallePendienteId = ver ? Number(ver) || null : null;
      this.abrirDetallePendiente();
    });
  }

  async cargarProveedores(): Promise<void> {
    this.cargando = true;
    try {
      this.proveedores = await firstValueFrom(this.service.listar());
      this.abrirDetallePendiente();
    } catch {
      this.proveedores = [];
    } finally {
      this.cargando = false;
    }
  }

  private abrirDetallePendiente(): void {
    const id = this.detallePendienteId;
    if (id == null) return;
    const proveedor = this.proveedores.find(p => p.idProveedor === id);
    if (!proveedor) return;
    this.detallePendienteId = null;
    this.verCatalogo(proveedor);
  }

  get proveedoresFiltrados(): Proveedor[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.proveedores;

    return this.proveedores.filter(p =>
      p.nombre.toLowerCase().includes(term) ||
      (p.contactoCompras ?? '').toLowerCase().includes(term) ||
      (p.telefono ?? '').includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  totalMateriales(proveedor: Proveedor): number {
    return proveedor.materiales?.length ?? 0;
  }

  verCatalogo(proveedor: Proveedor): void {
    this.selectedProveedor = proveedor;
  }

  cerrarDetalle(): void {
    this.selectedProveedor = null;
  }

  editarProveedor(proveedor: Proveedor): void {
    this.router.navigate(['/admin/proveedores/nuevo'], { queryParams: { id: proveedor.idProveedor } });
  }

  eliminarProveedor(proveedor: Proveedor): void {
    this.proveedorAEliminar = proveedor;
    this.confirmarEliminacion = true;
  }

  cancelarEliminacion(): void {
    this.confirmarEliminacion = false;
    this.proveedorAEliminar = null;
  }

  async confirmarEliminar(): Promise<void> {
    if (!this.proveedorAEliminar) return;
    this.eliminando = true;
    try {
      await firstValueFrom(this.service.desactivar(this.proveedorAEliminar.idProveedor!));
      this.proveedores = this.proveedores.filter(p => p.idProveedor !== this.proveedorAEliminar!.idProveedor);
      this.toast.success('Proveedor desactivado correctamente');
      this.confirmarEliminacion = false;
      this.proveedorAEliminar = null;
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    } finally {
      this.eliminando = false;
    }
  }

  nuevoProveedor(): void {
    this.router.navigate(['/admin/proveedores/nuevo']);
  }
}