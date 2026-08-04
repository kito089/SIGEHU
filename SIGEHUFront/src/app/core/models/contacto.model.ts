export interface Contacto {
  id?: number;
  nombreCompleto: string;
  telefono?: string;
  correo?: string;
  observaciones?: string;
  clienteId: number;
}