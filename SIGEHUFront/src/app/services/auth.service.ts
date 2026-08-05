import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { User, AuthResponse, LoginCredentials } from '../core/models/user.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);


  login(credentials: LoginCredentials, remember = false): Observable<AuthResponse> {
    return this.api.post<AuthResponse>('/Trabajadores/login', credentials).pipe(
      tap(res => {
        this.setSession(res, remember);
      })
    );
  }

  logout(): void {
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