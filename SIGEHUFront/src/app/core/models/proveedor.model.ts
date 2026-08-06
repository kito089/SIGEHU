export interface ProveedorMaterial {
  idMaterial?: number;
  nombre: string;
  unidadMedida?: string;
  descripcion?: string | null;
  precio: number | null;
  notasProveedor?: string | null;
}

export interface Proveedor {
  idProveedor?: number;
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  giroPrincipal?: string | null;
  contactoCompras?: string | null;
  notas?: string | null;
  activo?: boolean;
  materiales?: ProveedorMaterial[];
}