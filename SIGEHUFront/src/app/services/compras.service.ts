import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import { Compra, CompraPayload, DetalleCompra } from '../core/models/compra.model';

/* =========================================================================
   SIGEHU — Servicio de dominio para Órdenes de Compra.

   Centraliza el mapeo hacia/desde el formato real del Backend (columnas en
   MAYÚSCULAS por normalización Firebird) para la cabecera de `Compras` y
   los detalles de `DetallesCompras`.

   Endpoints usados (ver SIGEHUBack/src/routes/Compras.route.js):
     GET    /Compras           → lista de compras activas (con NombreTrabajador)
     GET    /Compras/:id        → una compra (con el arreglo Detalles[])
     POST   /Compras            → alta  { idTrabajador, FechaCompra?, Notas?, detalles[] }
     PUT    /Compras/:id        → edición (reemplaza detalles si se envía)
     DELETE /Compras/:id        → soft-delete (Activo = FALSE)
   ========================================================================= */

interface RawRecord extends Record<string, unknown> {}

const num = (v: unknown, fallback = 0): number => Number(v ?? fallback);

const bol = (v: unknown): boolean => v === true || v === 1 || v === 'true';

const str = (v: unknown): string => (v == null ? '' : String(v));

const mapDetalle = (raw: RawRecord): DetalleCompra => ({
  idDetalleCompra: num(raw['IDDETALLECOMPRA'] ?? raw['idDetalleCompra'], 0) || undefined,
  idProveedor: num(raw['PROVEEDORES_HAS_MATERIALES_PROVEEDORES_IDPROVEEDOR'] ?? raw['idProveedor']),
  idMaterial: num(raw['PROVEEDORES_HAS_MATERIALES_MATERIALES_IDMATERIAL'] ?? raw['idMaterial']),
  nombreMaterial: str(raw['NOMBREMATERIAL'] ?? raw['nombreMaterial']),
  unidadMedida: str(raw['UNIDADMEDIDA'] ?? raw['unidadMedida']) || undefined,
  nombreProveedor: str(raw['NOMBREPROVEEDOR'] ?? raw['nombreProveedor']),
  direccionProveedor: (raw['DIRECCIONPROVEEDOR'] ?? raw['direccionProveedor'] ?? null) as string | null,
  telefonoProveedor: (raw['TELEFONOPROVEEDOR'] ?? raw['telefonoProveedor'] ?? null) as string | null,
  cantidad: num(raw['CANTIDAD'] ?? raw['cantidad']),
  medida: (raw['MEDIDA'] ?? raw['medida'] ?? null) as string | null,
});

const mapCompra = (raw: RawRecord): Compra => ({
  idCompra: num(raw['IDCOMPRA'] ?? raw['idCompra']),
  trabajadoresIdTrabajador: num(raw['TRABAJADORES_IDTRABAJADOR'] ?? raw['trabajadoresIdTrabajador']),
  nombreTrabajador: str(raw['NOMBRETRABAJADOR'] ?? raw['nombreTrabajador']),
  // El backend normaliza a "YYYY-MM-DD HH:MM" en FechaCompra/FechaCreacion
  // (claves CamelCase); se prefieren a las columnas crudas FECHACOMPRA/FECHACREACION.
  fechaCompra: str(raw['FechaCompra'] ?? raw['FECHACOMPRA'] ?? raw['fechaCompra']),
  fechaCreacion: str(raw['FechaCreacion'] ?? raw['FECHACREACION'] ?? raw['fechaCreacion']),
  notas: (raw['NOTAS'] ?? raw['notas'] ?? null) as string | null,
  recibida: bol(raw['RECIBIDA'] ?? raw['recibida']),
  activo: (raw['ACTIVO'] ?? raw['activo'] ?? true) as boolean,
  detalles: ((raw['DETALLES'] ?? raw['Detalles'] ?? raw['detalles'] ?? []) as RawRecord[]).map(mapDetalle),
});

@Injectable({
  providedIn: 'root',
})
export class ComprasService {
  private api = inject(ApiService);

  listar(): Observable<Compra[]> {
    return this.api.get<RawRecord[]>('/Compras').pipe(
      map(rows => (rows ?? []).map(row => mapCompra(row)).filter(c => c.activo !== false))
    );
  }

  obtener(id: number): Observable<Compra> {
    return this.api.get<RawRecord>(`/Compras/${id}`).pipe(map(row => mapCompra(row)));
  }

  crear(payload: CompraPayload): Observable<{ message: string }> {
    return this.api.post<{ message: string }>('/Compras', compraBody(payload));
  }

  actualizar(id: number, payload: CompraPayload): Observable<{ message: string }> {
    return this.api.put<{ message: string }>(`/Compras/${id}`, compraBody(payload));
  }

  desactivar(id: number): Observable<{ message: string }> {
    return this.api.delete<{ message: string }>(`/Compras/${id}`);
  }
}

// Cuerpo exacto que espera el backend (nombres de columna reales).
function compraBody(payload: CompraPayload): Record<string, unknown> {
  return {
    idTrabajador: payload.idTrabajador,
    FechaCompra: payload.FechaCompra ?? null,
    Notas: payload.Notas ?? null,
    detalles: payload.detalles.map(d => ({
      idProveedor: d.idProveedor,
      idMaterial: d.idMaterial,
      Cantidad: d.cantidad,
      Medida: d.medida ?? null,
    })),
  };
}