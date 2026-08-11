import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap, finalize, shareReplay, switchMap, map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { User, AuthResponse, LoginCredentials } from '../core/models/user.model';
import { LogService } from '../core/services/log.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  private log = inject(LogService);

  // Bandera para garantizar que el logout (limpieza + navegación a /login) se
  // ejecute una sola vez aunque varios flujos (interceptor, SSE, errores)
  // detecten sesión inválida de forma simultánea. Evita toasts múltiples y
  // navegación repetida al login.
  private loggingOut = false;

  // Single-flight del refresh: todas las llamadas concurrentes que necesiten
  // renovar el access token esperan el mismo Observable en lugar de lanzar
  // peticiones de refresh en paralelo. Se reinicia a null al terminar.
  private refreshing$: Observable<string> | null = null;

  login(credentials: LoginCredentials, remember = false): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/Trabajadores/login', credentials).pipe(
      tap(res => {
        this.setSession(res, remember);
        this.loggingOut = false;
        // Nunca se registran credenciales; solo el evento y el rol.
        this.log.auth('Login exitoso', { remember });
        this.log.auth('Rol de sesión', { rol: res.trabajador?.rol });
      })
    );
  }

  /**
   * Logout único del sistema. Idempotente: si ya hay un logout en curso, no
   * hace nada. Esto evita que múltiples peticiones fallidas con 401 (p. ej.,
   * SSE + dashboard + refetch) provoquen varios toasts "Sesión expirada" y
   * varias navegaciones a /login.
   */
  logout(): void {
    if (this.loggingOut) return;
    this.loggingOut = true;
    this.log.auth('Logout');
    this.clearSession();
    this.refreshing$ = null;
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    // Sesión válida = hay access token Y NO está expirado Y hay refresh token.
    // Si el access token expiró pero existe refresh token, la sesión sigue
    // considerada "activa" (el interceptor la renovará transparentemente).
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();
    if (!token || !refreshToken) return false;
    // Si el access expiró pero hay refresh, la sesión se considera vigente
    // porque el flujo de refresh la reactiva sin pedír credenciales.
    return true;
  }

  /** Sesión recordada / persistida en localStorage (no se pierde al cerrar). */
  hasPersistentSession(): boolean {
    return localStorage.getItem('token') !== null;
  }

  /** Indica si la sesión actual es persistente (localStorage). */
  isPersistent(): boolean {
    return localStorage.getItem('token') !== null;
  }

  getUser(): User | null {
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  getUserRole(): string | null {
    const user = this.getUser();
    return user?.rol ?? null;
  }

  isAdmin(): boolean {
    return this.getUserRole() !== 'Trabajador';
  }

  isWorker(): boolean {
    return this.getUserRole() === 'Trabajador';
  }

  getToken(): string | null {
    return localStorage.getItem('token') || sessionStorage.getItem('token');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
  }

  /**
   * Renovación transparente (RF-34): persiste el token renovado (y el refresh
   * si viene) en el mismo almacenamiento donde vive la sesión actual. Mantiene
   * la preferencia "Recordar sesión" elegida en el login.
   */
  refreshSession(newToken: string, newRefreshToken?: string): void {
    const store = this.getSessionStore();
    store.setItem('token', newToken);
    if (newRefreshToken) {
      store.setItem('refreshToken', newRefreshToken);
    }
    const user = this.getUser();
    if (user) {
      store.setItem('user', JSON.stringify(user));
    }
    this.log.auth('Token renovado');
  }

  /**
   * Renovación del access token usando el refresh token. Single-flight: si ya
   * hay un refresh en curso, devuelve el mismo Observable para que todas las
   * peticiones que lo necesiten esperen el mismo resultado. Si no hay refresh
   * token, falla inmediatamente (sin lanzar petición).
   */
  refreshToken(): Observable<string> {
    if (this.refreshing$) {
      return this.refreshing$;
    }

    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No hay refresh token'));
    }

    this.refreshing$ = this.api
      .post<{ token: string }>('/Auth/refresh', { refreshToken })
      .pipe(
        map(res => res.token),
        tap(newToken => this.refreshSession(newToken)),
        catchError(err => {
          this.log.auth('Fallo al renovar token', undefined, 'ERROR');
          return throwError(() => err);
        }),
        finalize(() => {
          this.refreshing$ = null;
        }),
        shareReplay({ bufferSize: 1, refCount: true })
      );

    return this.refreshing$;
  }

  /** Devuelve true si el access token actualYa está expirado (según su exp). */
  isTokenExpired(token: string | null = this.getToken()): boolean {
    if (!token) return true;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false;
      return payload.exp * 1000 <= Date.now();
    } catch {
      return true;
    }
  }

  /** Devuelve true si el access token está próximo a expirar (<5 min) y aún no expiró. */
  isTokenExpiringSoon(token: string | null = this.getToken()): boolean {
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload.exp) return false;
      const expiresIn = payload.exp * 1000 - Date.now();
      // Solo se considera "próximo a expirar" si todavía es válido pero le
      // quedan menos de 5 minutos. Si ya expiró (expiresIn <= 0) el flujo
      // reactivo de 401 (no el preventivo) se encarga.
      return expiresIn > 0 && expiresIn < 5 * 60 * 1000;
    } catch {
      return false;
    }
  }

  /**
   * Al arrancar la app (o reabrir): si el access expiró pero hay refresh token,
   * intenta renovar transparentemente. Devuelve true si la sesión quedó válida
   * (o ya lo era); false si debe ir a login.
   */
  restoreSession(): Observable<boolean> {
    const token = this.getToken();
    const refreshToken = this.getRefreshToken();

    if (!token || !refreshToken) {
      this.clearSession();
      return of(false);
    }

    if (!this.isTokenExpired(token)) {
      this.loggingOut = false;
      return of(true);
    }

    // Access expirado + refresh presente: intenta renovar.
    return this.refreshToken().pipe(
      switchMap(() => of(true)),
      catchError(() => {
        this.logout();
        return of(false);
      })
    );
  }

  private getSessionStore(): Storage {
    // Si ya existe token en localStorage (sesión persistente), se conserva ahí;
    // en caso contrario, sessionStorage (sesión temporal).
    return localStorage.getItem('token') !== null ? localStorage : sessionStorage;
  }

  private setSession(res: AuthResponse, remember: boolean): void {
    this.clearSession();
    const store = remember ? localStorage : sessionStorage;
    store.setItem('token', res.token);
    store.setItem('refreshToken', res.refreshToken);
    store.setItem('user', JSON.stringify(res.trabajador));
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
  }
}

export { User } from '../core/models/user.model';
