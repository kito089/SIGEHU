import { Injectable, inject } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  private auth = inject(AuthService);
  private router = inject(Router);


  canActivate(): boolean {
    if (!this.auth.isLoggedIn()) {
      this.router.navigate(['/login']);
      return false;
    }

    if (this.auth.isWorker()) {
      this.router.navigate(['/worker']);
      return false;
    }

    return true;
  }
}