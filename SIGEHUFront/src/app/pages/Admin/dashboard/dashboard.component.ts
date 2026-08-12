import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { DashboardTabsComponent, DashboardTab } from '../../../shared/components/dashboard/tabs/dashboard-tabs.component';
import { KanbanBoardComponent, KanbanColumnData, KanbanCardData, KanbanBadge } from '../../../shared/components/kanban/kanban-board.component';
import { CalendarComponent } from '../../../shared/components/calendar/calendar.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { DashboardService } from '../../../services/dashboard.service';
import type { EventoCalendarioBackend, KanbanRowBackend } from '../../../services/dashboard.service';
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

// Definicion canonica de las columnas Kanban del Dashboard (5 visibles + Garantias).
// El `id` es la clave interna (string) que usa el componente board para el selector
// movil y para ocultar columnas. El `idEstadoObra` es el valor que devuelve el
// backend en `KanbanRowBackend.IDESTADOOBRA`.
// Nota: la regla "Levantamiento sin trabajador -> Solicitud Recibida" se aplica
// en `cargarKanban()` al asignar la obra a su columna; esta tabla NO cambia.
interface DefColumnaKanban {
  id: string;
  title: string;
  color: string;
  idEstadoObra: number;
}

const COLUMNAS_KANBAN: DefColumnaKanban[] = [
  { id: 'solicitud',     title: 'Solicitud Recibida',     color: '#94A3B8', idEstadoObra: 1 },
  { id: 'levantamiento', title: 'Levantamiento',         color: '#F59E0B', idEstadoObra: 2 },
  { id: 'fabricacion',   title: 'En Fabricación',        color: '#3B82F6', idEstadoObra: 3 },
  { id: 'instalacion',   title: 'Instalación Programada', color: '#A855F7', idEstadoObra: 4 },
  { id: 'instalado',     title: 'Instalado',            color: '#10B981', idEstadoObra: 5 },
  { id: 'garantias',     title: 'Garantías',            color: '#EF4444', idEstadoObra: 6 },
];

