import { Component, Output, EventEmitter, ChangeDetectionStrategy, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { InputComponent } from '../input/input.component';
import { ButtonComponent } from '../button/button.component';
import type { Contacto } from '../../../core/models/cliente.model';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ContactFormComponent {
  @Output() saved = new EventEmitter<Contacto>();
  @Output() cancelled = new EventEmitter<void>();
  @Input() set existentes(lista: Contacto[]) {
    this._existentes = lista ?? [];
    this.form.setValidators([this.duplicadoValidator()]);
    this.form.updateValueAndValidity();
  }
  get existentes(): Contacto[] {
    return this._existentes;
  }

  private _existentes: Contacto[] = [];
  form: FormGroup;
  private fb = inject(FormBuilder);

  constructor() {
    this.form = this.fb.group({
      nombreCompleto: ['', [Validators.required]],
      telefono: ['', [Validators.pattern(/^[0-9]{10,15}$/)]],
      correo: ['', [Validators.email]],
      observaciones: ['']
    });
  }

  private duplicadoValidator(): (control: AbstractControl) => ValidationErrors | null {
    return (control: AbstractControl): ValidationErrors | null => {
      const telefono = (control.get('telefono')?.value ?? '').trim();
      const correo = (control.get('correo')?.value ?? '').trim();
      const duplicado = this._existentes.some(c =>
        c.telefono === telefono && c.correo === correo && (telefono || correo)
      );
      return duplicado ? { contactoDuplicado: true } : null;
    };
  }

  get telefonoDuplicado(): boolean {
    return !!this.form.errors?.['contactoDuplicado'];
  }

  submit(): void {
    if (this.form.invalid || this.telefonoDuplicado) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit(this.form.value as Contacto);
    this.form.reset();
  }
}
