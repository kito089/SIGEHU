import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// import { Router } from '@angular/router';
// import { AuthService } from '../../services/auth.service';

/* =========================================================================
   SIGEHU — Login (componente Angular standalone)
   Funciona igual en web (ng serve) y empaquetado como app (Ionic/Capacitor),
   ya que solo usa HTML/Angular estándar, sin dependencias de plataforma.

   Conexión al backend: reemplaza fakeLogin() por tu llamada real, p. ej.:

   constructor(private fb: FormBuilder, private authService: AuthService, private router: Router) {}

   private loginRequest(usuario: string, contrasena: string) {
     return firstValueFrom(this.authService.login(usuario, contrasena));
   }
   ========================================================================= */

interface LoginResponse {
  token: string;
  usuario: {
    id: number;
    nombre: string;
    rol: 'admin' | 'trabajador';
  };
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent {
  form: FormGroup;

  showPassword = false;
  loading = false;
  errorMessage = '';
  showForgotMessage = false;

  constructor(private fb: FormBuilder /*, private authService: AuthService, private router: Router */) {
    this.form = this.fb.group({
      usuario: ['', [Validators.required, Validators.minLength(3)]],
      contrasena: ['', [Validators.required, Validators.minLength(4)]],
      recordarSesion: [false],
    });
  }

  get usuarioCtrl() {
    return this.form.get('usuario');
  }

  get contrasenaCtrl() {
    return this.form.get('contrasena');
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onForgotPassword(): void {
    this.errorMessage = '';
    this.showForgotMessage = true;
  }

  async onSubmit(): Promise<void> {
    this.errorMessage = '';
    this.showForgotMessage = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { usuario, contrasena, recordarSesion } = this.form.getRawValue();

    try {
      const response = await this.fakeLogin(usuario, contrasena);

      if (recordarSesion) {
        localStorage.setItem('sigehu_token', response.token);
      } else {
        sessionStorage.setItem('sigehu_token', response.token);
      }

      // this.router.navigate(['/dashboard']);
      console.log('Login correcto', response);
    } catch {
      this.errorMessage = 'Usuario o contraseña incorrectos.';
    } finally {
      this.loading = false;
    }
  }

  // ---------------------------------------------------------------------
  // Mock temporal — reemplázalo por la llamada real a POST /api/auth/login
  // Usuario de prueba: carlos.utrilla / 1234
  // ---------------------------------------------------------------------
  private fakeLogin(usuario: string, contrasena: string): Promise<LoginResponse> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (usuario === 'carlos.utrilla' && contrasena === '1234') {
          resolve({
            token: 'mock-token',
            usuario: { id: 1, nombre: 'Carlos Utrilla', rol: 'admin' },
          });
        } else {
          reject(new Error('Credenciales inválidas'));
        }
      }, 600);
    });
  }
}