import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ReportesService } from '../../../services/reportes.service';
import { DonutChartComponent } from '../../../shared/components/reportes/donut-chart.component';
import { BarChartComponent } from '../../../shared/components/reportes/bar-chart.component';
import { LineChartComponent } from '../../../shared/components/reportes/line-chart.component';
import { StackedBarChartComponent } from '../../../shared/components/reportes/stacked-bar-chart.component';
import {
  CHART_PALETTE,
  CHART_DEFAULT_COLOR,
  DonutDatum,
  BarDatum,
  LineDatum,
  StackCategory,
} from '../../../shared/components/reportes/chart.types';
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
} from '../../../core/models/reporte.model';
import type { CompraPendiente } from '../../../core/models/compra.model';

type CategoryId =
  | 'obras' | 'clientes' | 'trabajadores' | 'garantias'
  | 'materiales' | 'compras' | 'proveedores' | 'kits';

interface Categoria {
  id: CategoryId;
  label: string;
  icon: string;
}

const CATEGORIAS: Categoria[] = [
  {
    id: 'obras', label: 'Obras',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M3 21h18"/><path d="M5 21V8l7-5 7 5v13"/><path d="M9 21v-6h6v6"/></svg>',
  },
  {
    id: 'clientes', label: 'Clientes',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>',
  },
  {
    id: 'trabajadores', label: 'Trabajadores',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9.5" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    id: 'garantias', label: 'Garantías',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
  },
  {
    id: 'materiales', label: 'Materiales',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 12l9 5 9-5"/><path d="M3 16l9 5 9-5"/></svg>',
  },
  {
    id: 'compras', label: 'Compras',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>',
  },
  {
    id: 'proveedores', label: 'Proveedores',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  },
  {
    id: 'kits', label: 'Kits',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
  },
];

/** Colores por orden de estado de obra (paleta cancelable). */
function colorEstadoObra(orden: number): string {
  switch (orden) {
    case 1: return '#94A3B8';
    case 2: return '#F59E0B';
    case 3: return '#3B82F6';
    case 4: return '#A855F7';
    case 5: return '#10B981';
    case 6: return '#EF4444';
    case 7: return '#22C55E';
    default: return CHART_DEFAULT_COLOR;
  }
}

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [
    CommonModule,
    DonutChartComponent,
    BarChartComponent,
    LineChartComponent,
    StackedBarChartComponent,
  ],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss',
})
export class ReportesComponent {
  private reportes = inject(ReportesService);
  private router = inject(Router);

  categorias = CATEGORIAS;
  activeCategory = signal<CategoryId>('obras');

  cargando = signal(false);
  error = signal<string>('');

  // Datos crudos por categoría (se cachean tras primera carga).
  obrasStato = signal<ObrasPorEstado | null>(null);
  evolucion = signal<EvolucionObras | null>(null);
  tiempos = signal<TiempoEtapa[]>([]);
  clientesObras = signal<ClienteObras[]>([]);
  clientesNuevos = signal<ClientesNuevos | null>(null);
  trabObras = signal<TrabajadorObrasActivas[]>([]);
  trabGarantias = signal<TrabajadorGarantias[]>([]);
  garantias = signal<GarantiasResumen | null>(null);
  problemas = signal<ProblemaRecurrente[]>([]);
  multiples = signal<GarantiaMultiple[]>([]);
  usoMateriales = signal<UsoMateriales | null>(null);
  sinProveedor = signal<MaterialSinProveedor[]>([]);
  proveedoresUsados = signal<ProveedorUsado[]>([]);
  proveedorVariedad = signal<ProveedorVariedad[]>([]);
  materialesPorProveedor = signal<MaterialPorProveedor[]>([]);
  kitsUsados = signal<KitsUsados | null>(null);
  materialesPorKit = signal<MaterialPorKit[]>([]);
  compras = signal<CompraPendiente[]>([]);

  private cargado = new Set<string>();

  ngOnInit(): void {
    this.loadCategory(this.activeCategory());
  }

  selectCategory(id: CategoryId): void {
    this.activeCategory.set(id);
    this.loadCategory(id);
  }

