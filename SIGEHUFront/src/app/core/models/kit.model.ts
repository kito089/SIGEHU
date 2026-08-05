export interface KitInstalacion {
  idKit?: number;
  nombre: string;
  descripcion?: string | null;
  totalMateriales?: number;
  totalUnidades?: number;
  materiales?: KitMaterial[];
}

export interface KitMaterial {
  idMaterial?: number;
  nombre: string;
  unidadMedida?: string;
  cantidad: number | null;
  notasKit?: string | null;
}