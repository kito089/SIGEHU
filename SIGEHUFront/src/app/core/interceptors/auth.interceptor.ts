import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<unknown>, next: HttpHandlerFn) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.getToken();

  if (token && isExpiring(token)) {
    const api = inject(ApiService);
    return api.post<{ token: string }>('/Auth/refresh', { token }).pipe(
      switchMap(res => {
        localStorage.setItem('token', res.token);
        return next(addToken(req, res.token));
      }),
      catchError(() => {
        auth.logout();
        return throwError(() => new HttpErrorResponse({ status: 401 }));
      })
    );
  }

  return next(token ? addToken(req, token) : req);
};

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

function isExpiring(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    const expiresIn = payload.exp * 1000 - Date.now();
    return expiresIn < 5 * 60 * 1000;
  } catch { return false; }
}