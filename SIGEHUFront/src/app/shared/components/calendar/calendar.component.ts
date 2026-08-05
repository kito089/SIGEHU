import { Component, Input, ChangeDetectionStrategy, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Calendar as FullCalendar } from '@fullcalendar/core';
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
  @Input() events: CalendarEvent[] = [];
  @Input() loading = false;

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
        right: 'dayGridMonth'
      },
      locale: esLocale,
      height: 'auto',
      events: this.events as any,
      eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
      eventDisplay: 'block'
    });
  }

  updateEvents(events: CalendarEvent[]): void {
    if (this.calendar) {
      this.calendar.removeAllEvents();
      this.calendar.addEvent(events as any);
    }
    this.events = events;
  }
}