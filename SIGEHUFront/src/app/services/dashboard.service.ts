import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from './api.service';

/* =============================================================================
   SIGEHUFront — Servicio del Dashboard.

   Endpoints (ver SIGEHUBack/src/routes/Dashboard.route.js):
     GET /Dashboard/kpis  → { obrasActivas, finalizadasMes, garantiasCerradasMes }
   ============================================================================= */

export interface DashboardResumen {
  obrasActivas: number;
  finalizadasMes: number;
  garantiasCerradasMes: number;
}

export interface EventoCalendarioBackend {
  tipoEvento: 'Obra' | 'Garantia' | string;
  idObra: number;
  nombreObra: string;
  nombreCliente: string;
  estadoObra: string;
  fechaEvento: string;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private api = inject(ApiService);

  kpis(): Observable<DashboardResumen> {
    return this.api.get<DashboardResumen>('/Dashboard/kpis');
  }

  eventosCalendario(): Observable<EventoCalendarioBackend[]> {
    return this.api.get<EventoCalendarioBackend[]>('/Dashboard/calendar-events');
  }
}