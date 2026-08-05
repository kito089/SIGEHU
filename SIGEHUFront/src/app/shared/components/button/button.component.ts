import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

export type ButtonVariant = 'primary' | 'secondary' | 'icon' | 'danger' | 'ghost' | 'edit' | 'delete';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './button.component.html',
  styleUrls: ['./button.component.scss']
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() loading = false;
  @Input() disabled = false;
  @Input() fullWidth = false;
  @Input() icon?: string;
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() ariaLabel?: string;
  @Output() buttonClick = new EventEmitter<MouseEvent>();

  get hostClasses(): string {
    return [
      `btn--${this.variant}`,
      this.fullWidth ? 'btn--full' : '',
      this.loading ? 'btn--loading' : '',
      this.icon ? 'btn--with-icon' : ''
    ].filter(Boolean).join(' ');
  }
}