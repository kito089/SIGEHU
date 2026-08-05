import { Component, input, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export type KpiVariant = 'primary' | 'secondary';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss'
})
export class KpiCardComponent {
  private sanitizer = inject(DomSanitizer);

  // Inputs requeridos
  value = input.required<string | number>();
  label = input.required<string>();
  iconSvg = input.required<string>();
  iconBgColor = input.required<string>();
  iconColor = input.required<string>();

  // Variante: 'primary' (ancha 40-45%) o 'secondary' (normal)
  variant = input<KpiVariant>('secondary');

  // Badge opcional
  badgeText = input<string>('');
  badgeColor = input<'success' | 'warning' | 'info'>('info');

  get badgeClass(): string {
    return `kpi-badge--${this.badgeColor()}`;
  }

  get containerClass(): string {
    return `kpi-card kpi-card--${this.variant()}`;
  }

  get safeIconSvg(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.iconSvg());
  }
}