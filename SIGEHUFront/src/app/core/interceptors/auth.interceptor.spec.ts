import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { runInInjectionContext, Injector } from '@angular/core';
import { of, throwError, Observable } from 'rxjs';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { LogService } from '../services/log.service';

const NOW = Math.floor(Date.now() / 1000);
const VALID_TOKEN = `0.${btoa(JSON.stringify({ exp: NOW + 3600, idTrabajador: 1, rol: 'Propietario' }))}.0`;
const EXPIRED_TOKEN = `0.${btoa(JSON.stringify({ exp: NOW - 60, idTrabajador: 1, rol: 'Propietario' }))}.0`;
const REFRESH_TOKEN = `0.${btoa(JSON.stringify({ exp: NOW + 30 * 24 * 3600, idTrabajador: 1, rol: 'Propietario' }))}.0`;

function clearStorage(): void {
  localStorage.clear();
  sessionStorage.clear();
}

describe('authInterceptor (refresh reactivo + single-flight + anti-loop)', () => {
  let auth: AuthService;
  let httpMock: HttpTestingController;
  let navigateSpy: jasmine.Spy;

  beforeEach(() => {
    clearStorage();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        ApiService,
        LogService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([
          { path: 'login', component: class LoginComponentStub {} },
          { path: '**', component: class AnyComponentStub {} }
        ])
      ]
    });
    auth = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    httpMock.verify();
    clearStorage();
  });

  // El `next` fake devuelve un Observable (200) o throwError (>= 400); el tipo
  // subyacente HttpEvent es lo bastante flexible para los specs.
  const runInterceptor = (
    req: HttpRequest<unknown>,
    next: () => Observable<unknown>
  ): Observable<unknown> => runInInjectionContext(TestBed.inject(Injector), () => authInterceptor(req, () => next() as any));

  // ---- Prueba B: access token valido -> request 200 -> sin refresh ----
  it('Prueba B: access token válido no dispara refresh', () => {
    localStorage.setItem('token', VALID_TOKEN);
    localStorage.setItem('refreshToken', REFRESH_TOKEN);

    const req = new HttpRequest('GET', 'http://localhost:3000/Dashboard');
    let nextCalled = false;
    runInterceptor(req, () => {
      nextCalled = true;
      return of(new HttpResponse({ body: { ok: true } }));
    }).subscribe();

    expect(nextCalled).toBeTrue();
    expect(navigateSpy).not.toHaveBeenCalled();
    // No se hizo ninguna petición de refresh.
    httpMock.expectNone('http://localhost:3000/Auth/refresh');
  });

  // ---- Prueba B2: 401 + refresh exitoso -> reintento con nuevo token, sin logout ----
  it('Prueba B2: 401 de petición normal -> refresh exitoso -> reintento, sin logout', fakeAsync(() => {
    localStorage.setItem('token', EXPIRED_TOKEN); // access expirado
    localStorage.setItem('refreshToken', REFRESH_TOKEN);

    const req = new HttpRequest('GET', 'http://localhost:3000/Dashboard');
    let attempts = 0;
    runInterceptor(req, () => {
      attempts++;
      if (attempts === 1) {
        return throwError(() => new HttpErrorResponse({ status: 401, url: req.url }));
      }
      return of(new HttpResponse({ body: { ok: true } }));
    }).subscribe();

    tick();
    // El interceptor llamó a /Auth/refresh. Le respondemos con un nuevo token.
    const refreshReq = httpMock.expectOne('http://localhost:3000/Auth/refresh');
    expect(refreshReq.request.body).toEqual({ refreshToken: REFRESH_TOKEN });
    refreshReq.flush({ token: VALID_TOKEN });
    tick();

    // Se reintentó la petición original una segunda vez.
    expect(attempts).toBe(2);
    // El nuevo access token está persistido.
    expect(localStorage.getItem('token')).toBe(VALID_TOKEN);
    // No se hizo logout.
    expect(navigateSpy).not.toHaveBeenCalled();
    flush();
  }));

  // ---- Prueba C: 401 + refresh fallido -> logout único, sin ciclo ----
  it('Prueba C: 401 + refresh rechazado -> logout (navigate) una sola vez', fakeAsync(() => {
    localStorage.setItem('token', EXPIRED_TOKEN);
    localStorage.setItem('refreshToken', REFRESH_TOKEN);

    const req = new HttpRequest('GET', 'http://localhost:3000/Dashboard');
    let errored = false;
    runInterceptor(req, () =>
      throwError(() => new HttpErrorResponse({ status: 401, url: req.url }))
    ).subscribe({ error: () => (errored = true) });

    tick();
    const refreshReq = httpMock.expectOne('http://localhost:3000/Auth/refresh');
    refreshReq.flush({ error: 'Refresh token expirado' }, { status: 401, statusText: 'Unauthorized' });
    tick();

    expect(errored).toBeTrue();
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy.calls.mostRecent().args[0]).toEqual(['/login']);
    flush();
  }));

  // ---- Prueba D: múltiples 401 simultáneos -> un único refresh (single-flight) ----
  it('Prueba D: varios 401 simultáneos disparan UN solo refresh (single-flight)', fakeAsync(() => {
    localStorage.setItem('token', EXPIRED_TOKEN);
    localStorage.setItem('refreshToken', REFRESH_TOKEN);

    const fail401 = () =>
      throwError(() => new HttpErrorResponse({ status: 401, url: 'http://localhost:3000/Dashboard' }));

    runInterceptor(new HttpRequest('GET', 'http://localhost:3000/Dashboard'), fail401).subscribe({ error: () => {} });
    runInterceptor(new HttpRequest('GET', 'http://localhost:3000/Obras'), fail401).subscribe({ error: () => {} });
    runInterceptor(new HttpRequest('GET', 'http://localhost:3000/Clientes'), fail401).subscribe({ error: () => {} });
    tick();

    const refreshReqs = httpMock.match('http://localhost:3000/Auth/refresh');
    expect(refreshReqs.length).toBe(1);
    flush();
  }));

  // ---- Prueba E: /Auth/refresh no se intercepta (anti-recursión) ----
  it('Prueba E: petición a /Auth/refresh no provoca refresh recursivo', () => {
    localStorage.setItem('token', EXPIRED_TOKEN);
    localStorage.setItem('refreshToken', REFRESH_TOKEN);

    const refreshReq = new HttpRequest('POST', 'http://localhost:3000/Auth/refresh', { refreshToken: REFRESH_TOKEN });
    let nextCalled = false;
    runInterceptor(refreshReq, () => {
      nextCalled = true;
      return of(new HttpResponse({ body: { token: VALID_TOKEN } }));
    }).subscribe();

    // El handler se llamó directamente (sin intentar refresh).
    expect(nextCalled).toBeTrue();
    expect(navigateSpy).not.toHaveBeenCalled();
    httpMock.expectNone('http://localhost:3000/Auth/refresh');
  });

  // ---- Prueba extra: sin refresh token + 401 -> logout directo, sin petición ----
  it('401 sin refresh token almacenado -> logout directo sin pedir refresh', fakeAsync(() => {
    localStorage.setItem('token', EXPIRED_TOKEN);
    // NO se guarda refreshToken.

    const req = new HttpRequest('GET', 'http://localhost:3000/Dashboard');
    let errored = false;
    runInterceptor(req, () =>
      throwError(() => new HttpErrorResponse({ status: 401, url: req.url }))
    ).subscribe({ error: () => (errored = true) });
    tick();

    expect(errored).toBeTrue();
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    httpMock.expectNone('http://localhost:3000/Auth/refresh');
    flush();
  }));
});
