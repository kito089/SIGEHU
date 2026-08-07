import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../services/toast.service';
import { OfflineSyncService } from '../../services/offline-sync.service';
import { LogService } from '../services/log.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const router = inject(Router);
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
        // El fallo del login no debe tratarse como sesión expirada: la página de
        // login muestra su propio mensaje de credenciales inválidas.
        if (!req.url.includes('/Trabajadores/login')) {
          log.auth('Token expirado / sesión expirada', undefined, 'WARN');
          auth.logout();
          toast.error('Sesión expirada. Ingrese nuevamente');
        } else {
          log.auth('Login rechazado (credenciales inválidas)', undefined, 'WARN');
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