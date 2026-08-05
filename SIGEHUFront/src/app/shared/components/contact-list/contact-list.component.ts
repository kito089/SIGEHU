import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ContactFormComponent } from './contact-form.component';
import { ButtonComponent } from '../button/button.component';

interface Contacto { nombreCompleto: string; telefono?: string; correo?: string; observaciones?: string; }

@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [CommonModule, IonicModule, ContactFormComponent, ButtonComponent],
  templateUrl: './contact-list.component.html',
  styleUrls: ['./contact-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactListComponent {
  @Input() contacts: Contacto[] = [];
  @Output() contactAdded = new EventEmitter<Contacto>();
  @Output() contactRemoved = new EventEmitter<number>();

  showForm = false;

  onSaved(contact: Contacto): void {
    this.contactAdded.emit(contact);
    this.showForm = false;
  }
}