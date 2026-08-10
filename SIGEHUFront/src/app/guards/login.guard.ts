import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class LoginGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);

  canActivate(): boolean {
    if (!this.auth.isLoggedIn()) return true;

    // Sesión válida restaurada (recordada o vigente): se redirige al home
    // correspondiente en lugar de mostrar el formulario de Login.
    const user = this.auth.getUser();
    if (user?.rol === 'Trabajador') {
      this.router.navigate(['/worker']);
    } else {
      this.router.navigate(['/admin/dashboard']);
    }
    return false;
  }
}