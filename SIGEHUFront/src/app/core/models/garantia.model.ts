export interface Garantia {
  idGarantia?: number;
  idObra: number;
  descripcion: string;
  fecha: string;
  idEstadoGarantia: number;
  estadoGarantia?: string;
  fotos?: FotoGarantia[];
  notas?: NotaGarantia[];
  trabajadores?: GarantiaTrabajador[];
}

export interface FotoGarantia {
  idFoto: number;
  idGarantia: number;
  ruta: string;
  fecha: string;
  tipo: 'Reporte' | 'Resolucion';
}

export interface NotaGarantia {
  idNota: number;
  idGarantia: number;
  texto: string;
  autor: string;
  fecha: string;
}

export interface GarantiaTrabajador {
  idGarantia: number;
  idTrabajador: number;
  nombreCompleto?: string;
}