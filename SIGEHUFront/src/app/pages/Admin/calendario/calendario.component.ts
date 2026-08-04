import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
// import { ObrasService } from '../../services/obras.service';

/* =========================================================================
   SIGEHU — Calendario Operativo (componente Angular standalone)

   Muestra los eventos programados de las tres etapas con fecha crítica:
   Levantamiento, En Fabricación e Instalación Programada.

   Sustituye fetchEventos() por tu llamada real (GET /api/obras/calendario)
   cuando conectes el backend.
   ========================================================================= */

type TipoEvento = 'levantamiento' | 'fabricacion' | 'instalacion';

interface EventoCalendario {
  id: number;
  obra: string;
  cliente: string;
  tipo: TipoEvento;
  fechaISO: string;
  hora: string;
  responsable: string;
}

interface CalendarCell {
  date: Date;
  day: number;
  enMes: boolean;
  esHoy: boolean;
  eventos: EventoCalendario[];
}

const TIPO_LABEL: Record<TipoEvento, string> = {
  levantamiento: 'Levantamiento',
  fabricacion:   'En Fabricación',
  instalacion:   'Instalaciones Programadas',
};

const MESES: string[] = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

const DOW: string[] = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

@Component({
  selector: 'app-calendario-operativo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendario.component.html',
  styleUrls: ['./calendario.component.css'],
})
export class CalendarioOperativoComponent implements OnInit {

  readonly dow = DOW;
  readonly tipos: TipoEvento[] = ['levantamiento', 'fabricacion', 'instalacion'];
  readonly tipoLabel = TIPO_LABEL;

  eventos: EventoCalendario[] = [];
  filtrosActivos: Set<TipoEvento> = new Set(this.tipos);
  cursor = new Date();
  selectedEvento: EventoCalendario | null = null;

  ngOnInit(): void {
    this.fetchEventos().then(eventos => {
      this.eventos = eventos;
    });
  }

  // Ajusta esto a tu endpoint real cuando conectes el backend, p. ej.:
  // constructor(private obrasService: ObrasService) {}
  // private fetchEventos(): Promise<EventoCalendario[]> {
  //   return firstValueFrom(this.obrasService.calendario());
  // }
  private async fetchEventos(): Promise<EventoCalendario[]> {
    const y = this.cursor.getFullYear();
    const m = String(this.cursor.getMonth() + 1).padStart(2, '0');

    return [
      { id: 1, obra: 'Barandales Terraza Norte', cliente: 'Motel Sol Clarión', tipo: 'levantamiento',
        fechaISO: `${y}-${m}-03`, hora: '10:00 AM', responsable: 'Ing. Beltrán' },
      { id: 2, obra: 'Reja Enrollable Local', cliente: 'Farmacia del Valle', tipo: 'fabricacion',
        fechaISO: `${y}-${m}-03`, hora: 'Todo el día', responsable: 'Medina S.' },
      { id: 3, obra: 'Protecciones Ventana Mod. P12', cliente: 'Inmobiliaria Viste', tipo: 'fabricacion',
        fechaISO: `${y}-${m}-04`, hora: 'Todo el día', responsable: 'Medina y J. López' },

      { id: 4, obra: 'Estructura Domo Patio', cliente: 'Sofía Hernández', tipo: 'levantamiento',
        fechaISO: `${y}-${m}-08`, hora: '9:30 AM', responsable: 'Ing. Beltrán' },
      { id: 5, obra: 'Fuga en Bisagra Portón', cliente: 'Carlos Mendoza', tipo: 'fabricacion',
        fechaISO: `${y}-${m}-08`, hora: 'Todo el día', responsable: 'J. López' },

      { id: 6, obra: 'Ajuste Barandal Escalera', cliente: 'Motel Sol Clarión', tipo: 'fabricacion',
        fechaISO: `${y}-${m}-10`, hora: 'Todo el día', responsable: 'Medina S.' },

      { id: 7, obra: 'Portón Automatizado Principal', cliente: 'Isra. García Torres', tipo: 'instalacion',
        fechaISO: `${y}-${m}-12`, hora: '4:00 PM', responsable: 'N. Bárcenas' },

      { id: 8, obra: 'Cancel Principal Baño', cliente: 'Residencial Alvento', tipo: 'levantamiento',
        fechaISO: `${y}-${m}-24`, hora: '11:00 AM', responsable: 'Ing. Beltrán' },
    ];
  }

