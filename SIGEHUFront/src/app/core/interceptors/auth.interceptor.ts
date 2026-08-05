import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, finalize, map, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

// Refresco único (single-flight): todas las peticiones que detecten un token
// próximo a expirar esperan el mismo resultado en lugar de lanzar refrescos en
// paralelo. Evita la renovación múltiple del token y la recursión entre requests.
let refreshing$: Observable<string> | null = null;

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);

  // Nunca refrescar la propia petición de refresh (evita recursión infinita).
  if (req.url.includes('/Auth/refresh')) {
    const token = auth.getToken();
    return next(token ? addToken(req, token) : req);
  }

  const token = auth.getToken();

  if (token && isExpiring(token)) {
    if (!refreshing$) {
      refreshing$ = requestRefresh(auth).pipe(
        shareReplay({ bufferSize: 1, refCount: false }),
        finalize(() => {
          refreshing$ = null;
        })
      );
    }

    return refreshing$.pipe(
      switchMap(newToken => next(addToken(req, newToken))),
      catchError(() => {
        auth.logout();
        return throwError(() => new HttpErrorResponse({ status: 401 }));
      })
    );
  }

  return next(token ? addToken(req, token) : req);
};

function requestRefresh(auth: AuthService): Observable<string> {
  const api = inject(ApiService);
  return api
    .post<{ token: string }>('/Auth/refresh', { token: auth.getToken() })
    .pipe(
      map(res => res.token),
      tap(newToken => auth.refreshSession(newToken))
    );
}

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isExpiring(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    const expiresIn = payload.exp * 1000 - Date.now();
    return expiresIn < 5 * 60 * 1000;
  } catch {
    return false;
  }
}
