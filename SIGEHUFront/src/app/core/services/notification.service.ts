import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/* =========================================================================
   SIGEHU — Centro de Notificaciones.

   Almacena de forma persistente (localStorage) todas las notificaciones
   generadas por la aplicación (registros, errores, eliminaciones,
   actualizaciones, advertencias e información). Permanecen disponibles
   hasta que el usuario las elimine.

   Tipos de notificación (mismo contrato que ToastService):
     success · warning · error · info

   Capacidades:
     - push(type, message): agrega una notificación (icono/color según tipo).
     - remove(id): elimina una notificación individual.
     - clearAll(): elimina todas.
     - mute/unmute: silencia SOLO los toasts visuales (el centro sigue
       registrando todas las notificaciones). El estado se mantiene en
       memoria mientras la aplicación permanezca abierta.
   ========================================================================= */

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface AppNotification {
  id: number;
  type: NotificationType;
  message: string;
  createdAt: number; // timestamp (epoch ms) para fecha + hora
}

const STORAGE_KEY = 'sigehu_notifications';
const MAX_NOTIFICATIONS = 100;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notifications = new BehaviorSubject<AppNotification[]>([]);
  private muted = false;

  notifications$: Observable<AppNotification[]> = this.notifications.asObservable();

  private seq = 0;

  constructor() {
    this.load();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Snapshot actual de las notificaciones (para lectura síncrona). */
  get lista(): AppNotification[] {
    return this.notifications.getValue();
  }

  /** Registra una nueva notificación. El centro SIEMPRE registra (incluso silenciado). */
  push(type: NotificationType, message: string): void {
    if (!message) return;
    const item: AppNotification = {
      id: ++this.seq + Date.now(),
      type,
      message,
      createdAt: Date.now(),
    };
    const next = [...this.notifications.getValue(), item].slice(-MAX_NOTIFICATIONS);
    this.notifications.next(next);
    this.persist(next);
  }

  remove(id: number): void {
    const next = this.notifications.getValue().filter(n => n.id !== id);
    this.notifications.next(next);
    this.persist(next);
  }

  clearAll(): void {
    this.notifications.next([]);
    this.persist([]);
  }

  /** Silencia los toasts visuales (el centro sigue registrando). Estado en memoria. */
  setMuted(value: boolean): void {
    this.muted = value;
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? (JSON.parse(raw) as AppNotification[]) : [];
      if (Array.isArray(arr)) {
        this.notifications.next(arr);
      }
    } catch {
      this.notifications.next([]);
    }
  }

  private persist(list: AppNotification[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {
      // Almacenamiento lleno o no disponible: la sesión sigue sin persistencia.
    }
  }
}
