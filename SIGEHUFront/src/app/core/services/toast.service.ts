import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { NotificationService } from './notification.service';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastItem {
  id: number;
  type: ToastType;
  message: string;
  duration: number;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private notificationService = inject(NotificationService);

  private toastsSubject = new BehaviorSubject<ToastItem[]>([]);
  toasts$: Observable<ToastItem[]> = this.toastsSubject.asObservable();
  private counter = 0;

  success(message: string, duration = 4000): void { this.push('success', message, duration); }
  warning(message: string, duration = 4000): void { this.push('warning', message, duration); }
  error(message: string, duration = 6000): void { this.push('error', message, duration); }
  info(message: string, duration = 4000): void { this.push('info', message, duration); }

  private push(type: ToastType, message: string, duration: number): void {
    // El centro de notificaciones SIEMPRE registra (incluso con mute activo).
    this.notificationService.push(type, message);

    // El toast visual solo se muestra cuando no está silenciado.
    if (this.notificationService.isMuted) return;

    const id = ++this.counter;
    const toast: ToastItem = { id, type, message, duration, createdAt: Date.now() };
    const current = this.toastsSubject.value;
    this.toastsSubject.next([...current, toast]);
  }

  dismiss(id: number): void {
    const current = this.toastsSubject.value;
    this.toastsSubject.next(current.filter(t => t.id !== id));
  }
}