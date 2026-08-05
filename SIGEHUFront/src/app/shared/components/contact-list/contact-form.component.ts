import { Component, Output, EventEmitter, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
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

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saved.emit(this.form.value as Contacto);
    this.form.reset();
  }
}