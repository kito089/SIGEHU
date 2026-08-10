import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { EnvService } from '../../services/env.service';

/* =========================================================================
   SIGEHU — Centro de Notificaciones (por cuenta + SSE multidispositivo).

   Fuente de verdad: base de datos del backend, asociada al usuario autenticado
   (idTrabajador). Todas las sesiones/instancias de la MISMA cuenta (PC web,
   Electron, Android) se sincronizan en tiempo real vía SSE:

     - push()                       → POST /Notificaciones  (persiste y emite)
     - remove(id)                   → DELETE /Notificaciones/:id
     - clearAll()                   → DELETE /Notificaciones
     - stream SSE                   → GET /Notificaciones/stream

   Eventos SSE recibidos:
     - notification.created         → agrega la notificación
     - notification.deleted         → elimina la notificación
     - notification.deleted_all     → vacía la lista

   Selección de identidad: SIEMPRE la del usuario autenticado (AuthService /
   JWT). Nunca se usa usuarioId del cliente en la conexión SSE.

   Capacidades del cliente:
     - caché localStorage solo como primera pintura/offline (nunca fuente de
       verdad; el backend lo reemplaza al sincronizar);
     - conexión SSE con fetch() + ReadableStream (autorización por header),
       reconexión automática con backoff y resincronización de la lista;
     - IDs temporales NEGATIVOS para la inserción optimista local, de modo que
       nunca colisionan con los IDs reales (siempre positivos) del backend;
     - deduplicación entre respuesta HTTP del POST y evento SSE.
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
const RECONNECT_BASE_MS = 3000;
const RECONNECT_MAX_MS = 15000;

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private notifications = new BehaviorSubject<AppNotification[]>([]);
  private muted = false;

  // --- Estado de la conexión SSE ---
  private running = false;
  private sseAbort?: AbortController;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private attempts = 0;

  private seq = 0;

  private api = inject(ApiService);
  private auth = inject(AuthService);
  private env = inject(EnvService);

  notifications$: Observable<AppNotification[]> = this.notifications.asObservable();

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

  // =========================================================================
  // Ciclo de vida (lo orquesta AppComponent en función de login/logout)
  // =========================================================================

  /** Inicia la sincronización por cuenta: refresca la lista y abre el SSE. */
  start(): void {
    if (this.running) return;
    this.running = true;
    this.attempts = 0;
    this.refetch();
    this.connectSSE();
  }

  /** Detiene el SSE y la reconexión (logout / sesión expirada). */
  stop(): void {
    this.running = false;
    this.sseAbort?.abort();
    this.sseAbort = undefined;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  // =========================================================================
  // API pública (compatibilidad total con la implementación anterior)
  // =========================================================================

  /** Registra una notificación. Persiste en backend y se propaga a todas las
   *  sesiones de la cuenta vía SSE. Si no hay conexión (offline) degrada a una
   *  notificación local temporal. El centro SIEMPRE registra (incluso mute). */
  push(type: NotificationType, message: string): void {
    if (!message) return;

    // Inserción optimista local con ID TEMPORAL NEGATIVO (nunca colisiona con
    // los IDs reales del backend, siempre positivos). Se reemplaza por el real
    // cuando responde el POST o llega el evento SSE.
    const tempId = this.pushLocal(type, message);

    this.api.post<AppNotification>('/Notificaciones', { tipo: type, mensaje: message }).subscribe({
      next: (creada) => {
        this.removeLocal(tempId);
        this.applyRemoteItem(creada);
      },
      error: () => {
        // Offline: la notificación temporal queda como degradación local y el
        // siguiente arranque/resincronización la sustituye por el estado real.
      }
    });
  }

  /** Elimina una notificación individual y la sincroniza con el backend. */
  remove(id: number): void {
    // ID temporal local (negativo): nunca se envió al backend, solo se quita.
    if (id < 0) {
      this.removeLocal(id);
      return;
    }
    // Eliminación optimista local + confirmación en backend (propaga vía SSE a
    // las demás sesiones de la cuenta).
    if (this.removeLocal(id)) {
      this.api.delete(`/Notificaciones/${id}`).subscribe({
        error: () => this.refetch() // desincronización: se resincroniza la fuente de verdad
      });
    }
  }

  /** Elimina todas las notificaciones de la cuenta y lo sincroniza. */
  clearAll(): void {
    const actuales = this.notifications.getValue();
    if (actuales.length === 0) return;
    this.setLocal([]);
    this.api.delete('/Notificaciones').subscribe({
      error: () => this.refetch()
    });
  }

  /** Silencia los toasts visuales (el centro sigue registrando). Estado en memoria. */
  setMuted(value: boolean): void {
    this.muted = value;
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  // =========================================================================
  // Interno: lista local
  // =========================================================================

  /** Inserta de forma optimista una notificación local y devuelve su ID temporal. */
  private pushLocal(type: NotificationType, message: string): number {
    const tempId = -(Date.now() + ++this.seq); // negativo: NUNCA choca con IDs reales
    const item: AppNotification = { id: tempId, type, message, createdAt: Date.now() };
    this.setLocal([item, ...this.notifications.getValue()]);
    return tempId;
  }

  private removeLocal(id: number): boolean {
    const actuales = this.notifications.getValue();
    const existe = actuales.some(n => n.id === id);
    if (!existe) return false;
    this.setLocal(actuales.filter(n => n.id !== id));
    return true;
  }

  private setLocal(list: AppNotification[]): void {
    const next = [...list]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_NOTIFICATIONS);
    this.notifications.next(next);
    this.persist(next);
  }

  private load(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const arr = raw ? (JSON.parse(raw) as AppNotification[]) : [];
      if (Array.isArray(arr)) {
        this.setLocal(arr);
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

  // =========================================================================
  // Interno: fuente de verdad (backend)
  // =========================================================================

  private refetch(): void {
    this.api.get<AppNotification[]>('/Notificaciones').subscribe({
      next: (lista) => {
        if (Array.isArray(lista)) {
          this.setLocal(lista);
        }
      },
      error: () => {
        // Offline: se conserva la lista local actual.
      }
    });
  }

  // =========================================================================
  // Interno: cliente SSE (fetch + ReadableStream, autorización por header)
  // =========================================================================

  private connectSSE(): void {
    if (!this.running) return;

    this.sseAbort?.abort();
    const controller = new AbortController();
    this.sseAbort = controller;

    const token = this.auth.getToken();
    if (!token) {
      this.stop();
      return;
    }

    const url = `${this.env.getBaseUrl()}/Notificaciones/stream`;

    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'text/event-stream',
        'Cache-Control': 'no-cache'
      },
      signal: controller.signal
    })
      .then((res) => {
        if (res.status === 401) {
          this.handleAuthFailure();
          return;
        }
        if (!res.ok || !res.body) {
          this.scheduleReconnect();
          return;
        }
        return this.readSse(res, controller);
      })
      .catch(() => {
        // Red rota / abort: se reintenta con backoff (si sigue activo).
        this.scheduleReconnect();
      });
  }

  private async readSse(res: Response, controller: AbortController): Promise<void> {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      for (;;) {
        if (!this.running || this.sseAbort !== controller) break;
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const raw = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          this.handleSseEvent(raw);
        }
      }
    } catch {
      // Abort por stop/reconexión o stream roto: se trata después.
    } finally {
      try {
        reader.releaseLock();
      } catch {
        /* noop */
      }
    }

    // Solo la conexión vigente programa reconexión (las abortadas por una
    // conexión más nueva ya no son 'this.sseAbort').
    if (this.running && this.sseAbort === controller) {
      this.scheduleReconnect();
    }
  }

  /** Parseo mínimo del formato text/event-stream (evento + data). */
  private handleSseEvent(raw: string): void {
    let event = 'message';
    let data = '';

    for (const line of raw.split('\n')) {
      if (line.startsWith(':')) continue; // comment/heartbeat
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data = line.slice(5).trim();
      // 'id:' y 'retry:' no se usan (la reconexión es gestionada manualmente).
    }

    if (!data) return;

    let payload: unknown;
    try {
      payload = JSON.parse(data);
    } catch {
      return;
    }

    switch (event) {
      case 'notification.created': {
        const item = payload as AppNotification;
        if (item && item.id != null) this.applyRemoteItem(item);
        break;
      }
      case 'notification.deleted': {
        const body = payload as { id?: number };
        if (body && body.id != null) this.applyRemoteDeleted(body.id);
        break;
      }
      case 'notification.deleted_all':
        this.applyRemoteClear();
        break;
      default:
        break;
    }
  }

  /** Inserta/actualiza una notificación del backend deduplicando por id. */
  private applyRemoteItem(item: AppNotification): void {
    this.attempts = 0;
    if (!item || item.id == null) return;
    this.setLocal([item, ...this.notifications.getValue().filter(n => n.id !== item.id)]);
  }

  private applyRemoteDeleted(id: number): void {
    this.attempts = 0;
    this.removeLocal(id);
  }

  private applyRemoteClear(): void {
    this.attempts = 0;
    this.setLocal([]);
  }

  // =========================================================================
  // Interno: reconexión / sesión
  // =========================================================================

  private scheduleReconnect(): void {
    if (!this.running || this.reconnectTimer) return;

    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.attempts, RECONNECT_MAX_MS);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.attempts += 1;
      this.refetch();      // cubre el hueco de eventos perdidos
      this.connectSSE();
    }, delay);
  }

  /** 401 en el stream: intenta renovar el token y reanuda; si no, cierra sesión. */
  private async handleAuthFailure(): Promise<void> {
    this.stop();
    try {
      const prev = this.auth.getToken();
      if (prev) {
        const res = await firstValueFrom(this.api.post<{ token: string }>('/Auth/refresh', { token: prev }));
        if (res?.token) {
          this.auth.refreshSession(res.token);
          this.start();
          return;
        }
      }
    } catch {
      // Token expirado/inválido o red inalcanzable: se cierra la sesión.
    }
    this.auth.logout();
  }
}