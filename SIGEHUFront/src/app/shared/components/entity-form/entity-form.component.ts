import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ButtonComponent } from '../button/button.component';

@Component({
  selector: 'app-entity-form',
  standalone: true,
  imports: [CommonModule, IonicModule, ButtonComponent],
  templateUrl: './entity-form.component.html',
  styleUrl: './entity-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EntityFormComponent {
  @Input() title = '';
  @Input() subtitle = '';
  @Input() loading = false;
  @Input() submitting = false;
  @Input() submitLabel = 'Guardar';
  @Input() cancelLabel = 'Cancelar';
  @Input() badgeText = '';

  @Output() submitRequested = new EventEmitter<void>();
  @Output() cancelRequested = new EventEmitter<void>();

  onCancel(): void {
    if (!this.submitting) {
      this.cancelRequested.emit();
    }
  }
}
