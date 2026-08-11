import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LogService } from '../services/log.service';

// Refresco único (single-flight): todas las peticiones que detecten un 401
// esperan el mismo refresh en lugar de lanzar renovaciones en paralelo. El
// single-flight vive en AuthService.refreshToken() (compartido por interceptor,
// SSE y restauración). Evita la recursión y los refresh múltiples.
//
// El logout también está centralizado en AuthService.logout() (idempotente):
// aunque varias peticiones fallen con 401, el logout y la navegación a /login
// ocurren una sola vez (sin toasts duplicados).

const SKIP_URLS = ['/Auth/refresh', '/Trabajadores/login'];

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const log = inject(LogService);

  // Endpoints públicos: nunca se tocan ni refrescan (evita recursión infinita).
  if (SKIP_URLS.some(u => req.url.includes(u))) {
    const token = auth.getToken();
    return next(token ? addToken(req, token) : req);
  }

  const token = auth.getToken();

  // Refresh preventivo si el access token está próximo a expirar (<5 min).
  if (token && auth.isTokenExpiringSoon(token)) {
    log.auth('Token próximo a expirar, solicitando renovación preventiva');
    return auth.refreshToken().pipe(
      switchMap(newToken => next(addToken(req, newToken))),
      catchError(() => {
        //refresh preventivo fallido: deja que la petición original salga con
        // el token actual; si el backend responde 401, el flujo reactivo de
        // abajo se encargará.
        return next(token ? addToken(req, token) : req);
      })
    );
  }

  // Petición normal con token vigente.
  return next(token ? addToken(req, token) : req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Solo se reacciona a 401 del backend (token expirado o inválido).
      if (error.status !== 401) {
        return throwError(() => error);
      }

      // Si no hay refresh token, no se puede renovar: logout único.
      if (!auth.getRefreshToken()) {
        auth.logout();
        return throwError(() => error);
      }

      // Refresh reactivo (single-flight en AuthService) y reintento de la
      // petición original con el nuevo access token.
      log.auth('401 recibido, intentando renovación reactiva');
      return auth.refreshToken().pipe(
        switchMap(newToken => next(addToken(req, newToken))),
        catchError(() => {
          // Refresh rechazado (refresh token expirado/inválido): logout único.
          auth.logout();
          return throwError(() => error);
        })
      );
    })
  );
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}
