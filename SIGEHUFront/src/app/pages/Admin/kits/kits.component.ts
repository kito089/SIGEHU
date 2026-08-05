import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { KitsService } from '../../../services/kits.service';
import { KitInstalacion } from '../../../core/models/kit.model';
import { ToastService } from '../../../core/services/toast.service';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';

/* =========================================================================
   SIGEHU — Kits de Instalación (listado).
   Datos reales vía GET /Kits. Acciones: Editar (navega al formulario con
   queryParam id) y Eliminar (borrado físico del kit con modal de confirmación,
   RNF-07). El botón "Checklist" ya no forma parte del CRUD.
   ======================================================================== */

@Component({
  selector: 'app-kits',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent, ConfirmModalComponent],
  templateUrl: './kits.component.html',
  styleUrl: './kits.component.scss',
})
export class KitsComponent implements OnInit {
  private router = inject(Router);
  private service = inject(KitsService);
  private toast = inject(ToastService);

  kits: KitInstalacion[] = [];
  searchTerm = '';
  cargando = false;

  kitAEliminar: KitInstalacion | null = null;
  confirmarEliminacion = false;
  eliminando = false;

  columns: DataTableColumn[] = [
    { key: 'nombre', label: 'Nombre del Kit' },
    { key: 'descripcion', label: 'Descripción' },
    { key: 'totalMateriales', label: 'Materiales', align: 'center' },
    { key: 'totalUnidades', label: 'Unidades', align: 'center' },
  ];

  ngOnInit(): void {
    this.cargarKits();
  }

  async cargarKits(): Promise<void> {
    this.cargando = true;
    try {
      this.kits = await firstValueFrom(this.service.listar());
    } catch {
      this.kits = [];
    } finally {
      this.cargando = false;
    }
  }

  get kitsFiltrados(): KitInstalacion[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.kits;

    return this.kits.filter(k =>
      k.nombre.toLowerCase().includes(term) ||
      (k.descripcion ?? '').toLowerCase().includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  editar(kit: KitInstalacion): void {
    this.router.navigate(['/admin/kits/nuevo'], { queryParams: { id: kit.idKit } });
  }

  eliminar(kit: KitInstalacion): void {
    this.kitAEliminar = kit;
    this.confirmarEliminacion = true;
  }

  cancelarEliminacion(): void {
    this.confirmarEliminacion = false;
    this.kitAEliminar = null;
  }

  async confirmarEliminar(): Promise<void> {
    if (!this.kitAEliminar) return;
    this.eliminando = true;
    try {
      await firstValueFrom(this.service.eliminar(this.kitAEliminar.idKit!));
      this.kits = this.kits.filter(k => k.idKit !== this.kitAEliminar!.idKit);
      this.toast.success('Kit eliminado correctamente');
      this.confirmarEliminacion = false;
      this.kitAEliminar = null;
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    } finally {
      this.eliminando = false;
    }
  }

  nuevoKit(): void {
    this.router.navigate(['/admin/kits/nuevo']);
  }
}