  // ---------------------------------------------------------------------
  // Navegación de mes
  // ---------------------------------------------------------------------

  get monthLabel(): string {
    return `${MESES[this.cursor.getMonth()]} ${this.cursor.getFullYear()}`;
  }

  mesAnterior(): void {
    this.cursor = new Date(this.cursor.getFullYear(), this.cursor.getMonth() - 1, 1);
    this.fetchEventos().then(eventos => (this.eventos = eventos));
  }

  mesSiguiente(): void {
    this.cursor = new Date(this.cursor.getFullYear(), this.cursor.getMonth() + 1, 1);
    this.fetchEventos().then(eventos => (this.eventos = eventos));
  }

  // ---------------------------------------------------------------------
  // Filtros por tipo (leyenda clickeable)
  // ---------------------------------------------------------------------

  toggleFiltro(tipo: TipoEvento): void {
    if (this.filtrosActivos.has(tipo)) {
      this.filtrosActivos.delete(tipo);
    } else {
      this.filtrosActivos.add(tipo);
    }
  }

  filtroActivo(tipo: TipoEvento): boolean {
    return this.filtrosActivos.has(tipo);
  }

  // ---------------------------------------------------------------------
  // Construcción de la grilla del mes
  // ---------------------------------------------------------------------

  get celdas(): CalendarCell[] {
    const year = this.cursor.getFullYear();
    const month = this.cursor.getMonth();
    const hoy = new Date();

    const primerDia = new Date(year, month, 1);
    const startOffset = primerDia.getDay(); // domingo = 0
    const diasEnMes = new Date(year, month + 1, 0).getDate();
    const diasMesAnterior = new Date(year, month, 0).getDate();

    const eventosVisibles = this.eventos.filter(e => this.filtrosActivos.has(e.tipo));

    const eventsByDay: Record<string, EventoCalendario[]> = {};
    eventosVisibles.forEach(e => {
      (eventsByDay[e.fechaISO] ??= []).push(e);
    });

    const cells: CalendarCell[] = [];

    // Cola del mes anterior para completar la primera semana
    for (let i = startOffset - 1; i >= 0; i--) {
      const day = diasMesAnterior - i;
      const date = new Date(year, month - 1, day);
      cells.push({ date, day, enMes: false, esHoy: false, eventos: [] });
    }

    // Días del mes actual
    for (let day = 1; day <= diasEnMes; day++) {
      const date = new Date(year, month, day);
      const iso = this.toISO(date);
      cells.push({
        date,
        day,
        enMes: true,
        esHoy: date.toDateString() === hoy.toDateString(),
        eventos: eventsByDay[iso] ?? [],
      });
    }

    // Relleno del mes siguiente hasta completar semanas de 7
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      const date = new Date(year, month + 1, nextDay);
      cells.push({ date, day: nextDay, enMes: false, esHoy: false, eventos: [] });
      nextDay++;
    }

    return cells;
  }

  private toISO(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // ---------------------------------------------------------------------
  // Detalle / agendar
  // ---------------------------------------------------------------------

  abrirEvento(evento: EventoCalendario): void {
    this.selectedEvento = evento;
  }

  cerrarDetalle(): void {
    this.selectedEvento = null;
  }

  agendar(): void {
    // Conectar con el formulario de nueva visita/actividad, p. ej.:
    //this.router.navigate(['/calendario/agendar']);
    
  }
}