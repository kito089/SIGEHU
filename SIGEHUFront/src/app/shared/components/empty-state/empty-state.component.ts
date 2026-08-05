import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ButtonComponent } from '../button/button.component';

export type EmptyStateSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, IonicModule, ButtonComponent],
  templateUrl: './empty-state.component.html',
  styleUrls: ['./empty-state.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class EmptyStateComponent {
  @Input() icon = 'cube-outline';
  @Input() title = 'No se encontraron registros';
  @Input() subtitle?: string;
  @Input() actionLabel?: string;
  @Input() size: EmptyStateSize = 'md';
  @Output() actionClick = new EventEmitter<void>();
}