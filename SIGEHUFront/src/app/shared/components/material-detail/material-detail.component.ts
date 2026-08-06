import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Material } from '../../../core/models/material.model';

/* =========================================================================
   SIGEHU — Vista reusable de detalle de un material.
   Label-value grid con todos los campos descriptivos de un material. No
   modifica datos: solo presenta la información del material que recibe como
   Input. Emite `cerrar` para que el consumidor (ej. modal de Proveedores)
   cierre la vista.
   ========================================================================= */

export type MaterialDetailData = Material & {
  precio?: number | null;
  proveedor?: string | null;
  stock?: number | null;
};

@Component({
  selector: 'app-material-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './material-detail.component.html',
  styleUrls: ['./material-detail.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MaterialDetailComponent {
  @Input() material: MaterialDetailData | null = null;
  @Output() cerrar = new EventEmitter<void>();

  get precioMostrable(): string {
    const precio = this.material?.precio;
    if (precio == null || isNaN(Number(precio))) return '-';
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(Number(precio));
  }
}