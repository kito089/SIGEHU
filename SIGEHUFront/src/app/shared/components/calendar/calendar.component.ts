import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Calendar as FullCalendar, EventClickArg } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import type { CalendarEvent } from '../../../core/models/dashboard.model';
import { SkeletonComponent } from '../skeleton/skeleton.component';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, SkeletonComponent],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CalendarComponent implements OnDestroy {
  @Input() set events(value: CalendarEvent[]) {
    this._events = value ?? [];
    if (this.calendar) {
      this.updateEvents(this._events);
    }
  }
  get events(): CalendarEvent[] {
    return this._events;
  }
  private _events: CalendarEvent[] = [];

  @Input() loading = false;

  @Output() eventClick = new EventEmitter<CalendarEvent>();

  private calendar?: FullCalendar;

  @ViewChild('calendarEl') set calendarElRef(el: ElementRef | undefined) {
    if (el && !this.calendar) {
      this.initCalendar(el);
    } else if (!el && this.calendar) {
      this.calendar.destroy();
      this.calendar = undefined;
    }
  }

  ngOnDestroy(): void {
    this.calendar?.destroy();
  }

  private initCalendar(el: ElementRef): void {
    this.calendar = new FullCalendar(el.nativeElement, {
      plugins: [dayGridPlugin, interactionPlugin],
      initialView: 'dayGridMonth',
      headerToolbar: {
        left: 'prev,next today',
        center: 'title',
        right: 'dayGridMonth,dayGridWeek'
      },
      buttonText: {
        today: 'Hoy',
        month: 'Mes',
        week: 'Semana'
      },
      locale: esLocale,
      height: 'auto',
      events: this.events as any,
      eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
      eventDisplay: 'block',
      eventClick: (info: EventClickArg) => this.handleEventClick(info)
    });
  }

  updateEvents(events: CalendarEvent[]): void {
    if (this.calendar) {
      this.calendar.removeAllEvents();
      this.calendar.addEvent(events as any);
    }
    this._events = events;
  }

  private handleEventClick(info: EventClickArg): void {
    const ext = info.event.extendedProps as CalendarEvent['extendedProps'];
    const evento: CalendarEvent = {
      id: Number(info.event.id) || ext.obraId,
      title: info.event.title,
      start: info.event.startStr,
      end: info.event.endStr || undefined,
      color: info.event.backgroundColor as string,
      extendedProps: ext,
    };
    this.eventClick.emit(evento);
  }
}