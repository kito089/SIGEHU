import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IonicModule } from '@ionic/angular';
import { AuthService } from '../../../services/auth.service';
import { OfflineSyncService } from '../../../services/offline-sync.service';

@Component({
  selector: 'app-worker-header',
  standalone: true,
  imports: [CommonModule, IonicModule, RouterModule],
  template: `
    <ion-header class="ion-no-border sigehu-worker-header">
      <ion-toolbar color="dark">
        <ion-title slot="start" class="brand-title">
          <span class="logo-accent">SIGEHU</span>
          <span class="brand-sub">Campo</span>
        </ion-title>
        
        <div slot="end" class="header-actions">
          <ion-chip [color]="offlineSync.online ? 'success' : 'warning'" class="sync-chip">
            <ion-icon [name]="offlineSync.online ? 'wifi-outline' : 'cloud-offline-outline'"></ion-icon>
            <ion-label>{{ offlineSync.online ? 'En línea' : 'Sin conexión' }}</ion-label>
          </ion-chip>
          
          <ion-button fill="clear" color="danger" (click)="logout()" title="Cerrar sesión">
            <ion-icon name="log-out-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </div>
      </ion-toolbar>

      <ion-toolbar color="dark" class="tabs-toolbar">
        <ion-segment scrollable [value]="currentRoute" (ionChange)="navigate($event)">
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

          <ion-segment-button value="/movil/ruta">
            <ion-icon name="navigate-outline"></ion-icon>
            <ion-label>Ruta / Kit</ion-label>
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
    .brand-title {
      font-size: 1.1rem;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .logo-accent {
      color: #3b82f6;
      margin-right: 4px;
    }
    .brand-sub {
      color: #94a3b8;
      font-weight: 400;
      font-size: 0.85rem;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-right: 8px;
    }
    .sync-chip {
      font-size: 0.75rem;
      height: 26px;
      margin: 0;
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
      min-width: 80px;
    }
    ion-segment-button ion-icon {
      font-size: 1.1rem;
      margin-bottom: 2px;
    }
  `]
})
export class WorkerHeaderComponent {
  private router = inject(Router);
  private authService = inject(AuthService);
  public offlineSync = inject(OfflineSyncService);

  get currentRoute(): string {
    return this.router.url;
  }

  navigate(event: CustomEvent): void {
    const route = event.detail.value;
    if (route && route !== this.router.url) {
      this.router.navigateByUrl(route);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
