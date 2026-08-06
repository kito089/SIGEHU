import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { DashboardTabsComponent, DashboardTab } from '../../../shared/components/dashboard/tabs/dashboard-tabs.component';
import { KanbanBoardComponent, KanbanColumnData, KanbanCardData } from '../../../shared/components/kanban/kanban-board.component';
import { CalendarComponent } from '../../../shared/components/calendar/calendar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    KpiCardComponent,
    DashboardTabsComponent,
    KanbanBoardComponent,
    CalendarComponent,
    EmptyStateComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  // Estado UI
  activeTab = signal<DashboardTab>('kanban');

  // Datos mock - TODO: Conectar a servicio real
  readonly kpiData = signal([
    {
      value: 12,
      label: 'Total de Obras Activas',
      iconSvg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
      iconBgColor: '#1E3A8A',
      iconColor: '#3B82F6',
      variant: 'primary' as const,
      badgeText: '+3 este mes',
      badgeColor: 'info' as const,
    },
    {
      value: 3,
      label: 'Finalizadas este Mes',
      iconSvg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>',
      iconBgColor: '#064E3B',
      iconColor: '#10B981',
      variant: 'secondary' as const,
      badgeText: '↑ 25% vs jun',
      badgeColor: 'success' as const,
    }
  ]);

  readonly kanbanColumns = signal<KanbanColumnData[]>([
    {
      id: 'solicitud',
      title: 'Solicitud Recibida',
      color: '#94A3B8',
      cards: [
        { id: 1, code: 'C1', client: 'Residencial Alvento', title: 'Cancel Principal Baño', badges: [], date: '28 Jul 2024', avatarInitials: 'CU', avatarColor: '#7C3AED', assigneeName: 'C. Utrilla' },
        { id: 2, code: 'C2', client: 'Carlos Mendoza', title: 'Puerta de Herrería Tipo Forja', badges: [], date: '25 Jul 2024', avatarInitials: 'JM', avatarColor: '#2563EB', assigneeName: 'J. Medina' },
      ]
    },
    {
      id: 'levantamiento',
      title: 'Levantamiento',
      color: '#F59E0B',
      cards: [
        { id: 3, code: 'C3', client: 'Motel Sol Clarión', title: 'Barandales Terraza Norte', badges: [{ text: 'Pendiente', type: 'pending' }], date: '20 Jul 2024', avatarInitials: 'IB', avatarColor: '#F59E0B', assigneeName: 'I. Beltrán' },
        { id: 9, code: 'C9', client: 'Farmacia del Valle', title: 'Reja Enrollable Local', badges: [{ text: 'Realizado', type: 'done' }], date: '18 Jul 2024', avatarInitials: 'IB', avatarColor: '#F59E0B', assigneeName: 'I. Beltrán' },
      ]
    },
    {
      id: 'fabricacion',
      title: 'En Fabricación',
      color: '#3B82F6',
      cards: [
        { id: 4, code: 'C4', client: 'Inmobiliaria Viste', title: 'Protecciones Ventana Mod. P12', badges: [], date: '22 Jul 2024', avatarInitials: 'MJ', avatarColor: '#3B82F6', assigneeName: 'M. J. López' },
        { id: 5, code: 'C5', client: 'Sofía Hernández', title: 'Estructura Domo Patio', badges: [{ text: 'Alta', type: 'high' }], date: '15 Jul 2024', avatarInitials: 'MS', avatarColor: '#3B82F6', assigneeName: 'M. S.' },
      ]
    },
    {
      id: 'instalacion',
      title: 'Instalación Programada',
      color: '#A855F7',
      cards: [
        { id: 6, code: 'C6', client: 'Isra. García Torres', title: 'Portón Automatizado Principal', badges: [], date: '18 Jul 2024', avatarInitials: 'NB', avatarColor: '#A855F7', assigneeName: 'N. Bárcenas' },
      ]
    },
    {
      id: 'instalado',
      title: 'Instalado',
      color: '#10B981',
      cards: [
        { id: 7, code: 'C7', client: 'Gregorio Amezcuano', title: 'Reja Perimetral Sección A', badges: [], date: '12 Jul 2024', avatarInitials: 'EB', avatarColor: '#10B981', assigneeName: 'Equipo Bárcenas' },
      ]
    },
    {
      id: 'garantias',
      title: 'Garantías',
      color: '#EF4444',
      cards: [
        { id: 8, code: 'C8', client: 'Restaurante El Asador', title: 'Ajuste Chapa Portón Cocina', badges: [{ text: 'Reportada', type: 'reported' }], date: '16 Jul 2024', avatarInitials: 'CU', avatarColor: '#EF4444', assigneeName: 'Sin asignar' },
        { id: 10, code: 'C10', client: 'Carlos Mendoza', title: 'Fuga en Bisagra Portón', badges: [{ text: 'En atención', type: 'in_progress' }], date: '11 Jul 2024', avatarInitials: 'JL', avatarColor: '#EF4444', assigneeName: 'J. López' },
        { id: 11, code: 'C11', client: 'Motel Sol Clarión', title: 'Ajuste Barandal Escalera', badges: [{ text: 'Resuelta', type: 'resolved' }], date: '3 Jul 2024', avatarInitials: 'IB', avatarColor: '#EF4444', assigneeName: 'I. Beltrán' },
      ]
    },
  ]);

  // Activity Feed (RF-33)
  // La "Actividad reciente" vive ahora únicamente en la página de Reportes,
  // alimentada por Auditorias / AuditoriasDetalles del backend.

  onTabChange(tab: DashboardTab): void {
    this.activeTab.set(tab);
  }

  onCardClick(card: KanbanCardData): void {
    // TODO: Abrir modal detalle
    console.log('Card clicked:', card);
  }

  onAddCard(columnId: string): void {
    // TODO: Abrir modal crear tarea
    console.log('Add card to:', columnId);
  }
}