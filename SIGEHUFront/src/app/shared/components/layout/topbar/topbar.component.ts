import { Component, input, output, signal, inject, HostListener, ViewChild, ElementRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OmniboxComponent } from '../../omnibox/omnibox.component';
import { NotificationsPanelComponent } from '../../notifications/notifications-panel.component';
import { NotificationService } from '../../../../core/services/notification.service';

/* =========================================================================
   SIGEHU — Topbar (barra superior Admin).

   Contiene: título de página, buscador global (omnibox), botón de
   notificaciones con el centro de notificaciones integrado y el botón
   "Nueva obra". El avatar de usuario se eliminó: la identidad ahora se
   muestra únicamente en el sidebar (usuario autenticado).
   ========================================================================= */

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, OmniboxComponent, NotificationsPanelComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent implements OnInit {
  private notificationService = inject(NotificationService);

  // Inputs
  pageTitle = input.required<string>();
  pageSubtitle = input<string>('');

  // Outputs
  newWorkClick = output<void>();

  // Estado local
  panelAbierto = signal(false);
  notificationCount = signal(0);

  @ViewChild('notifWrapper', { read: ElementRef }) notifWrapper?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.notificationService.notifications$.subscribe(list => {
      this.notificationCount.set(list.length);
    });
  }

  onNewWork(): void {
    this.newWorkClick.emit();
  }

  toggleNotifications(): void {
    this.panelAbierto.update(open => !open);
  }

  // Cierra el panel al hacer clic fuera del wrapper de notificaciones.
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.panelAbierto()) return;
    const target = event.target as HTMLElement | null;
    if (target && this.notifWrapper?.nativeElement.contains(target)) return;
    this.panelAbierto.set(false);
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(): void {
    this.panelAbierto.set(false);
  }
}
