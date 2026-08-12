export interface CalendarEvent {
  id: string | number;
  title: string;
  start: string;
  end?: string;
  color?: string;
  bordered?: boolean;
  extendedProps: {
    type: string;
    obraId?: string | number | null;
    obraNombre?: string;
    clienteNombre?: string;
    // Estado actual de la obra (e.g. "En fabricacion"). Lo usa el tooltip.
    estadoObra?: string;
    // Trabajadores asignados separados por '|' (string crudo del backend).
    // Vacio si la obra no tiene trabajador asignado.
    trabajadoresAsignados?: string;
    // Fecha real utilizada por el calendario (YYYY-MM-DD). La prioridad se
    // calcula en el backend: FechaInicio ?? FechaAsignacion(MIN) ?? FechaUltimaActualizacion.
    fechaCalendario?: string;
    esActividad?: boolean;
    hora?: string;
    notas?: string;
  };
}