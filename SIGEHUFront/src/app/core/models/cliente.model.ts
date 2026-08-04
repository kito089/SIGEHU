export interface Contacto {
  id?: number;
  nombreCompleto: string;
  telefono?: string;
  correo?: string;
  observaciones?: string;
  clienteId: number;
}

export interface Cliente {
  idCliente?: number;
  nombre: string;
  direccion?: string;
  rfc?: string;
  telefono?: string;
  correo?: string;
  idRegimenFiscal?: number;
  codigoPostal?: string;
  idUsoCfdi?: number;
  observaciones?: string;
  activo: boolean;
  totalObrasActivas?: number;
  contactos?: Contacto[];
}