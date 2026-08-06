import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';

export type EntidadBusqueda =
  | 'Cliente'
  | 'Obra'
  | 'Trabajador'
  | 'Proveedor'
  | 'Material'
  | 'Kit'
  | 'Garantia'
  | 'OrdenCompra';

export interface SearchResult {
  tipo: EntidadBusqueda;
  id: number;
  titulo: string;
  subtitulo: string;
  ruta: string;
}

const TTL_MS = 60_000;

/**
 * Buscador Global Multi-Entidad (RF-31).
 *
 * Consulta todas las entidades principales del sistema y filtra en el cliente
 * sobre los campos visibles de cada listado (nombre, correo, teléfono, estado…).
 * Los resultados se cachean por sesión (60 s) para evitar llamadas repetidas.
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private api = inject(ApiService);
  private cache = new Map<string, { data: unknown[]; ts: number }>();

  searchGlobal(query: string): Observable<SearchResult[]> {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return of([]);

    return forkJoin({
      clientes: this.obtener('/Clientes'),
      obras: this.obtener('/Obras'),
      trabajadores: this.obtener('/Trabajadores'),
      proveedores: this.obtener('/Proveedores'),
      materiales: this.obtener('/Materiales'),
      kits: this.obtener('/Kits'),
      garantias: this.obtener('/Garantias'),
      compras: this.obtener('/Compras')
    }).pipe(
      map(({ clientes, obras, trabajadores, proveedores, materiales, kits, garantias, compras }) => [
        ...this.safeMap(clientes, (c: any) => {
          const nombre = this.primero(c, ['nombre', 'NOMBRE', 'NOMBRECOMPLETO'], '—');
          const correo = this.primero(c, ['correo', 'CORREO', 'CORREOPRINCIPAL'], '');
          const telefono = this.primero(c, ['telefono', 'TELEFONO', 'TELEFONOPRINCIPAL'], '');
          return this.coincide(q, [nombre, correo, telefono])
            ? {
                tipo: 'Cliente' as const,
                id: this.id(c, ['idCliente', 'IDCLIENTE']),
                titulo: nombre,
                subtitulo: [telefono, correo].filter(Boolean).join(' • '),
                ruta: '/admin/clientes'
              }
            : null;
        }),
        ...this.safeMap(obras, (o: any) => {
          const nombre = this.primero(o, ['nombreObra', 'NOMBREOBRA', 'nombre', 'NOMBRE'], '—');
          return this.coincide(q, [nombre, this.primero(o, ['direccion', 'DIRECCION'], '')])
            ? {
                tipo: 'Obra' as const,
                id: this.id(o, ['idObra', 'IDOBRA']),
                titulo: nombre,
                subtitulo: [this.primero(o, ['nombreCliente', 'NOMBRECLIENTE'], ''), this.primero(o, ['estadoObra', 'ESTADOOBRA'], '')].filter(Boolean).join(' • '),
                ruta: '/admin/obras'
              }
            : null;
        }),
        ...this.safeMap(trabajadores, (t: any) => {
          const nombre = this.primero(t, ['nombreCompleto', 'NOMBRECOMPLETO'], '—');
          const usuario = this.primero(t, ['nombreUsuario', 'NOMBREUSUARIO'], '');
          const telefono = this.primero(t, ['telefono', 'TELEFONO'], '');
          return this.coincide(q, [nombre, usuario, telefono])
            ? {
                tipo: 'Trabajador' as const,
                id: this.id(t, ['idTrabajador', 'IDTRABAJADOR']),
                titulo: nombre,
                subtitulo: [usuario, telefono].filter(Boolean).join(' • '),
                ruta: '/admin/trabajadores'
              }
            : null;
        }),
        ...this.safeMap(proveedores, (p: any) => {
          const nombre = this.primero(p, ['nombre', 'NOMBRE', 'EMPRESA'], '—');
          const correo = this.primero(p, ['correo', 'CORREO'], '');
          const telefono = this.primero(p, ['telefono', 'TELEFONO'], '');
          return this.coincide(q, [nombre, correo, telefono, this.primero(p, ['giroPrincipal', 'GIROPRINCIPAL'], ''), this.primero(p, ['contactoCompras', 'CONTACTOCOMPRAS'], '')])
            ? {
                tipo: 'Proveedor' as const,
                id: this.id(p, ['idProveedor', 'IDPROVEEDOR']),
                titulo: nombre,
                subtitulo: [telefono, correo].filter(Boolean).join(' • '),
                ruta: '/admin/proveedores'
              }
            : null;
        }),
        ...this.safeMap(materiales, (m: any) => {
          const nombre = this.primero(m, ['nombre', 'NOMBRE'], '—');
          return this.coincide(q, [nombre, this.primero(m, ['unidadMedida', 'UNIDADMEDIDA'], ''), this.primero(m, ['descripcion', 'DESCRIPCION'], '')])
            ? {
                tipo: 'Material' as const,
                id: this.id(m, ['idMaterial', 'IDMATERIAL']),
                titulo: nombre,
                subtitulo: this.primero(m, ['unidadMedida', 'UNIDADMEDIDA'], ''),
                ruta: '/admin/materiales'
              }
            : null;
        }),
        ...this.safeMap(kits, (k: any) => {
          const nombre = this.primero(k, ['nombre', 'NOMBRE'], '—');
          return this.coincide(q, [nombre, this.primero(k, ['descripcion', 'DESCRIPCION'], '')])
            ? {
                tipo: 'Kit' as const,
                id: this.id(k, ['idKit', 'IDKIT']),
                titulo: nombre,
                subtitulo: this.primero(k, ['totalMateriales', 'TOTALMATERIALES'], 0) ? `${this.primero(k, ['totalMateriales', 'TOTALMATERIALES'], 0)} materiales` : '',
                ruta: '/admin/kits'
              }
            : null;
        }),
        ...this.safeMap(garantias, (g: any) => {
          const descripcion = this.primero(g, ['descripcion', 'DESCRIPCION'], '—');
          return this.coincide(q, [
            descripcion,
            this.primero(g, ['nombreCliente', 'NOMBRECLIENTE'], ''),
            this.primero(g, ['nombreObra', 'NOMBREOBRA'], ''),
            this.primero(g, ['estadoGarantia', 'ESTADOGARANTIA'], '')
          ])
            ? {
                tipo: 'Garantia' as const,
                id: this.id(g, ['idGarantia', 'IDGARANTIA']),
                titulo: descripcion,
                subtitulo: [this.primero(g, ['nombreCliente', 'NOMBRECLIENTE'], ''), this.primero(g, ['nombreObra', 'NOMBREOBRA'], ''), this.primero(g, ['estadoGarantia', 'ESTADOGARANTIA'], '')].filter(Boolean).join(' • '),
                ruta: '/admin/garantias'
              }
            : null;
        }),
        ...this.safeMap(compras, (c: any) => {
          const fecha = this.primero(c, ['fechaCompra', 'FECHACOMPRA'], '');
          const notas = this.primero(c, ['notas', 'NOTAS'], '');
          const trabajador = this.primero(c, ['nombreTrabajador', 'NOMBRETRABAJADOR'], '');
          return this.coincide(q, [fecha, notas, trabajador])
            ? {
                tipo: 'OrdenCompra' as const,
                id: this.id(c, ['idCompra', 'IDCOMPRA']),
                titulo: `Orden #${this.id(c, ['idCompra', 'IDCOMPRA'])}`,
                subtitulo: [trabajador, fecha].filter(Boolean).join(' • '),
                ruta: '/admin/orden'
              }
            : null;
        })
      ].filter((r): r is SearchResult => r !== null))
    );
  }

  private obtener(ruta: string): Observable<unknown[]> {
    const cached = this.cache.get(ruta);
    if (cached && Date.now() - cached.ts < TTL_MS) return of(cached.data);
    return this.api.get<unknown[]>(ruta).pipe(
      map((data) => {
        this.cache.set(ruta, { data: data ?? [], ts: Date.now() });
        return data ?? [];
      })
    );
  }

  private safeMap<T>(arr: T[] | null | undefined, fn: (item: T) => SearchResult | null): Array<SearchResult | null> {
    return Array.isArray(arr) ? arr.map(fn) : [];
  }

  private primero(row: any, keys: string[], fallback: unknown): any {
    for (const key of keys) {
      const v = row?.[key];
      if (v !== undefined && v !== null && v !== '') return v;
    }
    return fallback;
  }

  private id(row: any, keys: string[]): number {
    return Number(this.primero(row, keys, 0)) || 0;
  }

  private coincide(q: string, campos: unknown[]): boolean {
    const valor = String(q).toLowerCase();
    return campos.some((c) => String(c ?? '').toLowerCase().includes(valor));
  }
}
