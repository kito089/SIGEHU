export interface KitInstalacion {
  idKit?: number;
  nombre: string;
  descripcion?: string;
  totalMateriales?: number;
  materiales?: KitMaterial[];
}

export interface KitMaterial {
  idMaterial?: number;
  nombre: string;
  unidadMedida?: string;
  cantidad: number;
  notasKit?: string;
}