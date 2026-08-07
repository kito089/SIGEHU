import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from './api.service';
import type {
  ObrasPorEstado,
  EvolucionObras,
  TiempoEtapa,
  ClienteObras,
  ClientesNuevos,
  TrabajadorObrasActivas,
  TrabajadorGarantias,
  GarantiasResumen,
  ProblemaRecurrente,
  GarantiaMultiple,
  UsoMateriales,
  MaterialSinProveedor,
  ProveedorUsado,
  ProveedorVariedad,
  MaterialPorProveedor,
  KitsUsados,
  MaterialPorKit,
} from '../core/models/reporte.model';
import type { CompraPendiente } from '../core/models/compra.model';

/* =============================================================================
   SIGEHUFront — Servicio de dominio del módulo de Reportes.

   Delega cada lectura al backend (solo rol Propietario) bajo `/Reportes`.
   No mapea columnas MAYÚSCULAS (el backend ya normaliza a CamelCase).
   ============================================================================= */

@Injectable({
  providedIn: 'root',
})
export class ReportesService {
  private api = inject(ApiService);

  // ── Obras ──────────────────────────────────────────────────────────────────
  obrasPorEstado(): Observable<ObrasPorEstado> {
    return this.api.get<ObrasPorEstado>('/Reportes/obras/estado');
  }

  evolucionObras(tipo: 'dia' | 'semana' | 'mes' | 'anio'): Observable<EvolucionObras> {
    return this.api.get<EvolucionObras>(`/Reportes/obras/evolucion?tipo=${tipo}`);
  }

  tiemposPromedioEtapas(): Observable<TiempoEtapa[]> {
    return this.api.get<TiempoEtapa[]>('/Reportes/obras/tiempos');
  }

  // ── Clientes ───────────────────────────────────────────────────────────────
  clientesPorObras(): Observable<ClienteObras[]> {
    return this.api.get<ClienteObras[]>('/Reportes/clientes/por-obras');
  }

  clientesNuevos(): Observable<ClientesNuevos> {
    return this.api.get<ClientesNuevos>('/Reportes/clientes/nuevos');
  }

  // ── Trabajadores ───────────────────────────────────────────────────────────
  obrasActivasPorTrabajador(): Observable<TrabajadorObrasActivas[]> {
    return this.api.get<TrabajadorObrasActivas[]>('/Reportes/trabajadores/obras-activas');
  }

  garantiasPorTrabajador(): Observable<TrabajadorGarantias[]> {
    return this.api.get<TrabajadorGarantias[]>('/Reportes/trabajadores/garantias');
  }

  // ── Garantías ──────────────────────────────────────────────────────────────
  garantiasResumen(): Observable<GarantiasResumen> {
    return this.api.get<GarantiasResumen>('/Reportes/garantias/resumen');
  }

  problemasRecurrentes(): Observable<ProblemaRecurrente[]> {
    return this.api.get<ProblemaRecurrente[]>('/Reportes/garantias/problemas');
  }

  garantiasMultiples(): Observable<GarantiaMultiple[]> {
    return this.api.get<GarantiaMultiple[]>('/Reportes/garantias/multiples');
  }

  // ── Materiales ─────────────────────────────────────────────────────────────
  usoMateriales(): Observable<UsoMateriales> {
    return this.api.get<UsoMateriales>('/Reportes/materiales/uso');
  }

  materialesSinProveedor(): Observable<MaterialSinProveedor[]> {
    return this.api.get<MaterialSinProveedor[]>('/Reportes/materiales/sin-proveedor');
  }

  // ── Proveedores ────────────────────────────────────────────────────────────
  proveedoresUsados(): Observable<ProveedorUsado[]> {
    return this.api.get<ProveedorUsado[]>('/Reportes/proveedores/usados');
  }

  proveedorMayorVariedad(): Observable<ProveedorVariedad[]> {
    return this.api.get<ProveedorVariedad[]>('/Reportes/proveedores/variedad');
  }

  materialesPorProveedor(): Observable<MaterialPorProveedor[]> {
    return this.api.get<MaterialPorProveedor[]>('/Reportes/proveedores/materiales');
  }

  // ── Kits ───────────────────────────────────────────────────────────────────
  kitsUsados(): Observable<KitsUsados> {
    return this.api.get<KitsUsados>('/Reportes/kits/usados');
  }

  materialesPorKit(): Observable<MaterialPorKit[]> {
    return this.api.get<MaterialPorKit[]>('/Reportes/kits/materiales');
  }

  // ── Compras pendientes (bloque del Dashboard) ──────────────────────────────
  comprasPendientes(): Observable<CompraPendiente[]> {
    return this.api.get<Record<string, unknown>[]>('/Compras/pendientes').pipe(
      map(rows =>
        (rows ?? []).map(r => ({
          idCompra: Number(r['idCompra'] ?? r['ID'] ?? 0),
          fechaCompra: String(r['fechaCompra'] ?? r['FechaCompra'] ?? ''),
          proveedores: String(r['proveedores'] ?? ''),
          materiales: String(r['materiales'] ?? ''),
          lineas: Number(r['lineas'] ?? 0),
        }))
      )
    );
  }
}