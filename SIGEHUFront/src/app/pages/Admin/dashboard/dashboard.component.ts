import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { DashboardTabsComponent, DashboardTab } from '../../../shared/components/dashboard/tabs/dashboard-tabs.component';
import { KanbanBoardComponent, KanbanColumnData, KanbanCardData } from '../../../shared/components/kanban/kanban-board.component';
import { CalendarComponent } from '../../../shared/components/calendar/calendar.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { DashboardService } from '../../../services/dashboard.service';
import type { EventoCalendarioBackend } from '../../../services/dashboard.service';
import { ReportesService } from '../../../services/reportes.service';
import type { CompraPendiente } from '../../../core/models/compra.model';
import type { CalendarEvent } from '../../../core/models/dashboard.model';

interface KpiCardConfig {
  value: string | number;
  label: string;
  iconSvg: string;
  iconBgColor: string;
  iconColor: string;
  variant: 'primary' | 'secondary';
  badgeText: string;
  badgeColor: 'success' | 'warning' | 'info';
}

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
  private router = inject(Router);
  private dashboard = inject(DashboardService);
  private reportes = inject(ReportesService);

  // Estado UI
  activeTab = signal<DashboardTab>('kanban');

  // KPIs reales (GET /Dashboard/kpis)
  readonly kpiData = signal<KpiCardConfig[]>([]);
  // Compras pendientes de recibir (GET /Compras/pendientes)
  readonly comprasPendientes = signal<CompraPendiente[]>([]);
  readonly comprasCargando = signal(false);

  // Eventos reales del calendario (GET /Dashboard/calendar-events)
  readonly calendarioEventos = signal<CalendarEvent[]>([]);
  readonly calendarioCargando = signal(false);

  ngOnInit(): void {
    this.cargarKpis();
    this.cargarComprasPendientes();
    this.cargarEventosCalendario();
  }

  private async cargarKpis(): Promise<void> {
    try {
      const r = await firstValueFrom(this.dashboard.kpis());
      const kpiPrimary: KpiCardConfig = {
        value: r.obrasActivas,
        label: 'Total de Obras Activas',
        iconSvg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
        iconBgColor: '#1E3A8A',
        iconColor: '#3B82F6',
        variant: 'primary',
        badgeText: 'Activas ahora',
        badgeColor: 'info',
      };
      this.kpiData.set([
        kpiPrimary,
        {
          value: r.finalizadasMes,
          label: 'Finalizadas este Mes',
          iconSvg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>',
          iconBgColor: '#064E3B',
          iconColor: '#10B981',
          variant: 'secondary',
          badgeText: 'Mes actual',
          badgeColor: 'success',
        },
        {
          value: r.garantiasCerradasMes,
          label: 'Garantías cerradas este Mes',
          iconSvg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
          iconBgColor: '#14532D',
          iconColor: '#22C55E',
          variant: 'secondary',
          badgeText: 'Mes actual',
          badgeColor: 'success',
        },
      ]);
    } catch {
      this.kpiData.set([]);
    }
  }

  private async cargarComprasPendientes(): Promise<void> {
    this.comprasCargando.set(true);
    try {
      this.comprasPendientes.set(await firstValueFrom(this.reportes.comprasPendientes()));
    } catch {
      this.comprasPendientes.set([]);
    } finally {
      this.comprasCargando.set(false);
    }
  }

  private async cargarEventosCalendario(): Promise<void> {
    this.calendarioCargando.set(true);
    try {
      const eventos = await firstValueFrom(this.dashboard.eventosCalendario());
      this.calendarioEventos.set(eventos.map(e => this.mapearEvento(e)));
    } catch {
      this.calendarioEventos.set([]);
    } finally {
      this.calendarioCargando.set(false);
    }
  }

  private mapearEvento(e: EventoCalendarioBackend): CalendarEvent {
    const color = this.colorPorEstado(e.estadoObra);
    return {
      id: e.idObra,
      title: e.nombreObra,
      start: this.aISODate(e.fechaEvento),
      color,
      extendedProps: {
        type: this.tipoPorEstado(e.estadoObra),
        obraId: e.idObra,
        obraNombre: e.nombreObra,
        clienteNombre: e.nombreCliente,
      },
    };
  }

  private colorPorEstado(estado: string): string {
    switch (estado?.trim().toLowerCase()) {
      case 'levantamiento pendiente': return '#F59E0B';
      case 'en fabricacion': return '#3B82F6';
      case 'instalacion programada': return '#A855F7';
      case 'instalado': return '#10B981';
      case 'garantia': return '#EF4444';
      case 'finalizado': return '#64748B';
      default: return '#94A3B8';
    }
  }

  private tipoPorEstado(estado: string): 'Levantamiento' | 'Fabricacion' | 'Instalacion' | 'Garantia' {
    switch (estado?.trim().toLowerCase()) {
      case 'levantamiento pendiente': return 'Levantamiento';
      case 'en fabricacion': return 'Fabricacion';
      case 'instalado':
      case 'instalacion programada': return 'Instalacion';
      case 'garantia': return 'Garantia';
      default: return 'Levantamiento';
    }
  }

  private aISODate(valor: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const d = new Date(valor);
    if (!Number.isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return valor ?? '';
  }

  onEventoClick(evento: CalendarEvent): void {
    this.router.navigate(['/admin/obras'], { queryParams: { ver: evento.extendedProps.obraId } });
  }

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
}