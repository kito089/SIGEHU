import { Component, Input, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import {
  ControlValueAccessor,
  AbstractControl, NgControl, ValidationErrors
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

@Component({
  selector: 'app-input',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './input.component.html',
  styleUrls: ['./input.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InputComponent implements ControlValueAccessor, OnInit {
  private ngControl = inject(NgControl, { optional: true, self: true });
  private cdr = inject(ChangeDetectorRef);

  @Input() label = '';
  @Input() placeholder = '';
  @Input() type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' = 'text';
  @Input() required = false;
  @Input() icon?: string;
  @Input() autocomplete = 'off';
  @Input() disabled = false;
  @Input() min?: number;
  @Input() max?: number;
  @Input() step?: number;
  @Input() maxlength?: number;
  @Input() minlength?: number;
  @Input() pattern?: string;
  @Input() togglable = false;

  // Mensaje de error personalizado proveniente del consumidor.
  // Si se omite, el componente genera uno por validación vía `errorMessageFor`.
  private customError = '';
  @Input() set errorMessage(value: string) {
    this.customError = value ?? '';
    this.cdr.markForCheck();
  }
  get errorMessage(): string {
    return this.customError || this.autoError;
  }

  private autoError = '';

  value: string | number = '';
  focused = false;
  touched = false;
  hasError = false;
  showPassword = false;

  private onChange: (value: string | number) => void = () => {};
  private onTouched: () => void = () => {};

  constructor() {
    if (this.ngControl) {
      this.ngControl.valueAccessor = this;
    }
  }

  ngOnInit(): void {
    const control = this.ngControl?.control;
    if (control) {
      control.statusChanges?.subscribe(() => this.updateErrorState(control));
      this.updateErrorState(control);
    }
  }

  writeValue(value: string | number): void {
    this.value = value ?? '';
    this.cdr.markForCheck();
  }

  registerOnChange(fn: (value: string | number) => void): void { this.onChange = fn; }

  registerOnTouched(fn: () => void): void { this.onTouched = fn; }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.cdr.markForCheck();
  }

  onInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const nextValue = this.type === 'number' ? input.valueAsNumber : input.value;
    this.value = nextValue;
    this.onChange(nextValue);
    this.updateErrorState(this.ngControl?.control ?? null);
    this.cdr.markForCheck();
  }

  onFocus(): void { this.focused = true; this.cdr.markForCheck(); }

  onBlur(): void {
    this.focused = false;
    this.touched = true;
    this.onTouched();
    this.updateErrorState(this.ngControl?.control ?? null);
    this.cdr.markForCheck();
  }

  checkErrors(): void {
    this.updateErrorState(this.ngControl?.control ?? null);
    this.cdr.markForCheck();
  }

  updateErrorState(control: AbstractControl | null): void {
    if (!control) return;
    this.hasError = !!(control.invalid && (control.touched || control.dirty));
    this.autoError = control.errors
      ? this.errorMessageFor(control.errors)
      : '';
    this.cdr.markForCheck();
  }

  private errorMessageFor(errors: ValidationErrors): string {
    if (errors['required']) return 'Este campo es obligatorio';
    if (errors['pattern']) return 'Formato no válido';
    if (errors['email']) return 'Correo electrónico no válido';
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['usernameTaken']) return 'Ese usuario ya está registrado';
    return 'Campo inválido';
  }

  get inputClasses(): string {
    const cls = ['input__field'];
    if (this.focused) cls.push('input__field--focused');
    if (this.hasError) cls.push('input__field--error');
    if (this.disabled) cls.push('input__field--disabled');
    if (this.icon) cls.push('input__field--with-icon');
    if (this.togglable) cls.push('input__field--with-toggle');
    return cls.join(' ');
  }

  get inputType(): string {
    if (this.type === 'password' && this.showPassword) return 'text';
    return this.type;
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
    this.cdr.markForCheck();
  }
}