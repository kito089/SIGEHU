import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Proveedor, ProveedorMaterial } from '../core/models/proveedor.model';

/* =========================================================================
   SIGEHU — Servicio de dominio para Proveedores.

   Centraliza el mapeo hacia/desde el formato real del Backend (columnas en
   MAYÚSCULAS por normalización Firebird) y los contratos exactos de entrada.

   Endpoints usados (ver SIGEHUBack/src/routes/Proveedores.route.js):
     GET    /Proveedores                   → lista (con MATERIALES[] vía pivote)
     POST   /Proveedores                   → alta   { Nombre*, ...opcionales, materiales? }
     PUT    /Proveedores/:id               → edición (reemplaza materiales si se envía)
     DELETE /Proveedores/:id               → soft-delete (Activo = FALSE)
     POST/PUT  /Proveedores/:idP/:idM      → vincular / actualizar material ({precio, notas})
     DELETE /Proveedores/:idP/:idM         → desvincular material

   Nota: no existe GET /Proveedores/:id en el backend; el detalle se obtiene
   de la lista (getProveedores devuelve toda la información necesaria).
   ========================================================================= */

interface RawProveedorMaterial extends Record<string, unknown> {}

interface RawProveedor extends Record<string, unknown> {}

export interface ProveedoresResponse {
  message: string;
}

export interface ProveedorMaterialInput {
  idMaterial: number;
  precio?: number | null;
  notas?: string | null;
}

export interface ProveedorPayload {
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  giroPrincipal?: string | null;
  contactoCompras?: string | null;
  notas?: string | null;
  materiales?: ProveedorMaterialInput[];
}

const mapMaterial = (raw: RawProveedor): ProveedorMaterial => ({
  idMaterial: (raw['IDMATERIAL'] ?? raw['idMaterial']) as number,
  nombre: (raw['NOMBRE'] ?? raw['nombre'] ?? '') as string,
  unidadMedida: (raw['UNIDADMEDIDA'] ?? raw['unidadMedida'] ?? '') as string,
  descripcion: (raw['DESCRIPCION'] ?? raw['descripcion'] ?? null) as string | null,
  precio: (raw['PRECIO'] ?? raw['precio'] ?? null) as number | null,
  notasProveedor: (raw['NOTASPROVEEDOR'] ?? raw['notasProveedor'] ?? null) as string | null,
});

const mapProveedor = (raw: RawProveedor): Proveedor => {
  const materialesRaw = (raw['MATERIALES'] ?? raw['materiales'] ?? []) as RawProveedor[];
  return {
    idProveedor: (raw['IDPROVEEDOR'] ?? raw['idProveedor']) as number,
    nombre: (raw['NOMBRE'] ?? raw['nombre'] ?? '') as string,
    direccion: (raw['DIRECCION'] ?? raw['direccion'] ?? null) as string | null,
    telefono: (raw['TELEFONO'] ?? raw['telefono'] ?? null) as string | null,
    correo: (raw['CORREO'] ?? raw['correo'] ?? null) as string | null,
    giroPrincipal: (raw['GIROPRINCIPAL'] ?? raw['giroPrincipal'] ?? null) as string | null,
    contactoCompras: (raw['CONTACTOCOMPRAS'] ?? raw['contactoCompras'] ?? null) as string | null,
    notas: (raw['NOTAS'] ?? raw['notas'] ?? null) as string | null,
    activo: (raw['ACTIVO'] ?? raw['activo'] ?? true) as boolean,
    materiales: (materialesRaw ?? []).map(m => mapMaterial(m)),
  };
};

// Cuerpo exacto que espera el backend (nombres de columna reales).
const proveedorBody = (payload: ProveedorPayload): Record<string, unknown> => ({
  Nombre: payload.nombre,
  Direccion: payload.direccion ?? null,
  Telefono: payload.telefono ?? null,
  Correo: payload.correo ?? null,
  GiroPrincipal: payload.giroPrincipal ?? null,
  ContactoCompras: payload.contactoCompras ?? null,
  Notas: payload.notas ?? null,
  materiales: (payload.materiales ?? []).map(m => ({
    idMaterial: m.idMaterial,
    precio: m.precio ?? null,
    notas: m.notas ?? null,
  })),
});

@Injectable({
  providedIn: 'root',
})
export class ProveedoresService {
  private api = inject(ApiService);

  listar(): Observable<Proveedor[]> {
    return this.api.get<RawProveedor[]>('/Proveedores').pipe(
      map(rows => (rows ?? [])
        .map(row => mapProveedor(row))
        .filter(p => p.activo !== false))
    );
  }

  // No existe GET /Proveedores/:id; se resuelve desde la lista (activos).
  obtener(id: number): Observable<Proveedor | undefined> {
    return this.listar().pipe(map(list => list.find(p => p.idProveedor === id)));
  }

  crear(payload: ProveedorPayload): Observable<ProveedoresResponse> {
    return this.api.post<ProveedoresResponse>('/Proveedores', proveedorBody(payload));
  }

  actualizar(id: number, payload: ProveedorPayload): Observable<ProveedoresResponse> {
    return this.api.put<ProveedoresResponse>(`/Proveedores/${id}`, proveedorBody(payload));
  }

  desactivar(id: number): Observable<ProveedoresResponse> {
    return this.api.delete<ProveedoresResponse>(`/Proveedores/${id}`);
  }

  // ── Administración puntual de la relación Proveedores_has_Materiales ────
  addMaterial(idP: number, idM: number, precio?: number | null, notas?: string | null): Observable<ProveedoresResponse> {
    return this.api.post<ProveedoresResponse>(`/Proveedores/${idP}/${idM}`, { precio: precio ?? null, notas: notas ?? null });
  }

  updateMaterial(idP: number, idM: number, precio?: number | null, notas?: string | null): Observable<ProveedoresResponse> {
    return this.api.put<ProveedoresResponse>(`/Proveedores/${idP}/${idM}`, { precio: precio ?? null, notas: notas ?? null });
  }

  removeMaterial(idP: number, idM: number): Observable<ProveedoresResponse> {
    return this.api.delete<ProveedoresResponse>(`/Proveedores/${idP}/${idM}`);
  }
}