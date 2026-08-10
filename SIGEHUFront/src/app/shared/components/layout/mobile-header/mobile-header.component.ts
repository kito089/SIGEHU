import { Component, input, output, signal, inject, HostListener, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationsPanelComponent } from '../../notifications/notifications-panel.component';
import { NotificationService } from '../../../../core/services/notification.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { SidebarIconRegistry } from '../sidebar/sidebar-icon-registry.service';
import { LogoutButtonComponent } from '../../logout-button/logout-button.component';

/* =========================================================================
   SIGEHU — Header móvil (reemplaza la Topbar en viewport móvil).
   Reutiliza NotificationService y app-notifications-panel existentes.
   Título proviene del mismo origen (main-layout pageConfig) que la Topbar.
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

  pageTitle = input.required<string>();
  newWorkClick = output<void>();

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
