import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { DetailModalComponent } from '../../../shared/components/detail-modal/detail-modal.component';
import { ApiService } from '../../../services/api.service';
import { Obra } from '../../../core/models/obra.model';

/* =========================================================================
   SIGEHU — Gestión de Obras / Proyectos (módulo core)
   Requerimientos: RF-07 (Alta de Obras), RF-08 (Transición de Estados)
   ========================================================================= */

@Component({
  selector: 'app-obras',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent, ConfirmModalComponent, DetailModalComponent],
  templateUrl: './obras.component.html',
  styleUrl: './obras.component.scss',
})
export class ObrasComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);

  obras: Obra[] = [];
  searchTerm = '';

  // Modal de detalle ("Ver Detalle")
  selectedObra: Obra | null = null;
  private detallePendienteId: number | null = null;

  // Modal de confirmación para transición de estado (RF-08, RNF-07)
  obraEstado: Obra | null = null;
  confirmarCambio = false;

  readonly estados: { id: number; nombre: string; color: string }[] = [
    { id: 1, nombre: 'Solicitud recibida', color: '#94A3B8' },
    { id: 2, nombre: 'Levantamiento pendiente', color: '#F59E0B' },
    { id: 3, nombre: 'En fabricación', color: '#3B82F6' },
    { id: 4, nombre: 'Instalación programada', color: '#A855F7' },
    { id: 5, nombre: 'Instalado', color: '#10B981' },
    { id: 6, nombre: 'Garantía', color: '#EF4444' },
    { id: 7, nombre: 'Finalizado', color: '#64748B' },
  ];

  columns: DataTableColumn[] = [
    { key: 'nombre', label: 'Obra' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'estado', label: 'Estado' },
    { key: 'fecha', label: 'Actualización' },
  ];

  ngOnInit(): void {
    this.cargarObras();

    // Apertura directa del detalle desde el buscador global (?ver=<id>).
    this.route.queryParamMap.subscribe(params => {
      const ver = params.get('ver');
      this.detallePendienteId = ver ? Number(ver) || null : null;
      this.abrirDetallePendiente();
    });
  }

  private cargarObras(): void {
    this.api.get<Obra[]>('/Obras').subscribe({
      next: (data) => {
        this.obras = Array.isArray(data) && data.length ? data : this.obrasMock();
        this.abrirDetallePendiente();
      },
      error: () => {
        // Datos de referencia mientras no esté disponible el backend /Obras
        this.obras = this.obrasMock();
        this.abrirDetallePendiente();
      },
    });
  }

  private abrirDetallePendiente(): void {
    const id = this.detallePendienteId;
    if (id == null) return;
    const obra = this.obras.find(o => o.idObra === id);
    if (!obra) return;
    this.detallePendienteId = null;
    this.verObra(obra);
  }

  private obrasMock(): Obra[] {
    // TODO: eliminar cuando el backend /Obras responda correctamente
    return [
      { idObra: 1, idCliente: 1, nombre: 'Herrería decorativa fachada norte', nombreCliente: 'Constructora Altamira', direccion: 'Av. Progreso 120', idEstadoObra: 1, estadoObra: 'Solicitud recibida', ordenEstado: 1, fechaUltimaActualizacion: '28 Jul 2026' },
      { idObra: 2, idCliente: 2, nombre: 'Portón corredizo 4x3', nombreCliente: 'Carlos Utrilla', direccion: 'Col. Rey Xolotl', idEstadoObra: 2, estadoObra: 'Levantamiento pendiente', ordenEstado: 2, fechaUltimaActualizacion: '29 Jul 2026' },
      { idObra: 3, idCliente: 3, nombre: 'Escalera caracol interior', nombreCliente: 'María Gómez', direccion: 'Av. Vallarta 1500', idEstadoObra: 3, estadoObra: 'En fabricación', ordenEstado: 3, fechaUltimaActualizacion: '30 Jul 2026' },
      { idObra: 4, idCliente: 3, nombre: 'Puerta levadiza industrial', nombreCliente: 'Inmobiliaria Viste', direccion: 'Periférico Nte 890', idEstadoObra: 4, estadoObra: 'Instalación programada', ordenEstado: 4, fechaUltimaActualizacion: '01 Ago 2026' },
      { idObra: 5, idCliente: 2, nombre: 'Reja cancel perimetral', nombreCliente: 'El Asador MX', direccion: 'Calle Hidalgo 45', idEstadoObra: 5, estadoObra: 'Instalado', ordenEstado: 5, fechaUltimaActualizacion: '02 Ago 2026' },
    ];
  }

  get obrasFiltradas(): Obra[] {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) return this.obras;
    return this.obras.filter((o) =>
      o.nombre.toLowerCase().includes(term) ||
      (o.nombreCliente ?? '').toLowerCase().includes(term) ||
      (o.direccion ?? '').toLowerCase().includes(term)
    );
  }

  onSearchChange(term: string): void {
    this.searchTerm = term;
  }

  estadoColor(nombre: string): string {
    const s = this.estados.find((e) => e.nombre === nombre);
    return s ? s.color : '#94A3B8';
  }

  nuevoObra(): void {
    this.router.navigate(['/admin/obras/nueva']);
  }

  editarObra(obra: Obra): void {
    this.router.navigate(['/admin/obras/editar', obra.idObra]);
  }

  verDetalle(obra: Obra): void {
    this.router.navigate(['/admin/obras/detalle', obra.idObra]);
  }

  verObra(obra: Obra): void {
    this.selectedObra = obra;
  }

  cerrarDetalle(): void {
    this.selectedObra = null;
  }

  abrirCambioEstado(obra: Obra): void {
    this.obraEstado = obra;
    this.confirmarCambio = true;
  }

  cerrarCambioEstado(): void {
    this.confirmarCambio = false;
    this.obraEstado = null;
  }

  ejecutarCambioEstado(): void {
    // TODO: reemplazar por SP_CAMBIAR_ESTADO_OBRA en el backend con doble validación
    if (this.obraEstado) {
      console.log('Transición de estado de obra', this.obraEstado.idObra);
    }
    this.cerrarCambioEstado();
  }

  get siguienteEstado(): string {
    if (!this.obraEstado) return '';
    const idx = this.estados.findIndex((e) => e.nombre === this.obraEstado?.estadoObra);
    const next = this.estados[idx + 1];
    return next ? next.nombre : 'Finalizado';
  }

  mensajeConfirmacion(): string {
    if (!this.obraEstado) return '';
    return `¿Deseas avanzar la obra "${this.obraEstado.nombre}" al estado "${this.siguienteEstado}"? Esta acción quedará registrada en auditoría.`;
  }
}