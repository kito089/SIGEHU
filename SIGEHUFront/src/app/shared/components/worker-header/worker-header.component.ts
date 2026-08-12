import { Component, inject, signal, HostListener, ViewChild, ElementRef, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { OfflineSyncService } from '../../../services/offline-sync.service';
import { WorkerLayoutService } from '../../../core/services/worker-layout.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationsPanelComponent } from '../notifications/notifications-panel.component';

/* =========================================================================
   SIGEHU — Header móvil de Trabajadores (Ionic).

   Contiene: ícono de la app, título dinámico de página (WorkerLayoutService),
   estado de conectividad, centro de notificaciones con contador y el botón de
   cerrar sesión. Debajo, una barra de pestañas (segment) navega entre las
   secciones del campo: Actividades, Levantamiento, Fabricación, Compras,
   Instalación y Garantías.
   ========================================================================= */

@Component({
  selector: 'app-worker-header',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule, NotificationsPanelComponent],
  template: `
    <ion-header class="ion-no-border sigehu-worker-header">
      <ion-toolbar color="dark" class="main-toolbar">
        <div slot="start" class="brand-wrap">
          <img src="assets/icon/icon.png" alt="SIGEHU" class="brand-logo" />
          <div class="brand-titles">
            <span class="brand-title">{{ pageTitle() || 'SIGEHU Campo' }}</span>
            <span class="brand-sub">{{ pageSubtitle() }}</span>
          </div>
        </div>

        <div slot="end" class="header-actions">
          <ion-chip [color]="offlineSync.online ? 'success' : 'warning'" class="sync-chip">
            <ion-icon [name]="offlineSync.online ? 'wifi-outline' : 'cloud-offline-outline'"></ion-icon>
            <ion-label>{{ offlineSync.online ? 'En línea' : 'Sin conexión' }}</ion-label>
          </ion-chip>

          <div class="notif-wrap" #notifWrapper>
            <ion-button fill="clear" class="notif-btn" (click)="toggleNotifications()" aria-label="Notificaciones">
              <ion-icon name="notifications-outline" slot="icon-only"></ion-icon>
              @if (notificationCount() > 0) {
                <span class="notif-badge">{{ notificationCount() }}</span>
              }
            </ion-button>

            @if (panelAbierto()) {
              <app-notifications-panel (closeClick)="panelAbierto.set(false)"></app-notifications-panel>
            }
          </div>

          <ion-button fill="clear" color="danger" (click)="logout()" title="Cerrar sesión" aria-label="Cerrar sesión">
            <ion-icon name="log-out-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </div>
      </ion-toolbar>

      <ion-toolbar color="dark" class="tabs-toolbar">
        <ion-segment scrollable [value]="currentRoute" (ionChange)="navigate($event)">
          <ion-segment-button value="/movil/actividades">
            <ion-icon name="list-outline"></ion-icon>
            <ion-label>Actividades</ion-label>
          </ion-segment-button>

          <ion-segment-button value="/movil/levantamientos">
            <ion-icon name="resize-outline"></ion-icon>
            <ion-label>Levantamiento</ion-label>
          </ion-segment-button>

          <ion-segment-button value="/movil/fabricacion">
            <ion-icon name="construct-outline"></ion-icon>
            <ion-label>Fabricación</ion-label>
          </ion-segment-button>

          <ion-segment-button value="/movil/compras">
            <ion-icon name="cart-outline"></ion-icon>
            <ion-label>Compras</ion-label>
          </ion-segment-button>

          <ion-segment-button value="/movil/instalacion">
            <ion-icon name="navigate-outline"></ion-icon>
            <ion-label>Instalación</ion-label>
          </ion-segment-button>

          <ion-segment-button value="/movil/garantias">
            <ion-icon name="shield-checkmark-outline"></ion-icon>
            <ion-label>Garantías</ion-label>
          </ion-segment-button>
        </ion-segment>
      </ion-toolbar>
    </ion-header>
  `,
  styles: [`
    .sigehu-worker-header {
      --background: #0f172a;
      border-bottom: 1px solid #334155;
    }
    .main-toolbar {
      --min-height: 52px;
      padding-top: env(safe-area-inset-top);
    }
    .brand-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      padding-left: 8px;
      min-width: 0;
    }
    .brand-logo {
      width: 30px;
      height: 30px;
      object-fit: contain;
      border-radius: 6px;
      flex-shrink: 0;
    }
    .brand-titles {
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 0;
    }
    .brand-title {
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      color: #f8fafc;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
    }
    .brand-sub {
      font-size: 0.68rem;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 150px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 4px;
      padding-right: 6px;
    }
    .sync-chip {
      font-size: 0.72rem;
      height: 26px;
      margin: 0;
    }
    .notif-wrap {
      position: relative;
      display: flex;
      align-items: center;
    }
    .notif-btn {
      --padding-start: 6px;
      --padding-end: 6px;
      --min-width: 44px;
      position: relative;
      margin: 0;
      color: #94a3b8;
    }
    .notif-badge {
      position: absolute;
      top: 2px;
      right: 2px;
      min-width: 16px;
      height: 16px;
      padding: 0 4px;
      border-radius: 999px;
      background: #ef4444;
      color: #ffffff;
      font-size: 0.62rem;
      font-weight: 700;
      line-height: 16px;
      text-align: center;
      z-index: 2;
    }
    .tabs-toolbar {
      --padding-start: 0;
      --padding-end: 0;
      --min-height: 44px;
      border-top: 1px solid #1e293b;
    }
    ion-segment {
      --background: #0f172a;
    }
    ion-segment-button {
      --color: #94a3b8;
      --color-checked: #3b82f6;
      --indicator-color: #3b82f6;
      font-size: 0.75rem;
      min-width: 82px;
    }
    ion-segment-button ion-icon {
      font-size: 1.1rem;
      margin-bottom: 2px;
    }
  `]
})
export class WorkerHeaderComponent implements OnInit, OnDestroy {
  private router = inject(Router);
  private authService = inject(AuthService);
  private layout = inject(WorkerLayoutService);
  private notificationService = inject(NotificationService);
  public offlineSync = inject(OfflineSyncService);

  readonly pageTitle = signal<string>('');
  readonly pageSubtitle = signal<string>('');
  readonly notificationCount = signal(0);
  readonly panelAbierto = signal(false);

  @ViewChild('notifWrapper', { read: ElementRef }) notifWrapper?: ElementRef<HTMLElement>;

  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.subs.push(
      this.layout.pageTitle$.subscribe(title => this.pageTitle.set(title || 'SIGEHU Campo')),
      this.layout.actions$.subscribe(() => {
        // placeholder para futuras acciones de contexto en el header
      }),
      this.notificationService.notifications$.subscribe(list => this.notificationCount.set(list.length))
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get currentRoute(): string {
    return this.router.url;
  }

  navigate(event: CustomEvent): void {
    const route = event.detail.value;
    if (route && route !== this.router.url) {
      this.router.navigateByUrl(route);
    }
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

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
