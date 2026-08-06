import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';

/* =========================================================================
   SIGEHU — Servicio de dominio para Auditoría (RF-32 / RF-33).

   Fuente de información del módulo de Reportes (Actividad reciente e
   historial completo). Todo proviene del backend:
     GET /Auditoria/actividad?limit=20        → cabeceras más recientes
     GET /Auditoria/historial?dia=YYYY-MM-DD  → historial completo (opcional día)
     GET /Auditoria/:idAuditoria/detalles     → cambios por campo (AuditoriasDetalles)

   La descripción amigable la construyen los triggers en Auditorias.Descripcion
   (p. ej. "Se creó el cliente: Juan Pérez.").
   ========================================================================= */

export interface AuditoriaRegistro {
  id: number;
  usuario: string;
  tabla: string;
  accion: string;
  descripcion: string;
  fecha: Date;
}

export interface AuditoriaDetalle {
  id: number;
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
}

const parseFecha = (v: unknown): Date => {
  if (v == null) return new Date();
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? new Date() : d;
};

const mapRegistro = (raw: Record<string, unknown>): AuditoriaRegistro => ({
  id: Number(raw['IDAUDITORIA'] ?? raw['idAuditoria'] ?? raw['id'] ?? 0),
  usuario: String(raw['TRABAJADOR'] ?? raw['Trabajador'] ?? raw['trabajador'] ?? ''),
  tabla: String(raw['TABLA'] ?? raw['Tabla'] ?? raw['tabla'] ?? ''),
  accion: String(raw['ACCION'] ?? raw['Accion'] ?? raw['accion'] ?? '').toUpperCase(),
  descripcion: String(raw['DESCRIPCION'] ?? raw['Descripcion'] ?? raw['descripcion'] ?? ''),
  fecha: parseFecha(raw['FECHA'] ?? raw['Fecha'] ?? raw['fecha']),
});

const mapDetalle = (raw: Record<string, unknown>): AuditoriaDetalle => ({
  id: Number(raw['IDAUDITORIADETALLE'] ?? raw['idAuditoriaDetalle'] ?? 0),
  campo: String(raw['CAMPO'] ?? raw['Campo'] ?? raw['campo'] ?? ''),
  valorAnterior: raw['VALORANTERIOR'] != null ? String(raw['VALORANTERIOR']) : null,
  valorNuevo: raw['VALORNUEVO'] != null ? String(raw['VALORNUEVO']) : null,
});

@Injectable({ providedIn: 'root' })
export class AuditoriaService {
  private api = inject(ApiService);

  listarActividad(limit = 20): Observable<AuditoriaRegistro[]> {
    return this.api.get<Record<string, unknown>[]>(`/Auditoria/actividad?limit=${limit}`).pipe(
      map(rows => (rows ?? []).map(r => mapRegistro(r)))
    );
  }

  historial(dia?: string): Observable<AuditoriaRegistro[]> {
    const q = dia ? `?dia=${encodeURIComponent(dia)}` : '';
    return this.api.get<Record<string, unknown>[]>(`/Auditoria/historial${q}`).pipe(
      map(rows => (rows ?? []).map(r => mapRegistro(r)))
    );
  }

  detalles(idAuditoria: number): Observable<AuditoriaDetalle[]> {
    return this.api.get<Record<string, unknown>[]>(`/Auditoria/${idAuditoria}/detalles`).pipe(
      map(rows => (rows ?? []).map(r => mapDetalle(r)))
    );
  }
}
