import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
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

  login(credentials: LoginCredentials, remember = false): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/Trabajadores/login', credentials).pipe(
      tap(res => {
        this.setSession(res, remember);
        // Nunca se registran credenciales; solo el evento y el rol.
        this.log.auth('Login exitoso', { remember });
        this.log.auth('Rol de sesión', { rol: res.trabajador?.rol });
      })
    );
  }

  logout(): void {
    this.log.auth('Logout');
    this.clearSession();
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    return !!(localStorage.getItem('token') || sessionStorage.getItem('token'));
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

  // Renovación transparente (RF-34): persiste el token renovado y el usuario en
  // el mismo almacenamiento donde vive la sesión actual (localStorage si se marcó
  // "Recordar sesión", sessionStorage en caso contrario).
  refreshSession(newToken: string): void {
    const store = this.getSessionStore();
    store.setItem('token', newToken);
    const user = this.getUser();
    if (user) {
      store.setItem('user', JSON.stringify(user));
    }
    this.log.auth('Token renovado');
  }

  private getSessionStore(): Storage {
    return localStorage.getItem('token') !== null ? localStorage : sessionStorage;
  }

  private setSession(res: AuthResponse, remember: boolean): void {
    this.clearSession();
    const store = remember ? localStorage : sessionStorage;
    store.setItem('token', res.token);
    store.setItem('user', JSON.stringify(res.trabajador));
  }

  private clearSession(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }
}

export { User } from '../core/models/user.model';