export interface KPI {
  obrasActivas: number;
  finalizadasMes: number;
  enGarantia: number;
  alertas: number;
}

export interface ActivityFeedItem {
  id: number;
  usuario: string;
  accion: string;
  entidad: string;
  entidadId: number;
  fecha: string;
  detalles?: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end?: string;
  color: string;
  extendedProps: {
    type: 'Levantamiento' | 'Fabricacion' | 'Instalacion' | 'Garantia';
    obraId: number;
    obraNombre: string;
    clienteNombre: string;
  };
}