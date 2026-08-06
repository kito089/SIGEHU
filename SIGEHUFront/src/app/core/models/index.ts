export type {
  Contacto,
  Cliente,
  ClienteTipo,
  DatosFiscales,
  DatosFiscalesEmpresa,
  ClientePersona,
  ClienteEmpresa,
  ClienteFormData
} from './cliente.model';
export type { Obra, FotoObra, NotaObra, ObraMaterial, KanbanColumn } from './obra.model';
export type { Trabajador, TrabajadorObra } from './trabajador.model';
export type { User, AuthResponse, LoginCredentials } from './user.model';
export type { Material } from './material.model';
export type { Proveedor, ProveedorMaterial } from './proveedor.model';
export type { KitInstalacion, KitMaterial } from './kit.model';
export type { Compra, DetalleCompra, CompraPendiente } from './compra.model';
export type { Pago } from './pago.model';
export type { Garantia, FotoGarantia, NotaGarantia, GarantiaTrabajador } from './garantia.model';
export type { PermisoGranular } from './permiso.model';
export type {
  CampoPermiso,
  EstadoObra,
  EstadoGarantia,
  RegimenFiscal,
  UsoCFDI,
  TipoPago,
  FormaPago
} from './catalogo.model';
export type { KPI, ActivityFeedItem, CalendarEvent } from './dashboard.model';
export type {
  ObrasPorEstado, EstadoReporte, EvolucionObras, PuntoSerie,
  TiempoEtapa, ClienteObras, ClientesNuevos, ClienteNuevoMes,
  ClienteNuevoRegistro, TrabajadorObrasActivas, TrabajadorGarantias,
  GarantiasResumen, ProblemaRecurrente, GarantiaMultiple, UsoMaterial,
  UsoMateriales, MaterialSinProveedor, ProveedorUsado, ProveedorVariedad,
  MaterialPorProveedor, KitsUsados, KitUsado, MaterialPorKit
} from './reporte.model';