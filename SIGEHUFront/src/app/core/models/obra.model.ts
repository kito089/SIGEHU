import type { TrabajadorObra } from './trabajador.model';
import type { KitInstalacion } from './kit.model';
import type { PermisoGranular } from './permiso.model';

export interface FotoObra {
  idFoto: number;
  idObra: number;
  etapa: 'Levantamiento' | 'Fabricacion' | 'Instalacion' | 'Garantia';
  ruta: string;
  fecha: string;
  descripcion?: string;
}

export interface NotaObra {
  idNota: number;
  idObra: number;
  texto: string;
  etapa: string;
  autor: string;
  fecha: string;
}

export interface ObraMaterial {
  idMaterial: number;
  nombre: string;
  cantidad: number;
  unidadMedida?: string;
}

export interface Obra {
  idObra: number;
  nombre: string;
  direccion?: string;
  ancho?: number;
  alto?: number;
  profundidad?: number;
  idEstadoObra: number;
  ordenEstado?: number;
  estadoObra?: string;
  idCliente: number;
  nombreCliente?: string;
  telefonoCliente?: string;
  fechaCreacion?: string;
  fechaUltimaActualizacion?: string;
  anticipo?: number;
  cobroFinal?: number;
  fotos?: FotoObra[];
  notas?: NotaObra[];
  trabajadores?: TrabajadorObra[];
  materiales?: ObraMaterial[];
  kitAsignado?: KitInstalacion;
  permisos?: PermisoGranular[];
}

export interface KanbanColumn {
  idEstadoObra: number;
  titulo: string;
  orden: number;
  obras: Obra[];
}