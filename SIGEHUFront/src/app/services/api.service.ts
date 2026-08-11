import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EnvService } from './env.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private env = inject(EnvService);

  private baseUrl: string;

  constructor() {
    const env = this.env;

    this.baseUrl = env.getBaseUrl();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  get<T>(path: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}${path}`, {
      headers: this.getHeaders()
    }).pipe(catchError(e => this.handleError(e)));
  }

  // Descarga un recurso como Blob manteniendo el token de autenticación.
  // Se usa para mostrar imágenes guardadas como BLOB en el backend (el <img>
  // no puede enviar el header Authorization).
  getBlob(path: string): Observable<Blob> {
    return this.http.get(`${this.baseUrl}${path}`, {
      headers: this.getHeaders(),
      responseType: 'blob'
    }) as Observable<Blob>;
  }

  post<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.post<T>(`${this.baseUrl}${path}`, body, {
      headers: this.getHeaders()
    }).pipe(catchError(e => this.handleError(e)));
  }

  put<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}${path}`, body, {
      headers: this.getHeaders()
    }).pipe(catchError(e => this.handleError(e)));
  }

  patch<T>(path: string, body: unknown = {}): Observable<T> {
    return this.http.patch<T>(`${this.baseUrl}${path}`, body, {
      headers: this.getHeaders()
    }).pipe(catchError(e => this.handleError(e)));
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(`${this.baseUrl}${path}`, {
      headers: this.getHeaders()
    }).pipe(catchError(e => this.handleError(e)));
  }

  uploadFile<T>(path: string, formData: FormData): Observable<T> {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return this.http.post<T>(`${this.baseUrl}${path}`, formData, {
      headers
    }).pipe(catchError(e => this.handleError(e)));
  }

  private handleError(error: HttpErrorResponse): Observable<never> {
    // El 401 (sesión expirada/invalidada) lo gestiona el authInterceptor
    // (refresh reactivo o logout único central en AuthService). Aquí no se
    // toca el almacenamiento ni se navega para no competir con ese flujo.
    if (error.status === 403) {
      console.error('Acceso denegado - rol insuficiente');
    }
    return throwError(() => error);
  }
}