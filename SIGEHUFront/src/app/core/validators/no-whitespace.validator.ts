import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/* =========================================================================
   SIGEHU — Validadores compartidos de formularios (RF-06).

   `noWhitespaceValidator()` evita valores compuestos únicamente por
   espacios en blanco ("   "), que el validador `required` nativo de
   Angular no detecta. Se usa en los campos obligatorios de los
   formularios (Materiales, Kits, Proveedores, Trabajadores, Clientes).
   ========================================================================= */

export function noWhitespaceValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value: unknown = control.value;
    if (typeof value === 'string' && value.length > 0 && value.trim().length === 0) {
      return { whitespace: true };
    }
    return null;
  };
}
