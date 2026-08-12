import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/* =============================================================================
   SIGEHUFront — Servicio del Dashboard.

   Endpoints (ver SIGEHUBack/src/routes/Dashboard.route.js):
     GET /Dashboard/kpis            → { obrasActivas, finalizadasMes, garantiasCerradasMes }
     GET /Dashboard/kanban          → KanbanRowBackend[] (filas de VW_OBRAS_KANBAN + TrabajadoresAsignados)
     GET /Dashboard/calendar-events → EventoCalendarioBackend[] (obras con fecha priorizada +
                                       trabajadores asignados para tooltip)
   ============================================================================= */

export interface DashboardResumen {
  obrasActivas: number;
  finalizadasMes: number;
  garantiasCerradasMes: number;
}

// Filas devueltas por GET /Dashboard/kanban. El backend NO normaliza el casing
// (Devuelve UPPERCASE directo de Firebird), por eso todos los campos son string
// y se normalizan/tipan en el consumidor.
export interface KanbanRowBackend {
  IDOBRA: number;
  NOMBREOBRA: string;
  FECHAULTIMAACTUALIZACION: string;
  FECHACREACION: string;
  IDCLIENTE: number;
  NOMBRECLIENTE: string;
  TELEFONOCLIENTE: string | null;
  IDESTADOOBRA: number;
  ESTADOOBRA: string;
  ORDENESTADO: number;
  // Lista de nombres de trabajadores asignados separados por '|'. Vacío/null si no hay.
  TRABAJADORESASIGNADOS: string | null;
}

export interface EventoCalendarioBackend {
  tipoEvento: 'Obra' | 'Garantia' | string;
  idObra: number;
  nombreObra: string;
  nombreCliente: string;
  estadoObra: string;
  fechaEvento: string;
  // Lista de nombres de trabajadores asignados separados por '|'. Vacío si no hay.
  trabajadoresAsignados: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private api = inject(ApiService);

  kpis(): Observable<DashboardResumen> {
    return this.api.get<DashboardResumen>('/Dashboard/kpis');
  }

  kanban(): Observable<KanbanRowBackend[]> {
    return this.api.get<KanbanRowBackend[]>('/Dashboard/kanban');
  }

  eventosCalendario(): Observable<EventoCalendarioBackend[]> {
    return this.api.get<EventoCalendarioBackend[]>('/Dashboard/calendar-events');
  }
}