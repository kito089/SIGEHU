export interface Proveedor {
  idProveedor?: number;
  empresa: string;
  contacto?: string;
  telefono?: string;
  direccion?: string;
  giroPrincipal?: string;
  contactoCompras?: string;
  materiales?: ProveedorMaterial[];
}

export interface ProveedorMaterial {
  idProveedor: number;
  idMaterial: number;
  precio: number;
  unidadMedida: string;
}