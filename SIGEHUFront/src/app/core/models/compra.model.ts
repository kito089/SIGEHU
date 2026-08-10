export interface DetalleCompra {
  idDetalleCompra?: number;
  idProveedor: number;
  idMaterial: number;
  nombreMaterial: string;
  unidadMedida?: string;
  nombreProveedor: string;
  direccionProveedor?: string | null;
  telefonoProveedor?: string | null;
  cantidad: number;
  medida?: string | null;
}

export interface Compra {
  idCompra: number;
  trabajadoresIdTrabajador: number;
  nombreTrabajador: string;
  fechaCompra: string;
  fechaCreacion: string;
  notas: string | null;
  recibida: boolean;
  activo?: boolean;
  detalles?: DetalleCompra[];
}

export interface CompraDetalleInput {
  idProveedor: number;
  idMaterial: number;
  cantidad: number;
  medida?: string | null;
}

export interface CompraPayload {
  idTrabajador: number;
  FechaCompra?: string | null;
  Notas?: string | null;
  detalles: CompraDetalleInput[];
}

/** Compra todavía no recibida (para el bloque "Compras pendientes"). */
export interface CompraPendiente {
  idCompra: number;
  fechaCompra: string;
  proveedores: string;
  materiales: string;
  lineas: number;
  /** Cantidad total real de materiales de la compra (suma de Cantidad de sus líneas). */
  cantidadTotal: number;
}