// Paleta de colores para avatars de trabajadores en tarjetas Kanban.
// Seleccion deterministica por hash del nombre del trabajador.
const PALETA_AVATARES = ['#7C3AED', '#2563EB', '#F59E0B', '#10B981', '#A855F7', '#EF4444', '#3B82F6', '#22C55E'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    KpiCardComponent,
    DashboardTabsComponent,
    KanbanBoardComponent,
    CalendarComponent,
    SkeletonComponent,
    EmptyStateComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit {
  private router = inject(Router);
  private dashboard = inject(DashboardService);
  private reportes = inject(ReportesService);

  // Estado UI
  activeTab = signal<DashboardTab>('kanban');

  // Columna del Kanban seleccionada en el control movil (se conserva mientras
  // el usuario permanezca en la vista Kanban).
  readonly kanbanColumna = signal<string>('solicitud');

  // KPIs reales (GET /Dashboard/kpis)
  readonly kpiData = signal<KpiCardConfig[]>([]);
  // Compras pendientes de recibir (GET /Compras/pendientes)
  readonly comprasPendientes = signal<CompraPendiente[]>([]);
  readonly comprasCargando = signal(false);

  // Eventos reales del calendario (GET /Dashboard/calendar-events)
  readonly calendarioEventos = signal<CalendarEvent[]>([]);
  readonly calendarioCargando = signal(false);

  // Kanban real (GET /Dashboard/kanban).
  // `kanbanColumns` reemplaza al mock hardcoded anterior. Inicia vacio y se
  // rellena con `cargarKanban()`. Las senales de estado cargan la UX:
  //   - kanbanCargando = skeleton mientras se obtiene
  //   - kanbanError    =mensaje si la consulta falla (no se oculta el error)
  //   - kanbanVacio    = estado empty cuando todo OK pero no hay obras
  readonly kanbanColumns = signal<KanbanColumnData[]>([]);
  readonly kanbanCargando = signal(false);
  readonly kanbanError = signal<string | null>(null);
  readonly kanbanVacio = signal(false);

  ngOnInit(): void {
    this.cargarKpis();
    this.cargarComprasPendientes();
    this.cargarEventosCalendario();
    this.cargarKanban();
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
    // Lista de trabajadores asignados: el backend la entrega separada por '|'.
    // Se conserva el string crudo en `extendedProps.trabajadoresAsignados` para
    // mostrarlo en el tooltip del calendario (hover) tal cual, sin separar.
    const trabajadores = (e.trabajadoresAsignados ?? '').trim();
    // Fecha utilizada por el calendario (prioridad en el backend):
    // FechaInicio ?? FechaAsignacion(MIN) ?? FechaUltimaActualizacion.
    const fechaCal = this.aISODate(e.fechaEvento);
    return {
      id: e.idObra,
      title: e.nombreObra,
      start: fechaCal,
      color,
      extendedProps: {
        type: this.tipoPorEstado(e.estadoObra),
        obraId: e.idObra,
        obraNombre: e.nombreObra,
        clienteNombre: e.nombreCliente,
        estadoObra: e.estadoObra,
        trabajadoresAsignados: trabajadores,
        fechaCalendario: fechaCal,
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
    const obraId = evento.extendedProps.obraId;
    if (obraId === null || obraId === undefined || obraId === '') return;
    // Navegacion al detalle oficial de la obra (ruta existente).
    this.router.navigate(['/admin/obras/detalle', obraId]);
  }

  onRegistrarVisita(evento: CalendarEvent): void {
    this.calendarioEventos.update(lista => [...lista, evento]);
  }

  // Activity Feed (RF-33)
  // La "Actividad reciente" vive ahora unicamente en la pagina de Reportes,
  // alimentada por Auditorias / AuditoriasDetalles del backend.

  // ── Kanban real (GET /Dashboard/kanban) ────────────────────────────────────
  // La fuente unica de obras es /Dashboard/kanban (VW_OBRAS_KANBAN + lista de
  // trabajadores asignados). La transformacion agrupa por ESTADO y mapea a
  // KanbanColumnData/KanbanCardData. Aplica la regla:
  //   obra en "Levantamiento pendiente" SIN trabajadores asignados
  //   → se mueve a la columna "Solicitud Recibida".
  private async cargarKanban(): Promise<void> {
    this.kanbanCargando.set(true);
    this.kanbanError.set(null);
    this.kanbanVacio.set(false);
    try {
      const filas = await firstValueFrom(this.dashboard.kanban());
      this.kanbanColumns.set(this.construirColumnas(filas));
      const totalObras = this.kanbanColumns().reduce((n, c) => n + c.cards.length, 0);
      this.kanbanVacio.set(totalObras === 0);
    } catch (e: unknown) {
      // No ocultamos el error ni lo sustituimos por mocks.
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar las obras del tablero.';
      this.kanbanError.set(msg);
      this.kanbanColumns.set([]);
      this.kanbanVacio.set(false);
    } finally {
      this.kanbanCargando.set(false);
    }
  }

  // Reintento manual desde el boton de error.
  recargarKanban(): void { this.cargarKanban(); }

  private construirColumnas(filas: KanbanRowBackend[]): KanbanColumnData[] {
    // Inicializa cada columna canonica con cards vacio, conservando el orden
    // definido por su idEstadoObra.
    const columnas: KanbanColumnData[] = COLUMNAS_KANBAN.map(def => ({
      id: def.id,
      title: def.title,
      color: def.color,
      cards: [],
    }));
    const colPorIdEstado = new Map<number, KanbanColumnData>();
    COLUMNAS_KANBAN.forEach((def, i) => colPorIdEstado.set(def.idEstadoObra, columnas[i]));
    const colSolicitud = columnas[0];
    const colLevantamiento = columnas[1];

    for (const f of filas ?? []) {
      const idEstado = Number(f.IDESTADOOBRA ?? 0);
      const trabajadoresRaw = String(f.TRABAJADORESASIGNADOS ?? '').trim();
      const tieneTrabajador = trabajadoresRaw.length > 0;

      // Regla especial: Levantamiento (idEstadoObra=2) SIN trabajador → Solicitud Recibida.
      // Se aplica aqui en la capa de transformacion (no en SQL) para no duplicar
      // la logica en varias vistas y respetar la regla del enunciado.
      let colDestino = colPorIdEstado.get(idEstado) ?? null;
      if (idEstado === 2 && !tieneTrabajador && colSolicitud && colLevantamiento) {
        colDestino = colSolicitud;
      }
      if (!colDestino) continue; // estado fuera del tablero (e.g. Finalizado=7) se omite

      colDestino.cards.push(this.mapearCardKanban(f, trabajadoresRaw));
    }
    return columnas;
  }

  private mapearCardKanban(f: KanbanRowBackend, trabajadoresRaw: string): KanbanCardData {
    const idObra = Number(f.IDOBRA ?? 0);
    const nombreObra = String(f.NOMBREOBRA ?? '').trim();
    const nombreCliente = String(f.NOMBRECLIENTE ?? '').trim();

    // Trabajadores: el backend entrega "Nombre1|Nombre2". Tomamos el primero
    // para avatar+assigneeName; si hay mas, el assigneeName mostra "y N mAs".
    const trabajadores = trabajadoresRaw.length ? trabajadoresRaw.split('|').map(t => t.trim()).filter(Boolean) : [];
    const primerTrab = trabajadores[0] ?? '';
    const assigneeName = trabajadores.length === 0
      ? 'Sin asignar'
      : trabajadores.length === 1
        ? primerTrab
        : `${primerTrab} y ${trabajadores.length - 1} más`;

    return {
      id: idObra,
      // Codigo corto de la tarjeta: "O" + idObra, como ya hacia el mock ("C1").
      code: `O${idObra}`,
      client: nombreCliente,
      title: nombreObra,
      // badges: la informacion de badges (Pendiente/Realizado/Alta/etc.) proviene
      // de logicas que NO estan en VW_OBRAS_KANBAN. Se deja vacio (no hay mocks).
      badges: [] as KanbanBadge[],
      // Fecha de la tarjeta: usa FechaUltimaActualizacion (proxy de ultimo
      // cambio de estado, ya que TR_OBRAS_BU la bump-a en cualquier UPDATE).
      date: this.formatearFechaCorta(String(f.FECHAULTIMAACTUALIZACION ?? '')),
      avatarInitials: this.inicialesDe(primerTrab),
      avatarColor: this.colorAvatarDe(primerTrab),
      assigneeName,
    };
  }

  // Iniciales (hasta 2) del nombre del trabajador: "Jose Luis Perez" -> "JP".
  private inicialesDe(nombre: string): string {
    const limp = (nombre ?? '').trim();
    if (!limp) return '—';
    const partes = limp.split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '—';
    if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  }

  // Color determinista para el avatar basado en el hash del nombre.
  private colorAvatarDe(nombre: string): string {
    const s = (nombre ?? '').trim() || 'x';
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return PALETA_AVATARES[h % PALETA_AVATARES.length];
  }

  // "10 Ago 2026" a partir de una fecha ISO/Date-parseable.
  private formatearFechaCorta(valor: string): string {
    if (!valor) return '';
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return '';
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${d.getDate()} ${meses[d.getMonth()]} ${d.getFullYear()}`;
  }

  onTabChange(tab: DashboardTab): void {
    this.activeTab.set(tab);
  }

  // ── Control móvil del Kanban ─────────────────────────────────────────────
  onColumnaKanbanChange(columnaId: string): void {
    if (columnaId) this.kanbanColumna.set(columnaId);
  }

  // ── Compras pendientes ────────────────────────────────────────────────────
  // Límite visual: 4 proveedores y 5 materiales como máximo (… si hay más).
  // Solo afecta a la presentación; los datos provienen de GET /Compras/pendientes.
  private cortarLista(valor: string, separador: string, max: number): string {
    const items = (valor ?? '')
      .split(separador)
      .map(i => i.trim())
      .filter(Boolean);
    if (items.length === 0) return '';
    if (items.length <= max) return items.join(', ');
    return `${items.slice(0, max).join(', ')}, ...`;
  }

  proveedoresCortos(c: CompraPendiente): string {
    return this.cortarLista(c.proveedores, '|', 4);
  }

  materialesCortos(c: CompraPendiente): string {
    return this.cortarLista(c.materiales, ',', 5);
  }

  // Toda la tarjeta navega al detalle real de la compra (routing existente).
  irDetalleCompra(idCompra: number): void {
    if (idCompra == null) return;
    this.router.navigate(['/admin/orden'], { queryParams: { ver: idCompra } });
  }

  onCardClick(card: KanbanCardData): void {
    // Navegacion al detalle oficial de la obra (ruta existente).
    // Reutiliza el ID real de la obra (idObra) que ahora se almacena en card.id.
    const id = card.id;
    if (id === null || id === undefined || id === '') return;
    this.router.navigate(['/admin/obras/detalle', id]);
  }
}