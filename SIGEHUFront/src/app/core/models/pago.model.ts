export interface Pago {
  idPago?: number;
  idObra: number;
  monto: number;
  fecha: string;
  idTipoPago: number;
  idFormaPago: number;
  observaciones?: string;
}