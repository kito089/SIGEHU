import { Component, input, output, signal, inject, HostListener, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsPanelComponent } from '../../notifications/notifications-panel.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SidebarIconRegistry } from '../sidebar/sidebar-icon-registry.service';
import { LogoutButtonComponent } from '../../logout-button/logout-button.component';
import { WorkerLayoutService } from '../../../../core/services/worker-layout.service';

/* =========================================================================
   SIGEHU — Header móvil (reemplaza la Topbar en viewport móvil).
   Reutiliza NotificationService y app-notifications-panel existentes.
   Título proviene del mismo origen (main-layout pageConfig) que la Topbar
   cuando se inyecta `pageTitle`; en el contexto de Trabajador (móvil de
   campo) el título proviene de WorkerLayoutService.

   Contextos soportados:
     - Administrador (main-layout): `[pageTitle]` + showNewWork (default true).
       "Agregar Obra" visible y emite `newWorkClick`.
     - Trabajador (pages MovilCampo): `[showNewWork]="false"` oculta el botón
       "Agregar Obra" y el título se toma de WorkerLayoutService.
   ========================================================================= */

@Component({
  selector: 'app-mobile-header',
  standalone: true,
  imports: [CommonModule, NotificationsPanelComponent, LogoutButtonComponent],
  templateUrl: './mobile-header.component.html',
  styleUrl: './mobile-header.component.scss'
})
export class MobileHeaderComponent implements OnInit {
  private notificationService = inject(NotificationService);
  private sanitizer = inject(DomSanitizer);
  private icons = inject(SidebarIconRegistry);
  private workerLayout = inject(WorkerLayoutService);

  pageTitle = input<string>('');
  showNewWork = input<boolean>(true);
  newWorkClick = output<void>();

  title = signal('SIGEHU');
  panelAbierto = signal(false);
  notificationCount = signal(0);

  @ViewChild('notifWrapper', { read: ElementRef }) notifWrapper?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    // Contexto Administrador: el título llega como input reactivo (pageTitle).
    // Contexto Trabajador: el título llega por WorkerLayoutService.
    this.workerLayout.pageTitle$.subscribe(title => {
      if (title) this.title.set(title);
    });
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

  icon(name: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.icons.get(name));
  }

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
