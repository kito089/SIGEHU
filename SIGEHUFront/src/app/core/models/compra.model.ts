export interface Compra {
  idCompra?: number;
  idProveedor: number;
  idChofer?: number;
  fecha: string;
  estado: 'Pendiente' | 'En ruta' | 'Recibida' | 'Cancelada';
  detalles?: DetalleCompra[];
}

export interface DetalleCompra {
  idDetalle?: number;
  idCompra: number;
  idMaterial: number;
  cantidad: number;
  precioUnitario: number;
}