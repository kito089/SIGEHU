import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { KitInstalacion, KitMaterial } from '../core/models/kit.model';

/* =========================================================================
   SIGEHU — Servicio de dominio para Kits de Instalación (RF-22).

   Centraliza el mapeo hacia/desde el formato real del Backend (columnas en
   MAYÚSCULAS por normalización Firebird) y los contratos exactos de entrada.

   Endpoints usados (ver SIGEHUBack/src/routes/Kits.route.js):
     GET    /Kits                         → lista (con TotalMateriales)
     GET    /Kits/:id                     → detalle (con Materiales[])
     POST   /Kits                         → alta   { Nombre, Descripcion?, materiales? }
     PUT    /Kits/:id                     → edición (reemplaza materiales si se envía)
     DELETE /Kits/:id                     → borrado físico
     POST   /Kits/:id/materiales          → vincular material (upsert)
     PATCH  /Kits/:id/materiales/:idM     → actualizar cantidad/notas
     DELETE /Kits/:id/materiales/:idM     → desvincular material

   Eliminación de kit: el backend la hace FÍSICA (DELETE), aunque exista el
   flag Activo (el listado ya filtra Activo = true).
   ========================================================================= */

export interface KitsResponse {
  message: string;
}

export interface KitMaterialInput {
  idMaterial: number;
  Cantidad?: number | null;
  Notas?: string | null;
}

const mapMaterial = (raw: Record<string, unknown>): KitMaterial => ({
  idMaterial: (raw['IDMATERIAL'] ?? raw['idMaterial']) as number,
  nombre: (raw['NOMBRE'] ?? raw['nombre'] ?? '') as string,
  unidadMedida: (raw['UNIDADMEDIDA'] ?? raw['unidadMedida'] ?? '') as string,
  cantidad: (raw['CANTIDAD'] ?? raw['cantidad'] ?? null) as number | null,
  notasKit: (raw['NOTASKIT'] ?? raw['notasKit'] ?? null) as string | null,
});

const mapKit = (raw: Record<string, unknown>, materiales?: KitMaterial[]): KitInstalacion => ({
  idKit: (raw['IDKIT'] ?? raw['idKit']) as number,
  nombre: (raw['NOMBRE'] ?? raw['nombre'] ?? '') as string,
  descripcion: (raw['DESCRIPCION'] ?? raw['descripcion'] ?? '') as string,
  totalMateriales: (raw['TOTALMATERIALES'] ?? raw['totalMateriales'] ?? 0) as number,
  totalUnidades: (raw['TOTALUNIDADES'] ?? raw['totalUnidades'] ?? 0) as number,
  materiales: materiales ?? [],
});

const kitBody = (nombre: string, descripcion: string | null, materiales: KitMaterialInput[]): Record<string, unknown> => ({
  Nombre: nombre,
  Descripcion: descripcion ?? null,
  materiales,
});

@Injectable({
  providedIn: 'root',
})
export class KitsService {
  private api = inject(ApiService);

  listar(): Observable<KitInstalacion[]> {
    return this.api.get<Record<string, unknown>[]>('/Kits').pipe(
      map(rows => (rows ?? []).map(row => mapKit(row)))
    );
  }

  obtener(id: number): Observable<KitInstalacion> {
    return this.api.get<Record<string, unknown>>(`/Kits/${id}`).pipe(
      map(raw => {
        const materialesRaw = (raw['Materiales'] ?? raw['materiales'] ?? []) as Record<string, unknown>[];
        return mapKit(raw, materialesRaw.map(m => mapMaterial(m)));
      })
    );
  }

  crear(nombre: string, descripcion: string | null, materiales: KitMaterialInput[]): Observable<KitsResponse> {
    return this.api.post<KitsResponse>('/Kits', kitBody(nombre, descripcion, materiales));
  }

  actualizar(id: number, nombre: string, descripcion: string | null, materiales: KitMaterialInput[]): Observable<KitsResponse> {
    return this.api.put<KitsResponse>(`/Kits/${id}`, kitBody(nombre, descripcion, materiales));
  }

  eliminar(id: number): Observable<KitsResponse> {
    return this.api.delete<KitsResponse>(`/Kits/${id}`);
  }

  // ── Administración puntual de la relación Kits_has_Materiales ──────────
  addMaterial(kitId: number, material: KitMaterialInput): Observable<KitsResponse> {
    return this.api.post<KitsResponse>(`/Kits/${kitId}/materiales`, material);
  }

  updateMaterial(kitId: number, idMaterial: number, material: { Cantidad?: number | null; Notas?: string | null }): Observable<KitsResponse> {
    return this.api.patch<KitsResponse>(`/Kits/${kitId}/materiales/${idMaterial}`, material);
  }

  removeMaterial(kitId: number, idMaterial: number): Observable<KitsResponse> {
    return this.api.delete<KitsResponse>(`/Kits/${kitId}/materiales/${idMaterial}`);
  }
}