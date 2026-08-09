import { Component, Input, Output, EventEmitter, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { CalendarEvent } from '../../../core/models/dashboard.model';
import { SkeletonComponent } from '../skeleton/skeleton.component';
import { AgendarVisitaComponent } from './agendar-visita.component';

type VistaCalendario = 'mes' | 'semana';

interface DiaCalendario {
  fecha: Date;
  iso: string;
  dia: number;
  enMes: boolean;
  esHoy: boolean;
  eventos: CalendarEvent[];
}

const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const pad = (n: number) => String(n).padStart(2, '0');

const aISODate = (f: Date) => `${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}`;

function aMidnight(f: Date): Date {
  const d = new Date(f);
  d.setHours(0, 0, 0, 0);
  return d;
}

function mesPrimerDia(f: Date): Date {
  return new Date(f.getFullYear(), f.getMonth(), 1);
}

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, SkeletonComponent, AgendarVisitaComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarComponent {
  @Input() set events(value: CalendarEvent[]) {
    this._events.set(value ?? []);
  }
  get events(): CalendarEvent[] {
    return this._events();
  }

  @Input() loading = false;

  @Output() eventClick = new EventEmitter<CalendarEvent>();
  @Output() registrarVisita = new EventEmitter<CalendarEvent>();

  private readonly _events = signal<CalendarEvent[]>([]);

  readonly diasSemana = DIAS_SEMANA;
  readonly vista = signal<VistaCalendario>('mes');
  readonly cursor = signal<Date>(aMidnight(new Date()));
  readonly agendarAbierto = signal(false);
  readonly fechaAgendar = signal<Date>(aMidnight(new Date()));

  private readonly eventosPorDia = computed(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of this._events()) {
      const iso = this.fechaISO(e.start);
      if (!iso) continue;
      const lista = map.get(iso) ?? [];
      lista.push(e);
      map.set(iso, lista);
    }
    return map;
  });

  readonly hayEventos = computed(() => this._events().length > 0);

  readonly titulo = computed(() => {
    const c = this.cursor();
    if (this.vista() === 'mes') {
      const mes = MESES[c.getMonth()];
      return `${mes.charAt(0).toUpperCase()}${mes.slice(1)} ${c.getFullYear()}`;
    }
    const dias = this.diasDeSemana();
    const ini = dias[0]?.fecha;
    const fin = dias[6]?.fecha;
    if (!ini || !fin) return '';
    if (ini.getMonth() === fin.getMonth() && ini.getFullYear() === fin.getFullYear()) {
      return `${ini.getDate()} – ${fin.getDate()} ${MESES_CORTOS[fin.getMonth()]} ${fin.getFullYear()}`;
    }
    return `${ini.getDate()} ${MESES_CORTOS[ini.getMonth()]} – ${fin.getDate()} ${MESES_CORTOS[fin.getMonth()]} ${fin.getFullYear()}`;
  });

  readonly celdasMes = computed<DiaCalendario[]>(() => {
    const c = this.cursor();
    const anio = c.getFullYear();
    const mes = c.getMonth();
    const primerDia = new Date(anio, mes, 1);
    const offset = (primerDia.getDay() + 6) % 7; // Lunes = 0
    const hoy = aMidnight(new Date());
    return Array.from({ length: 42 }, (_, i) => {
      const fecha = new Date(anio, mes, 1 - offset + i);
      const iso = aISODate(fecha);
      return {
        fecha,
        iso,
        dia: fecha.getDate(),
        enMes: fecha.getMonth() === mes,
        esHoy: aMidnight(fecha).getTime() === hoy.getTime(),
        eventos: this.eventosPorDia().get(iso) ?? [],
      };
    });
  });

  readonly diasDeSemana = computed<DiaCalendario[]>(() => {
    const c = aMidnight(this.cursor());
    const offset = (c.getDay() + 6) % 7;
    const lunes = new Date(c);
    lunes.setDate(c.getDate() - offset);
    const hoy = aMidnight(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(lunes);
      fecha.setDate(lunes.getDate() + i);
      const iso = aISODate(fecha);
      return {
        fecha,
        iso,
        dia: fecha.getDate(),
        enMes: fecha.getMonth() === c.getMonth(),
        esHoy: fecha.getTime() === hoy.getTime(),
        eventos: this.eventosPorDia().get(iso) ?? [],
      };
    });
  });

  cambiarVista(vista: VistaCalendario): void {
    this.vista.set(vista);
  }

  irAnterior(): void {
    const c = new Date(this.cursor());
    if (this.vista() === 'mes') {
      c.setMonth(c.getMonth() - 1);
    } else {
      c.setDate(c.getDate() - 7);
    }
    this.cursor.set(c);
  }

  irSiguiente(): void {
    const c = new Date(this.cursor());
    if (this.vista() === 'mes') {
      c.setMonth(c.getMonth() + 1);
    } else {
      c.setDate(c.getDate() + 7);
    }
    this.cursor.set(c);
  }

  irHoy(): void {
    this.cursor.set(aMidnight(new Date()));
  }

  abrirAgendar(fecha?: Date): void {
    const base = fecha && !Number.isNaN(fecha.getTime()) ? new Date(fecha) : aMidnight(new Date());
    this.fechaAgendar.set(base);
    this.agendarAbierto.set(true);
  }

  cerrarAgendar(): void {
    this.agendarAbierto.set(false);
  }

  onGuardarVisita(evento: CalendarEvent): void {
    this.cerrarAgendar();
    const d = new Date(evento.start);
    // Navega el cursor al mes del nuevo evento para que sea visible.
    if (!Number.isNaN(d.getTime()) && mesPrimerDia(d).getTime() !== mesPrimerDia(this.cursor()).getTime()) {
      this.cursor.set(mesPrimerDia(d));
    }
    this.registrarVisita.emit(evento);
  }

  onEventoClick(evento: CalendarEvent, event: Event): void {
    event.stopPropagation();
    this.eventClick.emit(evento);
  }

  tooltipEvento(e: CalendarEvent): string {
    const cliente = e.extendedProps.clienteNombre ? ` — ${e.extendedProps.clienteNombre}` : '';
    const hora = e.extendedProps.hora ? ` · ${e.extendedProps.hora}` : '';
    const notas = e.extendedProps.notas ? `\n${e.extendedProps.notas}` : '';
    return `${e.title}${cliente}${hora}${notas}`;
  }

  private fechaISO(valor: string): string | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor ?? '');
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return null;
    return aISODate(d);
  }
}