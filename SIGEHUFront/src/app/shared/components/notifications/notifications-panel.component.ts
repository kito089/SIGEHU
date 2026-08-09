import { Component, inject, signal, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, AppNotification, NotificationType } from '../../../core/services/notification.service';

/* =========================================================================
   SIGEHU — Panel del Centro de Notificaciones.

   Despliega la lista persistente de notificaciones con:
     - icono + color según tipo (success/error/warning/info)
     - fecha y hora de generación
     - botón "eliminar" por notificación
     - botón "eliminar todas"
     - botón "silenciar" (detiene el registro de nuevas notificaciones)
     - botón "cerrar" (emite closeClick al componente padre)
   El panel permanece abierto/cerrado por el componente padre (topbar/header).
   ========================================================================= */

@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications-panel.component.html',
  styleUrls: ['./notifications-panel.component.scss'],
})
export class NotificationsPanelComponent {
  private service = inject(NotificationService);

  readonly notificaciones$ = this.service.notifications$;
  readonly muted = signal(this.service.isMuted);
  readonly closeClick = output<void>();

  get isEmpty(): boolean {
    return this.service.lista.length === 0;
  }

  get count(): number {
    return this.service.lista.length;
  }

  eliminar(id: number): void {
    this.service.remove(id);
  }

  eliminarTodas(): void {
    this.service.clearAll();
  }

  silenciar(): void {
    this.muted.set(this.service.toggleMuted());
  }

  cerrar(): void {
    this.closeClick.emit();
  }

  icono(tipo: NotificationType): string {
    switch (tipo) {
      case 'success':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
      case 'error':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
      case 'warning':
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
      default:
        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }
  }

  formatearFecha(ts: number): string {
    const d = new Date(ts);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} · ${hh}:${min}`;
  }

  tipoLabel(tipo: NotificationType): string {
    switch (tipo) {
      case 'success': return 'Éxito';
      case 'error': return 'Error';
      case 'warning': return 'Advertencia';
      default: return 'Información';
    }
  }

  trackByFn(_index: number, item: AppNotification): number {
    return item.id;
  }
}
