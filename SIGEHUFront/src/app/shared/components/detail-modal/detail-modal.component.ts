import { Component, Input, Output, EventEmitter, HostListener, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';

/* =========================================================================
   SIGEHU — Modal de Detalle (patrón "Ver Detalle" estándar).

   Estructura visual única para todas las vistas de detalle del sistema
   (referencia: módulo Trabajadores). Encapsulación desactivada para que
   las clases de contenido proyectado (.detail-modal__field, __grid, __list…)
   vivan en un solo lugar y no se dupliquen entre módulos.

   Uso:
     <app-detail-modal [tag]="'Ficha de Cliente'" [title]="cliente.nombre" (cerrar)="cerrarDetalle()">
        <div class="detail-modal__grid">
          <div class="detail-modal__field">
            <span class="detail-modal__label">Teléfono</span>
            <span class="detail-modal__value">{{ cliente.telefono }}</span>
          </div>
        </div>
      </app-detail-modal>
   ========================================================================= */

@Component({
  selector: 'app-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detail-modal.component.html',
  styleUrls: ['./detail-modal.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailModalComponent {
  @Input() tag = '';
  @Input() title = '';
  @Input() loading = false;
  @Output() cerrar = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.loading) this.cerrar.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('detail-modal__backdrop') && !this.loading) {
      this.cerrar.emit();
    }
  }
}
