import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const TELEFONO_PATTERN = /^[\d\s\-\+\(\)]{10,15}$/;
export const RFC_PATTERN = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;
export const CODIGO_POSTAL_PATTERN = /^\d{5}$/;
export const EMAIL_MAX = 100;
export const NOMBRE_MAX = 150;
export const DIRECCION_MAX = 200;
export const OBSERVACIONES_MAX = 500;
export const RAZON_SOCIAL_MAX = 200;

export function telefonoOcorreoRequired(control: AbstractControl): { telefonoOcorreo: boolean } | null {
  const telefono = (control.get('telefono')?.value ?? '').trim();
  const correo = (control.get('correo')?.value ?? '').trim();
  return telefono || correo ? null : { telefonoOcorreo: true };
}

/**
 * Regla de negocio para ContactosClientes: un contacto con datos (nombre u
 * observaciones) debe tener al menos un teléfono o un correo. Se aplica a la
 * fila de un contacto; por eso recibe el objeto `Contacto` (no un FormControl).
 * Fuente única compartida entre cliente-form y cliente-detail.
 */
export function contactoRequiereMedio(c: { telefono?: string | null; correo?: string | null; nombreCompleto?: string; observaciones?: string } | null): boolean {
  if (!c) return false;
  const conDatos =
    String(c.nombreCompleto ?? '').trim() !== '' ||
    String(c.observaciones ?? '').trim() !== '';
  if (!conDatos) return false;
  return !String(c.telefono ?? '').trim() && !String(c.correo ?? '').trim();
}