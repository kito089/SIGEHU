import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

export type EstadoKey =
  | 'solicitud'
  | 'levantamiento'
  | 'fabricacion'
  | 'instalacion'
  | 'instalado'
  | 'garantias';

export type SubEstado = 'pendiente' | 'realizado' | 'reportada' | 'en_atencion' | 'resuelta';

export type ViewKey = 'kanban' | 'calendar' | 'assigned';

export interface EstadoDef {
  key: EstadoKey;
  label: string;
}

export interface Obra {
  id: number;
  cliente: string;
  proyecto: string;
  estado: EstadoKey;
  responsable: string;
  fecha: string;
  fechaISO: string;
  subEstado?: SubEstado;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  activeView: ViewKey = 'kanban';
  obrasCache: Obra[] = [];
  selectedObra: Obra | null = null;
  isModalOpen = false;
  calCursor = new Date();

  readonly ESTADOS: EstadoDef[] = [
    { key: 'solicitud', label: 'Solicitud Recibida' },
    { key: 'levantamiento', label: 'Levantamiento' },
    { key: 'fabricacion', label: 'En Fabricación' },
    { key: 'instalacion', label: 'Instalación Programada' },
    { key: 'instalado', label: 'Instalado' },
    { key: 'garantias', label: 'Garantías' },
  ];

  readonly SUBESTADO_LABEL: Record<SubEstado, string> = {
    pendiente: 'Pendiente',
    realizado: 'Realizado',
    reportada: 'Reportada',
    en_atencion: 'En atención',
    resuelta: 'Resuelta',
  };

  readonly MOCK_OBRAS: Obra[] = [
    { id: 1, cliente: 'Residencial Alvento', proyecto: 'Cancel Principal Baño', estado: 'solicitud', responsable: 'Sin asignar', fecha: '12 feb 2026', fechaISO: '2026-02-12' },
    { id: 2, cliente: 'Carlos Mendoza', proyecto: 'Puerta de Herrería Tipo Forja', estado: 'solicitud', responsable: 'Sin asignar', fecha: '14 feb 2026', fechaISO: '2026-02-14' },
    { id: 3, cliente: 'Motel Sol Clarión', proyecto: 'Barandales Terraza Norte', estado: 'levantamiento', responsable: 'Ing. Beltrán', fecha: '10 feb 2026', fechaISO: '2026-02-10', subEstado: 'pendiente' },
    { id: 9, cliente: 'Farmacia del Valle', proyecto: 'Reja Enrollable Local', estado: 'levantamiento', responsable: 'Ing. Beltrán', fecha: '6 feb 2026', fechaISO: '2026-02-06', subEstado: 'realizado' },
    { id: 4, cliente: 'Inmobiliaria Viste', proyecto: 'Protecciones Ventana Mod. P12', estado: 'fabricacion', responsable: 'Medina y J. López', fecha: '22 feb 2026', fechaISO: '2026-02-22' },
    { id: 5, cliente: 'Sofía Hernández', proyecto: 'Estructura Domo Patio', estado: 'fabricacion', responsable: 'Medina S.', fecha: '15 feb 2026', fechaISO: '2026-02-15' },
    { id: 6, cliente: 'Isra. García Torres', proyecto: 'Portón Automatizado Principal', estado: 'instalacion', responsable: 'N. Bárcenas', fecha: '18 feb 2026', fechaISO: '2026-02-18' },
    { id: 7, cliente: 'Gregorio Amezcuano', proyecto: 'Reja Perimetral Sección A', estado: 'instalado', responsable: 'Equipo Bárcenas', fecha: '12 feb 2026', fechaISO: '2026-02-12' },
    { id: 8, cliente: 'Restaurante El Asador', proyecto: 'Ajuste Chapa Portón Cocina', estado: 'garantias', responsable: 'Sin asignar', fecha: '16 feb 2026', fechaISO: '2026-02-16', subEstado: 'reportada' },
    { id: 10, cliente: 'Carlos Mendoza', proyecto: 'Fuga en Bisagra Portón', estado: 'garantias', responsable: 'J. López', fecha: '11 feb 2026', fechaISO: '2026-02-11', subEstado: 'en_atencion' },
    { id: 11, cliente: 'Motel Sol Clarión', proyecto: 'Ajuste Barandal Escalera', estado: 'garantias', responsable: 'Ing. Beltrán', fecha: '3 feb 2026', fechaISO: '2026-02-03', subEstado: 'resuelta' },
  ];

  async ngOnInit(): Promise<void> {
    this.obrasCache = await this.fetchObras();
  }

  async fetchObras(): Promise<Obra[]> {
    return this.MOCK_OBRAS;
  }

  getItemsByEstado(estadoKey: EstadoKey): Obra[] {
    return this.obrasCache.filter(o => o.estado === estadoKey);
  }

  openModal(id: number): void {
    const o = this.obrasCache.find(x => x.id === id);
    if (o) {
      this.selectedObra = o;
      this.isModalOpen = true;
    }
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.selectedObra = null;
  }

  setView(view: ViewKey): void {
    this.activeView = view;
  }
}