import type { PermisoGranular } from './permiso.model';

export interface TrabajadorObra {
  idObra: number;
  idTrabajador: number;
  nombreCompleto: string;
  iniciales: string;
  permisos: PermisoGranular;
}

export interface Trabajador {
  idTrabajador?: number;
  nombreUsuario: string;
  nombreCompleto: string;
  telefono?: string;
  rutaDocumentoImss?: string;
  idTipoUsuario: number;
  tipoUsuario?: string;
  activo: boolean;
  contra?: string;
}