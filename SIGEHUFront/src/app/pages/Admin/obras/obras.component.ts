import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FilterBarComponent } from '../../../shared/components/filter-bar/filter-bar.component';
import { DataTableComponent, DataTableColumn } from '../../../shared/components/data-table/data-table.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { ApiService } from '../../../services/api.service';
import { Obra } from '../../../core/models/obra.model';

/* =========================================================================
   SIGEHU — Gestión de Obras / Proyectos (módulo core)
   Requerimientos: RF-07 (Alta de Obras), RF-08 (Transición de Estados)
   ========================================================================= */

@Component({
  selector: 'app-obras',
  standalone: true,
  imports: [CommonModule, FilterBarComponent, DataTableComponent, ConfirmModalComponent],
  templateUrl: './obras.component.html',
  styleUrl: './obras.component.scss',
})
export class ObrasComponent implements OnInit {
  private router = inject(Router);
  private api = inject(ApiService);

  obras: Obra[] = [];
  searchTerm = '';

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
  }

  private cargarObras(): void {
    this.api.get<Obra[]>('/Obras').subscribe({
      next: (data) => {
        this.obras = Array.isArray(data) && data.length ? data : this.obrasMock();
      },
      error: () => {
        // Datos de referencia mientras no esté disponible el backend /Obras
        this.obras = this.obrasMock();
      },
    });
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

  verObra(obra: Obra): void {
    this.router.navigate(['/admin/obras', obra.idObra]);
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