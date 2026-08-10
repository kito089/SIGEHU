export type ClienteTipo = 'persona' | 'empresa';

export interface Contacto {
  id?: number;
  nombreCompleto: string;
  telefono?: string;
  correo?: string;
  observaciones?: string;
  clienteId?: number;
}

export interface DatosFiscales {
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  usoCFDI: string;
  codigoPostal: string;
  direccion: string;
}

export interface DatosFiscalesEmpresa {
  rfc: string;
  razonSocial: string;
  regimenFiscal: string;
  usoCFDI: string;
  codigoPostal: string;
  direccionFiscal: string;
}

export interface ClientePersona {
  tipo: 'persona';
  nombre: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  observaciones?: string;
  datosFiscales?: DatosFiscales;
}

export interface ClienteEmpresa {
  tipo: 'empresa';
  nombre: string;
  direccion?: string;
  observaciones?: string;
  contactos: Contacto[];
  datosFiscales?: DatosFiscalesEmpresa;
}

export type ClienteFormData = ClientePersona | ClienteEmpresa;

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