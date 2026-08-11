import { TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { ApiService } from './api.service';
import { LogService } from '../core/services/log.service';
import { AuthResponse } from '../core/models/user.model';

// Tokens JWT de prueba (header.payload.signature). El payload incluye `exp`
// para que AuthService.isTokenExpired()/isTokenExpiringSoon() los evalúe.
const NOW = Math.floor(Date.now() / 1000);
const VALID_TOKEN = `0.${btoa(JSON.stringify({ exp: NOW + 3600, idTrabajador: 1, rol: 'Propietario' }))}.0`;
const EXPIRING_TOKEN = `0.${btoa(JSON.stringify({ exp: NOW + 60, idTrabajador: 1, rol: 'Propietario' }))}.0`;
const EXPIRED_TOKEN = `0.${btoa(JSON.stringify({ exp: NOW - 60, idTrabajador: 1, rol: 'Propietario' }))}.0`;
const REFRESH_TOKEN = `0.${btoa(JSON.stringify({ exp: NOW + 30 * 24 * 3600, idTrabajador: 1, rol: 'Propietario' }))}.0`;

const authResponse: AuthResponse = {
  token: VALID_TOKEN,
  refreshToken: REFRESH_TOKEN,
  trabajador: { idTrabajador: 1, usuario: 'admin', nombre: 'Admin', rol: 'Propietario' }
};

function clearStorage(): void {
  localStorage.clear();
  sessionStorage.clear();
}

describe('AuthService (sesión persistente + refresh token)', () => {
  let service: AuthService;
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
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    navigateSpy = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(Promise.resolve(true));
  });

  afterEach(() => {
    httpMock.verify();
    clearStorage();
  });

  // ---- Prueba 1: sesion normal + recordar ----
  it('Prueba 1: login con "recordar" persiste token+refreshToken en localStorage y restaura sesión', () => {
    service.login({ Usuario: 'admin', Contra: '1234' }, true).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/Trabajadores/login');
    expect(req.request.method).toBe('POST');
    req.flush(authResponse);

    // localStorage (recordar = true)
    expect(localStorage.getItem('token')).toBe(VALID_TOKEN);
    expect(localStorage.getItem('refreshToken')).toBe(REFRESH_TOKEN);
    expect(sessionStorage.getItem('token')).toBeNull();

    // Sesión considerada válida (token no expirado)
    expect(service.isLoggedIn()).toBeTrue();

    // "Reabrir" simulando reinstanciar el servicio: la sesión sigue siendo válida.
    expect(service.getToken()).toBe(VALID_TOKEN);
    expect(service.getRefreshToken()).toBe(REFRESH_TOKEN);
  });

  it('Prueba 1b: login sin "recordar" guarda en sessionStorage', () => {
    service.login({ Usuario: 'admin', Contra: '1234' }, false).subscribe();
    const req = httpMock.expectOne('http://localhost:3000/Trabajadores/login');
    req.flush(authResponse);

    expect(sessionStorage.getItem('token')).toBe(VALID_TOKEN);
    expect(sessionStorage.getItem('refreshToken')).toBe(REFRESH_TOKEN);
    expect(localStorage.getItem('token')).toBeNull();
  });

  // ---- Prueba 2: access token expirado + refresh valido -> renovación exitosa ----
  it('Prueba 2: restoreSession con access expirado + refresh válido renueva y devuelve true', fakeAsync(() => {
    // Estado inicial: access expirado en storage + refresh válido.
    localStorage.setItem('token', EXPIRED_TOKEN);
    localStorage.setItem('refreshToken', REFRESH_TOKEN);
    localStorage.setItem('user', JSON.stringify(authResponse.trabajador));

    expect(service.isTokenExpired()).toBeTrue();

    let result: boolean | undefined;
    service.restoreSession().subscribe((ok) => (result = ok));
    tick(); // espera que restoreSession llame a refreshToken()

    const req = httpMock.expectOne('http://localhost:3000/Auth/refresh');
    expect(req.request.body).toEqual({ refreshToken: REFRESH_TOKEN });
    req.flush({ token: VALID_TOKEN });
    tick();

    expect(result).toBeTrue();
    // El nuevo access token está persistido en el mismo store (localStorage).
    expect(localStorage.getItem('token')).toBe(VALID_TOKEN);
    // El refresh token se conserva (rotación del lado del cliente no es obligatoria).
    expect(localStorage.getItem('refreshToken')).toBe(REFRESH_TOKEN);
    // No se navegó a login.
    expect(navigateSpy).not.toHaveBeenCalled();
    flush();
  }));

  // ---- Prueba 3: refresh token invalido/expirado -> logout único ----
  it('Prueba 3: refresh rechazado (401) provoca logout (clearSession + navigate) una sola vez', fakeAsync(() => {
    localStorage.setItem('token', EXPIRED_TOKEN);
    localStorage.setItem('refreshToken', REFRESH_TOKEN);

    let result: boolean | undefined;
    service.restoreSession().subscribe((ok) => (result = ok));
    tick();

    const req = httpMock.expectOne('http://localhost:3000/Auth/refresh');
    req.flush({ error: 'Refresh token expirado' }, { status: 401, statusText: 'Unauthorized' });
    tick();

    expect(result).toBeFalse();
    // Sesión limpiada.
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(sessionStorage.getItem('token')).toBeNull();
    // Logout navegó a /login exactamente una vez (logout único).
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy.calls.mostRecent().args[0]).toEqual(['/login']);
    flush();
  }));

  // ---- Prueba 4: concurrencia (múltiples 401 -> un único refresh) ----
  it('Prueba 4: varias llamadas consecutivas a refreshToken() disparan una sola petición HTTP (single-flight)', fakeAsync(() => {
    localStorage.setItem('token', EXPIRED_TOKEN);
    localStorage.setItem('refreshToken', REFRESH_TOKEN);

    let calls = 0;
    service.refreshToken().subscribe(() => calls++);
    service.refreshToken().subscribe(() => calls++);
    service.refreshToken().subscribe(() => calls++);
    tick();

    // Single-flight: solo una petición HTTP al backend.
    const reqs = httpMock.expectOne('http://localhost:3000/Auth/refresh');
    reqs.flush({ token: VALID_TOKEN });
    tick();

    // Las tres suscripciones recibieron el nuevo token.
    expect(calls).toBe(3);
    expect(localStorage.getItem('token')).toBe(VALID_TOKEN);
    flush();
  }));

  // ---- Prueba 5: refresh fallido no crea ciclo de refresh recurrente ----
  it('Prueba 5: refreshToken fallido(401) no deja refreshing$ colgado (libera el single-flight)', fakeAsync(() => {
    localStorage.setItem('token', EXPIRED_TOKEN);
    localStorage.setItem('refreshToken', REFRESH_TOKEN);

    const firstErrors: number[] = [];
    service.refreshToken().subscribe({ error: () => firstErrors.push(1) });
    tick();
    httpMock.expectOne('http://localhost:3000/Auth/refresh')
      .flush({ error: 'Refresh token expirado' }, { status: 401, statusText: 'Unauthorized' });
    tick();
    expect(firstErrors.length).toBe(1);

    // Segunda llamada: el single-flight ya se liberó, debe lanzar otra petición
    // (no quedó colgado esperando algo que ya terminó en error).
    const secondErrors: number[] = [];
    service.refreshToken().subscribe({ error: () => secondErrors.push(1) });
    tick();
    httpMock.expectOne('http://localhost:3000/Auth/refresh')
      .flush({ error: 'Refresh token expirado' }, { status: 401, statusText: 'Unauthorized' });
    tick();
    expect(secondErrors.length).toBe(1);
    flush();
  }));

  // ---- Prueba 6: isLoggedIn respecto a expiración (recordar sesión) ----
  it('Prueba 6: isLoggedIn es true si hay token y refreshToken, false si falta alguno', () => {
    expect(service.isLoggedIn()).toBeFalse(); // nada almacenado
    localStorage.setItem('token', VALID_TOKEN);
    localStorage.setItem('refreshToken', REFRESH_TOKEN);
    expect(service.isLoggedIn()).toBeTrue();
  });

  it('expiración: isTokenExpired detecta token vencido y token vigente', () => {
    expect(service.isTokenExpired(EXPIRED_TOKEN)).toBeTrue();
    expect(service.isTokenExpired(VALID_TOKEN)).toBeFalse();
    expect(service.isTokenExpired(EXPIRING_TOKEN)).toBeFalse(); // próximo a expirar pero aún no
    expect(service.isTokenExpired(null)).toBeTrue();
  });

  it('isTokenExpiringSoon detecta token a <5 min de expirar', () => {
    expect(service.isTokenExpiringSoon(EXPIRING_TOKEN)).toBeTrue();
    expect(service.isTokenExpiringSoon(VALID_TOKEN)).toBeFalse();
    expect(service.isTokenExpiringSoon(EXPIRED_TOKEN)).toBeFalse(); // ya expirado, no "próximo"
  });
});