  async loadCategory(id: CategoryId): Promise<void> {
    if (this.cargado.has(id)) return;
    this.cargando.set(true);
    this.error.set('');
    try {
      const t = firstValueFrom;
      switch (id) {
        case 'obras': {
          const [obras, evol, tiempos] = await Promise.all([
            t(this.reportes.obrasPorEstado()),
            t(this.reportes.evolucionObras('mes')),
            t(this.reportes.tiemposPromedioEtapas()),
          ]);
          this.obrasStato.set(obras);
          this.evolucion.set(evol);
          this.tiempos.set(tiempos);
          break;
        }
        case 'clientes': {
          const [porObras, nuevos] = await Promise.all([
            t(this.reportes.clientesPorObras()),
            t(this.reportes.clientesNuevos()),
          ]);
          this.clientesObras.set(porObras);
          this.clientesNuevos.set(nuevos);
          break;
        }
        case 'trabajadores': {
          const [obras, garantias] = await Promise.all([
            t(this.reportes.obrasActivasPorTrabajador()),
            t(this.reportes.garantiasPorTrabajador()),
          ]);
          this.trabObras.set(obras);
          this.trabGarantias.set(garantias);
          break;
        }
        case 'garantias': {
          const [resumen, problemas, multiples] = await Promise.all([
            t(this.reportes.garantiasResumen()),
            t(this.reportes.problemasRecurrentes()),
            t(this.reportes.garantiasMultiples()),
          ]);
          this.garantias.set(resumen);
          this.problemas.set(problemas);
          this.multiples.set(multiples);
          break;
        }
        case 'materiales': {
          this.usoMateriales.set(await t(this.reportes.usoMateriales()));
          this.sinProveedor.set(await t(this.reportes.materialesSinProveedor()));
          break;
        }
        case 'compras': {
          this.compras.set(await t(this.reportes.comprasPendientes()));
          break;
        }
        case 'proveedores': {
          const [usados, variedad, materiales] = await Promise.all([
            t(this.reportes.proveedoresUsados()),
            t(this.reportes.proveedorMayorVariedad()),
            t(this.reportes.materialesPorProveedor()),
          ]);
          this.proveedoresUsados.set(usados);
          this.proveedorVariedad.set(variedad);
          this.materialesPorProveedor.set(materiales);
          break;
        }
        case 'kits': {
          const [usados, materiales] = await Promise.all([
            t(this.reportes.kitsUsados()),
            t(this.reportes.materialesPorKit()),
          ]);
          this.kitsUsados.set(usados);
          this.materialesPorKit.set(materiales);
          break;
        }
      }
      this.cargado.add(id);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No se pudo cargar el reporte.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ── Transformaciones a datos de gráfica ───────────────────────────────────
  readonly obrasDonut = computed<DonutDatum[]>(() =>
    (this.obrasStato()?.estados ?? []).map(e => ({
      label: e.estado,
      value: e.total,
      color: colorEstadoObra(e.orden),
    }))
  );

  readonly evolucionLine = computed<LineDatum[]>(() =>
    (this.evolucion()?.serie ?? []).map(p => ({ label: p.label, value: p.total }))
  );

  readonly tiemposBars = computed<BarDatum[]>(() =>
    (this.tiempos() ?? []).map(e => ({
      label: e.estado,
      value: e.promedioDias,
      color: CHART_DEFAULT_COLOR,
    }))
  );

  readonly clientesBars = computed<BarDatum[]>(() =>
    (this.clientesObras() ?? []).map(c => ({
      label: c.nombre,
      value: c.total,
      color: CHART_DEFAULT_COLOR,
    }))
  );

  readonly clientesLine = computed<LineDatum[]>(() => {
    const s = this.clientesNuevos()?.serie ?? [];
    const nombres = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return s.map(m => ({ label: `${nombres[(m.mes - 1) % 12]}-${m.anio}`, value: m.total }));
  });

  readonly trabObrasBars = computed<BarDatum[]>(() =>
    (this.trabObras() ?? []).map(t => ({
      label: t.nombre, value: t.obras, color: CHART_DEFAULT_COLOR,
    }))
  );

  readonly trabGarantiasBars = computed<BarDatum[]>(() =>
    (this.trabGarantias() ?? []).map(t => ({
      label: t.nombre, value: t.garantias, color: CHART_DEFAULT_COLOR,
    }))
  );

  readonly garantiasDonut = computed<DonutDatum[]>(() =>
    (this.garantias()?.porEstado ?? []).map(e => ({
      label: e.estado, value: e.total,
      color: CHART_PALETTE[e.orden % CHART_PALETTE.length],
    }))
  );

  readonly usoMaterBars = computed<BarDatum[]>(() =>
    (this.usoMateriales()?.masUtilizados ?? []).map(m => ({
      label: m.nombre, value: m.obras, color: CHART_DEFAULT_COLOR,
    }))
  );

  readonly proveedoresBars = computed<BarDatum[]>(() =>
    (this.proveedoresUsados() ?? []).map(p => ({
      label: p.nombre, value: p.compras || p.lineas, color: CHART_DEFAULT_COLOR,
    }))
  );

  readonly variedadBars = computed<BarDatum[]>(() =>
    (this.proveedorVariedad() ?? []).map(p => ({
      label: p.nombre, value: p.variedad, color: CHART_DEFAULT_COLOR,
    }))
  );

  readonly materialesPorProveedorStack = computed<StackCategory[]>(() => {
    const datos = this.materialesPorProveedor() ?? [];
    const mapa = new Map<string, { name: string; value: number; color: string }[]>();
    datos.forEach(d => {
      if (!mapa.has(d.proveedor)) mapa.set(d.proveedor, []);
      const cards = mapa.get(d.proveedor)!;
      cards.push({ name: d.material, value: d.cantidad, color: this.hashColor(d.material) });
    });
    return [...mapa.entries()].map(([proveedor, series]) => ({ category: proveedor, series }));
  });

  readonly kitsDonut = computed<DonutDatum[]>(() =>
    (this.kitsUsados()?.kits ?? []).map((k, i) => ({
      label: k.nombre, value: k.asignaciones,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    }))
  );

  readonly materialesKitStack = computed<StackCategory[]>(() => {
    const datos = this.materialesPorKit() ?? [];
    const mapa = new Map<string, { name: string; value: number; color: string }[]>();
    datos.forEach(d => {
      if (!mapa.has(d.kit)) mapa.set(d.kit, []);
      mapa.get(d.kit)!.push({ name: d.material, value: d.cantidad, color: this.hashColor(d.material) });
    });
    return [...mapa.entries()].map(([kit, series]) => ({ category: kit, series }));
  });

  private hashColor(key: string): string {
    let h = 0;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 997;
    return CHART_PALETTE[h % CHART_PALETTE.length];
  }

  // ── Utilidad para tablas ──────────────────────────────────────────────────
  irAOrdenes(): void {
    this.router.navigate(['/admin/orden']);
  }

  irAConsultas(): void {
    this.router.navigate(['/admin/analitico']);
  }
}