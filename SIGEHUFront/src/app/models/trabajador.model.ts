export interface Trabajador {
  IDTRABAJADOR?: number;
  NOMBREUSUARIO?: string;
  NOMBRECOMPLETO?: string;
  TELEFONO?: string;
  RUTADOCUMENTOIMSS?: string;
  TIPOSUSUARIOS_IDTIPOUSUARIO?: number;
  TIPOUSUARIOS?: string;
  ACTIVO?: boolean;
  CONTRA?: string;
}

export interface KitInstalacion {
  IDKIT?: number;
  NOMBRE?: string;
  DESCRIPCION?: string;
  TOTALMATERIALES?: number;
  MATERIALES?: KitMaterial[];
}

export interface KitMaterial {
  IDMATERIAL?: number;
  NOMBRE?: string;
  UNIDADMEDIDA?: string;
  CANTIDAD?: number;
  NOTASKIT?: string;
}