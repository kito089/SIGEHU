export interface CampoPermiso {
  idCampoPermiso: number;
  nombre: string;
  descripcion: string;
}

export interface EstadoObra {
  idEstadoObra: number;
  nombre: string;
  orden: number;
  color?: string;
}

export interface EstadoGarantia {
  idEstadoGarantia: number;
  nombre: string;
  orden: number;
}

export interface RegimenFiscal {
  idRegimenFiscal: number;
  clave: string;
  descripcion: string;
}

export interface UsoCFDI {
  idUsoCfdi: number;
  clave: string;
  descripcion: string;
}

export interface TipoPago {
  idTipoPago: number;
  nombre: string;
}

export interface FormaPago {
  idFormaPago: number;
  nombre: string;
}