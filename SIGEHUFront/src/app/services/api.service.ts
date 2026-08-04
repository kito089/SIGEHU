import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { EnvService } from './env.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl: string;

  constructor(
    private http: HttpClient,
    private env: EnvService,
    private router: Router
  ) {
    this.baseUrl = env.getBaseUrl();
  }

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
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
    if (error.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      this.router.navigate(['/login']);
    }
    if (error.status === 403) {
      console.error('Acceso denegado - rol insuficiente');
    }
    return throwError(() => error);
  }
}