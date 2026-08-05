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
      top: var(--spacing-lg);
      right: var(--spacing-lg);
      z-index: var(--z-toast);
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
      pointer-events: none;

      > * {
        pointer-events: auto;
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