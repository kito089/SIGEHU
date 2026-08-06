/* =============================================================================
   SIGPunto — Modelos del módulo de Reportes (solo lectura).

   Las líneas coinciden con los JSON que devuelve SIGEHUBack (claves en
   CamelCase, columnas MAYÚSCULAS ya normalizadas por el backend).
   ============================================================================= */

export interface EstadoReporte {
  estado: string;
  orden: number;
  total: number;
  porcentaje: number;
}

export interface ObrasPorEstado {
  total: number;
  estados: EstadoReporte[];
}

export interface PuntoSerie {
  label: string;
  total: number;
}

export interface EvolucionObras {
  tipo: 'dia' | 'semana' | 'mes' | 'anio';
  serie: PuntoSerie[];
}

export interface TiempoEtapa {
  idEstado: number;
  estado: string;
  promedioDias: number;
  obras: number;
}

export interface ClienteObras {
  idCliente: number;
  nombre: string;
  total: number;
  activas: number;
}

export interface ClienteNuevoMes {
  anio: number;
  mes: number;
  total: number;
}

export interface ClienteNuevoRegistro {
  idCliente: number;
  nombre: string;
  fecha: string;
}

export interface ClientesNuevos {
  serie: ClienteNuevoMes[];
  listado: ClienteNuevoRegistro[];
}

export interface TrabajadorObrasActivas {
  idTrabajador: number;
  nombre: string;
  obras: number;
}

export interface TrabajadorGarantias {
  idTrabajador: number;
  nombre: string;
  garantias: number;
}

export interface EstadoGarantiaReporte {
  estado: string;
  orden: number;
  total: number;
  porcentaje: number;
}

export interface GarantiasResumen {
  total: number;
  abiertas: number;
  resueltas: number;
  promedioResolucionDias: number;
  porEstado: EstadoGarantiaReporte[];
}

export interface ProblemaRecurrente {
  idObra: number;
  obra: string;
  cliente: string;
  numero: number;
  detalle: string;
}

export interface GarantiaMultiple {
  idObra: number;
  nombre: string;
  cliente: string;
  numero: number;
}

export interface UsoMaterial {
  idMaterial: number;
  nombre: string;
  unidad: string;
  obras: number;
  cantidad: number;
}

export interface UsoMateriales {
  masUtilizados: UsoMaterial[];
  menosUtilizados: UsoMaterial[];
  porObra: Array<Pick<UsoMaterial, 'nombre' | 'unidad' | 'obras' | 'cantidad'>>;
}

export interface MaterialSinProveedor {
  idMaterial: number;
  nombre: string;
  unidad: string;
}

export interface ProveedorUsado {
  idProveedor: number;
  nombre: string;
  compras: number;
  lineas: number;
}

export interface ProveedorVariedad {
  idProveedor: number;
  nombre: string;
  variedad: number;
}

export interface MaterialPorProveedor {
  proveedor: string;
  material: string;
  unidad: string;
  cantidad: number;
}

export interface KitUsado {
  idKit: number;
  nombre: string;
  asignaciones: number;
  porcentaje: number;
}

export interface KitsUsados {
  total: number;
  kits: KitUsado[];
}

export interface MaterialPorKit {
  kit: string;
  material: string;
  unidad: string;
  cantidad: number;
}