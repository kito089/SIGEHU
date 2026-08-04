import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LoginCredentials } from '../../models/user.model';

/* =========================================================================
   SIGEHU — Login (componente Angular standalone)
   Funciona igual en web (ng serve) y empaquetado como app (Ionic/Capacitor),
   ya que solo usa HTML/Angular estándar, sin dependencias de plataforma.

   Conexión al backend: AuthService -> POST /Trabajadores/login
   Ruteo basado en roles: Trabajador -> /worker, resto -> /admin/dashboard
   ========================================================================= */

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

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private auth: AuthService,
    private toast: ToastService
  ) {
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

  forgotPasswordMessage() {
    alert('Comunicarse con el administrador para cambiar la contraseña');
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

    const credentials: LoginCredentials = {
      Usuario: usuario,
      Contra: contrasena,
    };

    this.auth.login(credentials, recordarSesion).subscribe({
      next: () => {
        const user = this.auth.getUser();
        if (user?.rol === 'Trabajador') {
          this.router.navigate(['/worker']);
        } else {
          this.router.navigate(['/admin/dashboard']);
        }
        this.loading = false;
      },
      error: (e) => {
        const message = e?.error?.error || 'Usuario o contraseña incorrectos.';
        this.errorMessage = message;
        this.toast.error(message);
        this.loading = false;
      },
    });
  }
}