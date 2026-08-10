import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../../services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';
import { SidebarIconRegistry } from '../layout/sidebar/sidebar-icon-registry.service';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';

/* =========================================================================
   SIGEHU — Botón Logout reutilizable (icono + confirmación + cierre sesión).

   - Solo icono (sin texto), accesible vía aria-label.
   - Reutiliza el registro de iconos SVG inline del proyecto (sin librerías
     nuevas) y los tokens de diseño existentes.
   - Reutiliza app-confirm-modal para la confirmación irreversible.
   - Reutiliza AuthService.logout() (única fuente de logout del sistema).
   - Detiene explícitamente NotificationService (SSE) antes de cerrar sesión.
   ========================================================================= */

@Component({
  selector: 'app-logout-button',
  standalone: true,
  imports: [CommonModule, ConfirmModalComponent],
  templateUrl: './logout-button.component.html',
  styleUrl: './logout-button.component.scss'
})
export class LogoutButtonComponent {
  private auth = inject(AuthService);
  private notifications = inject(NotificationService);
  private sanitizer = inject(DomSanitizer);
  private icons = inject(SidebarIconRegistry);

  confirmAbierto = signal(false);
  cerrando = signal(false);

  getIconSvg(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.icons.get('logout'));
  }

  abrirConfirmacion(): void {
    this.confirmAbierto.set(true);
  }

  cancelar(): void {
    if (this.cerrando()) return;
    this.confirmAbierto.set(false);
  }

  confirmar(): void {
    if (this.cerrando()) return;
    this.cerrando.set(true);
    this.notifications.stop();
    this.auth.logout();
  }
}
