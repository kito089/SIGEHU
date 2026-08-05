import { Component, Input, Output, EventEmitter, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ButtonComponent } from '../button/button.component';
import { FocusTrapDirective } from '../../directives/focus-trap.directive';

export type ConfirmModalVariant = 'default' | 'danger';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule, IonicModule, ButtonComponent, FocusTrapDirective],
  templateUrl: './confirm-modal.component.html',
  styleUrls: ['./confirm-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmModalComponent {
  @Input() variant: ConfirmModalVariant = 'default';
  @Input() title = 'Confirmar acción';
  @Input() message = '¿Está seguro de continuar?';
  @Input() confirmLabel = 'Confirmar';
  @Input() cancelLabel = 'Cancelar';
  @Input() loading = false;
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.loading) this.cancelled.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal__backdrop') && !this.loading) {
      this.cancelled.emit();
    }
  }
}