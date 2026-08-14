import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, signal, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { ButtonComponent } from '../button/button.component';
import { ConfirmModalComponent } from '../confirm-modal/confirm-modal.component';
import { ToastService } from '../../../core/services/toast.service';
import type { Contacto } from '../../../core/models/cliente.model';
import { TELEFONO_REACTIVO_PATTERN, filtrarTelefonoInput } from '../../../core/utils/telefono.util';
import { contactoRequiereMedio, contactoVacio } from '../../validators/custom-validators';

@Component({
  selector: 'app-contact-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule, ButtonComponent, ConfirmModalComponent],
  templateUrl: './contact-list.component.html',
  styleUrls: ['./contact-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactListComponent implements OnChanges {
  @Input() contactos: Contacto[] = [];

  // Modo detalle (Cliente Detail): filas de SOLO LECTURA con edición por fila
  // (Editar → Guardar/Cancelar, Eliminar con confirmación). El modo por
  // defecto (formularios) mantiene la edición en línea de todas las filas.
  @Input() edicionPorFila = false;

  // Contador de "recarga canónica" del padre (Cliente Detail): al cambiar, la
  // edición por fila en curso se abandona y se refleja el estado de BD. Se usa
  // en lugar del array de contactos, porque el round-trip por `contactosChange`
  // re-entrega el MISMO array y no debe cancelar la edición de una fila nueva.
  @Input() version = 0;

  @Output() contactosChange = new EventEmitter<Contacto[]>();

  // Persistencia EXPLÍCITA (modo detalle): solo se emite al pulsar
  // Guardar o Eliminar sobre una fila. NUNCA se emite al escribir.
  @Output() persistirContactos = new EventEmitter<Contacto[]>();

  private toast = inject(ToastService);

  indiceEliminar: number | null = null;

  // Modo detalle: índice de la fila en edición y si es una fila nueva
  // (agregada con "+ Agregar", aún sin persistir).
  filaEnEdicion: number | null = null;
  esFilaNueva = false;
  private snapshot: Contacto[] = [];

  // Filas cuyo teléfono ya fue "tocado": solo se muestra el error de formato
  // después de salir del campo, igual que en el formulario reactivo.
  telTocado = signal<number[]>([]);

  ngOnChanges(changes: SimpleChanges): void {
    // Tras una recarga canónica del padre (version++), se abandona la edición
    // en curso y se refleja el estado de BD.
    if (this.edicionPorFila && changes['version'] && !changes['version'].firstChange) {
      this.filaEnEdicion = null;
      this.esFilaNueva = false;
      this.indiceEliminar = null;
    }
  }

  // Agrega una fila vacía editable. En modo detalle la fila nueva entra en
  // edición y permanece visible hasta Guardar/Cancelar.
  agregar(): void {
    if (this.edicionPorFila && this.filaEnEdicion !== null) {
      this.toast.warning('Guarda o cancela la edición actual antes de agregar otro contacto.');
      return;
    }
    // Modo formulario: si ya existe una fila vacía pendiente, se bloquea agregar
    // otra hasta guardar o cancelar (mismo criterio de "edición en curso").
    if (!this.edicionPorFila && this.contactos.some((c) => this.filaVacia(c))) {
      this.toast.warning('Guarda o cancela la edición actual antes de agregar otro contacto.');
      return;
    }
    this.contactos = [
      ...this.contactos,
      { nombreCompleto: '', telefono: '', correo: '', observaciones: '' },
    ];
    if (this.edicionPorFila) {
      this.filaEnEdicion = this.contactos.length - 1;
      this.esFilaNueva = true;
      this.snapshot = this.contactos.map((c) => ({ ...c }));
      this.telTocado.set([]);
    }
    this.contactosChange.emit(this.contactos);
  }

  // ── Modo detalle: edición por fila ────────────────────────────────────────

  editarFila(i: number): void {
    if (!this.edicionPorFila || this.filaEnEdicion !== null) return;
    this.filaEnEdicion = i;
    this.esFilaNueva = false;
    this.snapshot = this.contactos.map((c) => ({ ...c }));
    this.telTocado.set([]);
  }

  cancelarFila(i: number): void {
    if (!this.edicionPorFila) return;
    if (this.esFilaNueva && this.filaEnEdicion === i) {
      this.contactos = this.contactos.filter((_, idx) => idx !== i);
    } else {
      this.contactos = this.snapshot.map((c) => ({ ...c }));
    }
    this.filaEnEdicion = null;
    this.esFilaNueva = false;
    this.contactosChange.emit(this.contactos);
  }

  filaVacia(c: Contacto): boolean {
    return contactoVacio(c);
  }

  guardarFila(i: number): void {
    if (!this.edicionPorFila || this.filaEnEdicion !== i) return;
    const c = this.contactos[i];

    if (this.filaVacia(c)) {
      this.toast.warning('Completa o elimina la fila de contacto vacía.');
      return;
    }
    if (this.sinMedio(c)) {
      this.toast.warning('El contacto requiere al menos un teléfono o un correo.');
      return;
    }
    if (this.telInvalido(c)) {
      this.toast.warning('Teléfono inválido: usa "+52" y el número.');
      return;
    }

    // Persistencia explícita: el padre guarda y recarga el detalle.
    this.persistirContactos.emit(this.contactos.map((x) => ({ ...x })));
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

  // Un contacto con datos (nombre/observaciones) debe tener teléfono o correo.
  sinMedio(c: Contacto): boolean {
    return contactoRequiereMedio(c);
  }

  // Emite el estado actual de la lista para que el padre lo refleje en su
  // estado (NO dispara persistencia: cada padre decide cuándo guardar).
  emitirCambios(): void {
    this.contactosChange.emit(this.contactos);
  }

  // ¿Hay al menos un contacto con datos que aún no tiene teléfono ni correo?
  // Único origen para la leyenda bajo "Contactos (n)" (las filas vacías se
  // gestionan por separado con `filaVacia`, no pintan la advertencia).
  hayContactoSinMedio(): boolean {
    return this.contactos.some(c => this.sinMedio(c));
  }

  // Eliminación de contactos ya registrados (requiere confirmación).
  solicitarEliminar(index: number): void {
    if (this.edicionPorFila && this.filaEnEdicion !== null) return;
    this.indiceEliminar = index;
  }

  cancelarEliminar(): void {
    this.indiceEliminar = null;
  }

  confirmarEliminar(): void {
    if (this.indiceEliminar === null) return;

    // Regla de negocio (backend): una empresa requiere al menos un contacto.
    if (this.edicionPorFila && this.contactos.length <= 1) {
      this.toast.warning('Para una empresa se requiere al menos un contacto.');
      this.indiceEliminar = null;
      return;
    }

    this.contactos = this.contactos.filter((_, i) => i !== this.indiceEliminar);
    if (this.edicionPorFila) {
      this.filaEnEdicion = null;
      this.esFilaNueva = false;
      this.persistirContactos.emit(this.contactos.map((x) => ({ ...x })));
    }
    this.contactosChange.emit(this.contactos);
    this.indiceEliminar = null;
  }
}
