import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LoginCredentials } from '../../core/models/user.model';
import { InputComponent } from '../../shared/components/input/input.component';
import { ButtonComponent } from '../../shared/components/button/button.component';

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
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  form: FormGroup;

  loading = signal(false);
  errorMessage = signal('');
  showForgotMessage = signal(false);

  get usuarioCtrl() {
    return this.form.get('usuario');
  }

  get contrasenaCtrl() {
    return this.form.get('contrasena');
  }

  constructor() {
    this.form = this.fb.group({
      usuario: ['', [Validators.required, Validators.minLength(3)]],
      contrasena: ['', [Validators.required, Validators.minLength(4)]],
      recordarSesion: [false],
    });
  }

  onForgotPassword(): void {
    this.errorMessage.set('');
    this.showForgotMessage.set(true);
  }

  forgotPasswordMessage(): void {
    alert('Comunicarse con el administrador para cambiar la contraseña');
  }

  onSubmit(): void {
    this.errorMessage.set('');
    this.showForgotMessage.set(false);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const { usuario, contrasena, recordarSesion } = this.form.getRawValue();

    const credentials: LoginCredentials = {
      Usuario: usuario,
      Contra: contrasena,
    };

    this.auth
      .login(credentials, recordarSesion)
      .pipe(
        finalize(() => this.loading.set(false))
      )
      .subscribe({
        next: () => {
          const user = this.auth.getUser();
          if (user?.rol === 'Trabajador') {
            this.router.navigate(['/worker']);
          } else {
            this.router.navigate(['/admin/dashboard']);
          }
        },
        error: (e) => {
          const message = e?.error?.error || 'Usuario o contraseña incorrectos.';
          this.errorMessage.set(message);
          this.toast.error(message);
        },
      });
  }
}