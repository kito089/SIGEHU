import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ButtonComponent } from '../button/button.component';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import type { Contacto } from '../../../core/models/cliente.model';
import { TELEFONO_REACTIVO_PATTERN, filtrarTelefonoInput } from '../../../core/utils/telefono.util';

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

  // Filas cuyo teléfono ya fue "tocado": solo se muestra el error de formato
  // después de salir del campo, igual que en el formulario reactivo.
  telTocado = signal<number[]>([]);

  // Agrega una fila vacía editable a la tabla (edición directa por columna).
  agregar(): void {
    this.contactos = [
      ...this.contactos,
      { nombreCompleto: '', telefono: '', correo: '', observaciones: '' },
    ];
    this.contactosChange.emit(this.contactos);
  }

  // ── Teléfono ─────────────────────────────────────────────────────────────
  // Filtra en vivo: solo "+", números y espacios (misma regla que Trabajadores).
  onTelefonoInput(event: Event, i: number): void {
    const input = event.target as HTMLInputElement;
    const limpio = filtrarTelefonoInput(input.value);
    if (limpio !== input.value) {
      input.value = limpio;
      this.contactos[i].telefono = limpio;
    }
  }

  marcarTelTocado(i: number): void {
    if (!this.telTocado().includes(i)) {
      this.telTocado.set([...this.telTocado(), i]);
    }
  }

  telInvalido(c: Contacto): boolean {
    const valor = (c.telefono ?? '').trim();
    return valor !== '' && !TELEFONO_REACTIVO_PATTERN.test(valor);
  }

  mostrarErrorTel(i: number, c: Contacto): boolean {
    return this.telTocado().includes(i) && this.telInvalido(c);
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