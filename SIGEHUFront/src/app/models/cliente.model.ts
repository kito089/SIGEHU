export interface Contacto {
  NombreCompleto: string;
  Telefono?: string;
  Correo?: string;
  Observaciones?: string;
}

export interface Cliente {
  IDCLIENTE?: number;
  NOMBRE?: string;
  DIRECCION?: string;
  RFC?: string;
  TELEFONO?: string;
  CORREO?: string;
  IDREGIMENFISCAL?: number;
  CODIGOPOSTAL?: string;
  IDUSOCFDI?: number;
  OBSERVACIONES?: string;
  ACTIVO?: boolean;
  TOTALOBRASACTIVAS?: number;
  OBRA?: unknown[];
  CONTACTO?: Contacto[];
}