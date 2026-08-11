import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { LogService } from '../services/log.service';

// El 401 (sesión expirada / token inválido) se maneja íntegramente en
// authInterceptor (refresh reactivo + logout único). Aquí NO se muestran toasts
// de "sesión expirada" para evitar duplicarse cuando varias peticiones fallan a
// la vez (era la causa raíz de las notificaciones infinitas).

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);
  const log = inject(LogService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 0) {
        const offlineSync = inject(OfflineSyncService);
        toast.error('Sin conexión. Acciones encoladas para sincronización');
        log.backend('Pérdida de conexión con el backend', { url: error.url }, 'WARN');
        if (req.method !== 'GET') {
          offlineSync.enqueue(req.method, req.url, req.body);
        }
      } else if (error.status === 401) {
        // Silencioso: el authInterceptor ya decidió (refresh o logout único).
        // Para el login (credenciales inválidas), el componente de login ya
        // muestra su propio mensaje.
        if (req.url.includes('/Trabajadores/login')) {
          log.auth('Login rechazado (credenciales inválidas)', undefined, 'WARN');
        } else {
          log.auth('401 propagado tras refresh/decisión del interceptor', undefined, 'WARN');
        }
      } else if (error.status === 403) {
        toast.error(error.error?.error || 'Acceso denegado: no tiene permisos para esta acción');
      } else if (error.status === 400) {
        toast.error(error.error?.error || 'Datos inválidos');
      } else if (error.status >= 500) {
        toast.error(error.error?.error || 'Error del servidor, intente más tarde');
      }
      return throwError(() => error);
    })
  );
};
