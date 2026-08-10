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
    esActividad?: boolean;
    hora?: string;
    notas?: string;
  };
}