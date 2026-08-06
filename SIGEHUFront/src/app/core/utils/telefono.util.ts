/**
 * SIGEHU — Utilidad compartida de validación y saneado de teléfono.
 *
 * Fuente de verdad única para el campo "Teléfono" usado por los módulos
 * Trabajadores y Proveedores. Contrato de BD: VARCHAR(15); acepta "+" opcional,
 * números y espacios (hasta 15 dígitos). Ambas pantallas deben comportarse
 * idéntico reutilizando estas funciones (no duplicar regex por componente).
 */

/** Validator reactivo del formulario: "+" opcional, dígitos/espacios (7-16). */
export const TELEFONO_REACTIVO_PATTERN = /^\+?[\d\s]{7,16}$/;

/** Mensaje mostrado bajo el input cuando el valor no cumple el patrón. */
export const TELEFONO_ERROR_INPUT = 'Teléfono inválido: solo "+", números y espacios';

/** Mensaje en toast al intentar guardar un valor no saneable. */
export const TELEFONO_ERROR_ENVIO = 'Teléfono inválido: usa solo "+" y números, máximo 15 dígitos';

/**
 * Filtro en vivo del input: conserva únicamente "+", números y espacios
 * mientras el usuario escribe (mismo comportamiento que Trabajadores).
 */
export function filtrarTelefonoInput(value: string): string {
  return (value ?? '').replace(/[^\d+ ]/g, '');
}

/**
 * Sanea antes de enviar: quita espacios/guiones/paréntesis y valida que
 * quede un "+" opcional + hasta 15 dígitos. Devuelve null si está vacío o
 * es inválido (misma semántica que Trabajadores).
 */
export function sanitizarTelefono(value: string): string | null {
  if (!value) return null;
  const comprimido = value.replace(/[\s\-()]/g, '');
  return /^\+?\d{1,15}$/.test(comprimido) ? comprimido : null;
}