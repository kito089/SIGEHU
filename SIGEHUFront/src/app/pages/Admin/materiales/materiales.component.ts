import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MaterialesService } from '../../../services/materiales.service';
import { Material } from '../../../core/models/material.model';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { DetailModalComponent } from '../../../shared/components/detail-modal/detail-modal.component';

/* =========================================================================
   SIGEHU — Gestión de Materiales / Herramientas.

   La tabla refleja la estructura real de la entidad `Materiales` del backend:
   IDMaterial, Nombre, UnidadMedida, Descripcion, Activo (soft-delete).
   Operaciones: listar (GET /Materiales), editar (naviga al formulario con
   queryParam id) y desactivar (DELETE /Materiales/:id, soft-delete con modal
   de confirmación RNF-07).
   ======================================================================== */

@Component({
  selector: 'app-materiales',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent, ConfirmModalComponent, DetailModalComponent],
  templateUrl: './materiales.component.html',
  styleUrl: './materiales.component.scss',
})
export class MaterialesComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private service = inject(MaterialesService);

  materiales: Material[] = [];
  searchTerm = '';
  cargando = false;

  // Modal de detalle ("Ver Detalle").
  selectedMaterial: Material | null = null;
  private detallePendienteId: number | null = null;

  // Modal de confirmación para desactivación (soft-delete).
  materialAEliminar: Material | null = null;
  confirmarEliminacion = false;
  desactivando = false;

  columns: DataTableColumn[] = [
    { key: 'nombre', label: 'Material' },
    { key: 'unidadMedida', label: 'Unidad de Medida' },
    { key: 'descripcion', label: 'Descripción' },
  ];

  ngOnInit(): void {
    this.cargarMateriales();

    // Apertura directa del detalle desde el buscador global (?ver=<id>).
    this.route.queryParamMap.subscribe(params => {
      const ver = params.get('ver');
      this.detallePendienteId = ver ? Number(ver) || null : null;
      this.abrirDetallePendiente();
    });
  }

  async cargarMateriales(): Promise<void> {
    this.cargando = true;
    try {
      this.materiales = await firstValueFrom(this.service.listar());
      this.abrirDetallePendiente();
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
      this.materiales = [];
    } finally {
      this.cargando = false;
    }
  }

  private abrirDetallePendiente(): void {
    const id = this.detallePendienteId;
    if (id == null) return;
    const material = this.materiales.find(m => m.idMaterial === id);
    if (!material) return;
    this.detallePendienteId = null;
    this.verDetalle(material);
  }

  get materialesFiltrados(): Material[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.materiales;

    return this.materiales.filter(m =>
      m.nombre.toLowerCase().includes(term) ||
      (m.unidadMedida ?? '').toLowerCase().includes(term) ||
      (m.descripcion ?? '').toLowerCase().includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  get mensajeConfirmacion(): string {
    return this.materialAEliminar
      ? `¿Estás seguro de eliminar "${this.materialAEliminar.nombre}"? Esta acción lo desactivará del catálogo.`
      : '';
  }

  editar(material: Material): void {
    this.router.navigate(['/admin/materiales/nuevo'], { queryParams: { id: material.idMaterial } });
  }

  verDetalle(material: Material): void {
    this.selectedMaterial = material;
  }

  cerrarDetalle(): void {
    this.selectedMaterial = null;
  }

  eliminar(material: Material): void {
    this.materialAEliminar = material;
    this.confirmarEliminacion = true;
  }

  cancelarEliminacion(): void {
    this.confirmarEliminacion = false;
    this.materialAEliminar = null;
  }

  async confirmarDesactivacion(): Promise<void> {
    if (!this.materialAEliminar) return;
    this.desactivando = true;
    try {
      await firstValueFrom(this.service.desactivar(this.materialAEliminar.idMaterial!));
      this.materiales = this.materiales.filter(m => m.idMaterial !== this.materialAEliminar!.idMaterial);
      this.confirmarEliminacion = false;
      this.materialAEliminar = null;
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    } finally {
      this.desactivando = false;
    }
  }

  nuevoMaterial(): void {
    this.router.navigate(['/admin/materiales/nuevo']);
  }
}