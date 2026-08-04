export interface Obra {
  IDOBRA: number;
  NOMBRE?: string;
  NOMBREOBRA?: string;
  DIRECCION?: string;
  ANCHO?: number;
  ALTO?: number;
  PROFUNDIDAD?: number;
  ESTADOSABRA_IDESTADOOBRA?: number;
  ORDENESTADO?: number;
  ESTADOOBRA?: string;
  CLIENTES_IDCLINTE?: number;
  NOMBRECLIENTE?: string;
  TELEFONOCLIENTE?: string;
  FECHACREACION?: string;
  FECHAULTIMAACTUALIZACION?: string;
}

export interface KanbanColumn {
  idEstadoObra: number;
  titulo: string;
  obras: Obra[];
}