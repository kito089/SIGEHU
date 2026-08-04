import { Injectable } from '@angular/core';
import { Observable, forkJoin, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import type { Cliente } from '../models/cliente.model';
import type { Obra } from '../models/obra.model';
import type { Proveedor } from '../models/proveedor.model';

export interface SearchResult {
  tipo: 'Cliente' | 'Obra' | 'Proveedor';
  id: number;
  titulo: string;
  subtitulo: string;
  ruta: string;
}

@Injectable({ providedIn: 'root' })
export class SearchService {
  constructor(private api: ApiService) {}

  searchGlobal(query: string): Observable<SearchResult[]> {
    const q = query.trim();
    if (q.length < 2) return of([]);

    return forkJoin({
      clientes: this.api.get<Cliente[]>(`/Clientes?search=${encodeURIComponent(q)}`),
      obras: this.api.get<Obra[]>(`/Obras?search=${encodeURIComponent(q)}`),
      proveedores: this.api.get<Proveedor[]>(`/Proveedores?search=${encodeURIComponent(q)}`)
    }).pipe(
      map(({ clientes, obras, proveedores }) => [
        ...this.safeMap(clientes, (c: any) => ({
          tipo: 'Cliente' as const,
          id: c.idCliente ?? c.IDCLIENTE ?? 0,
          titulo: c.nombre ?? c.NOMBRECOMPLETO ?? c.NOMBRE ?? '—',
          subtitulo: `${c.totalObrasActivas ?? c.TOTALOBRASACTIVAS ?? 0} obras`,
          ruta: '/admin/clientes'
        })),
        ...this.safeMap(obras, (o: any) => ({
          tipo: 'Obra' as const,
          id: o.idObra ?? o.IDOBRA ?? 0,
          titulo: o.nombre ?? o.NOMBRE ?? o.NOMBREOBRA ?? '—',
          subtitulo: [o.nombreCliente ?? o.NOMBRECLIENTE, o.estadoObra ?? o.ESTADOOBRA].filter(Boolean).join(' • '),
          ruta: '/admin/obras'
        })),
        ...this.safeMap(proveedores, (p: any) => ({
          tipo: 'Proveedor' as const,
          id: p.idProveedor ?? p.IDPROVEEDOR ?? 0,
          titulo: p.empresa ?? p.NOMBRE ?? '—',
          subtitulo: [p.contacto ?? p.CONTACTO, p.materiales?.length ? `${p.materiales.length} materiales` : p.MATERIALES?.length ? `${p.MATERIALES.length} materiales` : ''].filter(Boolean).join(' • '),
          ruta: '/admin/proveedores'
        }))
      ]));
  }

  private safeMap<T, R>(arr: T[] | null | undefined, fn: (item: T) => R): R[] {
    return Array.isArray(arr) ? arr.map(fn) : [];
  }
}
