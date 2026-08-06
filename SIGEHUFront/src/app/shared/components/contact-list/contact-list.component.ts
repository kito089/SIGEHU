import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ContactFormComponent } from './contact-form.component';
import { ButtonComponent } from '../button/button.component';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import type { Contacto } from '../../../core/models/cliente.model';

@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [CommonModule, IonicModule, ContactFormComponent, ButtonComponent, ConfirmModalComponent],
  templateUrl: './contact-list.component.html',
  styleUrls: ['./contact-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactListComponent {
  @Input() contactos: Contacto[] = [];
  @Output() contactosChange = new EventEmitter<Contacto[]>();

  showForm = false;
  indiceEliminar: number | null = null;

  onSaved(contacto: Contacto): void {
    this.contactosChange.emit([...this.contactos, contacto]);
    this.showForm = false;
  }

  solicitarEliminar(index: number): void {
    this.indiceEliminar = index;
  }

  cancelarEliminar(): void {
    this.indiceEliminar = null;
  }

  confirmarEliminar(): void {
    if (this.indiceEliminar === null) return;
    this.contactosChange.emit(this.contactos.filter((_, i) => i !== this.indiceEliminar));
    this.indiceEliminar = null;
  }
}
