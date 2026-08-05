import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class WorkerGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);


  canActivate(): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    // RF-36: Propietario en móvil tiene acceso total
    if (this.auth.isAdmin()) return true;
    if (this.auth.isWorker()) return true;

    this.router.navigate(['/login']);
    return false;
  }
}