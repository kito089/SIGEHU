import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';
import { ToastComponent } from './toast.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [CommonModule, ToastComponent],
  template: `
    <div class="toast-container" *ngIf="(toastService.toasts$ | async)?.length">
      <app-toast
        *ngFor="let toast of toastService.toasts$ | async; trackBy: trackById"
        [toast]="toast"
        (dismissed)="toastService.dismiss($event)"
      ></app-toast>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: calc(var(--sigehu-topbar-height, 80px) + var(--sigehu-space-3, 12px));
      right: var(--sigehu-space-5, 20px);
      z-index: var(--z-toast);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      pointer-events: none;
      max-width: min(420px, calc(100vw - var(--sigehu-space-5, 20px) * 2));

      > * {
        pointer-events: auto;
      }
    }

    @media (max-width: 1024px) {
      .toast-container {
        top: calc(56px + env(safe-area-inset-top, 0px) + var(--sigehu-space-3, 12px));
        right: var(--sigehu-space-3, 12px);
        max-width: min(420px, calc(100vw - var(--sigehu-space-3, 12px) * 2));
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ToastContainerComponent {
  toastService = inject(ToastService);


  trackById(_: unknown, item: { id: number }): number {
    return item.id;
  }
}