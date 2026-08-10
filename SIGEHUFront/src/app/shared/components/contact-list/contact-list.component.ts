import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ButtonComponent } from '../button/button.component';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import type { Contacto } from '../../../core/models/cliente.model';

@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ButtonComponent, ConfirmModalComponent],
  templateUrl: './contact-list.component.html',
  styleUrls: ['./contact-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactListComponent {
  @Input() contactos: Contacto[] = [];
  @Output() contactosChange = new EventEmitter<Contacto[]>();

  indiceEliminar: number | null = null;

  // Agrega una fila vacía editable a la tabla (edición directa por columna).
  agregar(): void {
    this.contactos = [
      ...this.contactos,
      { nombreCompleto: '', telefono: '', correo: '', observaciones: '' },
    ];
    this.contactosChange.emit(this.contactos);
  }

  // Eliminación de contactos ya registrados (requiere confirmación).
  solicitarEliminar(index: number): void {
    this.indiceEliminar = index;
  }

  cancelarEliminar(): void {
    this.indiceEliminar = null;
  }

  confirmarEliminar(): void {
    if (this.indiceEliminar === null) return;
    this.contactos = this.contactos.filter((_, i) => i !== this.indiceEliminar);
    this.contactosChange.emit(this.contactos);
    this.indiceEliminar = null;
  }
}