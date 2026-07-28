import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  constructor(http) {
    this.http = http;
    this.apiUrl = 'http://localhost:3000/api/auth'; // cambia según tu backend
  }

  login(loginData) {
    // loginData es tu objeto { usuario, contrasena, recordarSesion }
    return this.http.post(`${this.apiUrl}/login`, loginData);
  }

  logout() {
    return this.http.post(`${this.apiUrl}/logout`, {});
  }
}
