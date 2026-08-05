import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Material } from '../core/models/material.model';

/* =========================================================================
   SIGEHU — Servicio de dominio para Materiales / Herramientas.

   Envuelve el ApiService genérico y centraliza el mapeo de datos hacia/desde
   el formato real que devuelve el Backend (columnas en MAYÚSCULAS según la
   normalización de Firebird: IDMATERIAL, NOMBRE, UNIDADMEDIDA, DESCRIPCION,
   ACTIVO).

   Endpoints usados (ver SIGEHUBack/src/routes/Materiales.route.js):
     GET    /Materiales         → lista de materiales activos
     GET    /Materiales/:id     → un material
     POST   /Materiales         → alta   { Nombre, UnidadMedida, Descripcion? }
     PUT    /Materiales/:id     → edición (mismo cuerpo)
     DELETE /Materiales/:id     → soft-delete (Activo = FALSE)
   ======================================================================== */

export interface MaterialesResponse {
  message: string;
}

// Cuerpo exacto que espera el backend (nombres de columna reales).
const toPayload = (m: Pick<Material, 'nombre' | 'unidadMedida' | 'descripcion'>): Record<string, unknown> => ({
  Nombre: m.nombre,
  UnidadMedida: m.unidadMedida ?? '',
  Descripcion: m.descripcion ?? null,
});

const toModel = (raw: Record<string, unknown>): Material => ({
  idMaterial: (raw['IDMATERIAL'] ?? raw['idMaterial']) as number,
  nombre: (raw['NOMBRE'] ?? raw['nombre'] ?? '') as string,
  unidadMedida: (raw['UNIDADMEDIDA'] ?? raw['unidadMedida'] ?? '') as string,
  descripcion: (raw['DESCRIPCION'] ?? raw['descripcion'] ?? null) as string | null,
});

@Injectable({
  providedIn: 'root',
})
export class MaterialesService {
  private api = inject(ApiService);

  listar(): Observable<Material[]> {
    return this.api.get<Record<string, unknown>[]>('/Materiales').pipe(
      map(rows => (rows ?? []).map(row => toModel(row)))
    );
  }

  obtener(id: number): Observable<Material> {
    return this.api.get<Record<string, unknown>>(`/Materiales/${id}`).pipe(
      map(raw => toModel(raw))
    );
  }

  crear(material: Pick<Material, 'nombre' | 'unidadMedida' | 'descripcion'>): Observable<MaterialesResponse> {
    return this.api.post<MaterialesResponse>('/Materiales', toPayload(material));
  }

  actualizar(id: number, material: Pick<Material, 'nombre' | 'unidadMedida' | 'descripcion'>): Observable<MaterialesResponse> {
    return this.api.put<MaterialesResponse>(`/Materiales/${id}`, toPayload(material));
  }

  desactivar(id: number): Observable<MaterialesResponse> {
    return this.api.delete<MaterialesResponse>(`/Materiales/${id}`);
  }
}