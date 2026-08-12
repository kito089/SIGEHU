import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../services/api.service';
import { AuthService } from '../../../../services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

/* =========================================================================
   SIGEHU — Detalle de Obra (página completa)

   Ruta: /admin/obras/detalle/:id  (acceso desde árbol Trabajos/Obras y
   desde la gestión de Obras).

   Muestra:
     - Información general (cliente, dirección, medidas, fechas).
     - Historial (notas y fotos por etapa).
     - Trabajadores asignados por etapa.
     - Pagos registrados (solo visible para roles que no sean Trabajador).
   ========================================================================= */

interface EstadoDetalle {
  id: number;
  nombre: string;
  orden: number;
  fecha?: string;
}

interface NotaDetalle {
  id: number;
  nota: string;
  fecha: string;
  idEstadoObra: number;
  estadoObra?: string;
  trabajador?: string;
}

interface FotoDetalle {
  id: number;
  ruta: string;
  idEstadoObra: number;
  estadoObra?: string;
  trabajador?: string;
  url?: string;
}

interface TrabajadorAsignado {
  idDetalleAsignacion: number;
  idTrabajador: number;
  nombre?: string;
  telefono?: string;
  idEstadoObra: number;
  estadoObra?: string;
  fechaAsignacion?: string;
}

interface PagoDetalle {
  id: number;
  monto: number;
  fecha: string;
  tipoPago?: string;
  formaPago?: string;
  estadoObra?: string;
  trabajador?: string;
}

@Component({
  selector: 'app-obra-detalle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './obra-detalle.component.html',
  styleUrl: './obra-detalle.component.scss',
})
export class ObraDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  idObra: number | null = null;

  cargando = signal(true);
  error = signal<string | null>(null);

  obra = signal<any>(null);
  estados = signal<EstadoDetalle[]>([]);
  notas = signal<NotaDetalle[]>([]);
  fotos = signal<FotoDetalle[]>([]);
  trabajadores = signal<TrabajadorAsignado[]>([]);
  pagos = signal<PagoDetalle[]>([]);

  // Pestaña activa: 'general' | 'historial' | 'trabajadores' | 'pagos'
  tab = signal<'general' | 'historial' | 'trabajadores' | 'pagos'>('general');

  esTrabajador = computed(() => this.auth.isWorker());

  // Totales para la vista rápida.
  totalPagos = computed(() =>
    this.pagos().reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
  );

  // Estado actual de la obra con color asociado (reutiliza el mapa de colores
  // de ObrasComponent para mantener consistencia visual con el resto de la app).
  private readonly MAPA_ESTADOS_COLOR: { nombre: string; color: string }[] = [
    { nombre: 'Solicitud recibida', color: '#94A3B8' },
    { nombre: 'Levantamiento pendiente', color: '#F59E0B' },
    { nombre: 'En fabricación', color: '#3B82F6' },
    { nombre: 'Instalación programada', color: '#A855F7' },
    { nombre: 'Instalado', color: '#10B981' },
    { nombre: 'Garantía', color: '#EF4444' },
    { nombre: 'Finalizado', color: '#64748B' },
    { nombre: 'Pendiente de aceptación', color: '#3B82F6' },
  ];

  // Estado actual visible: { nombre, color, orden }. 'orden' permite mostrar un
  // subtítulo de etapa (Levantamiento / Fabricación / Instalación) coherente con
  // el requerimiento sin inventar estados nuevos.
  estadoActualInfo = computed(() => {
    const ob = this.obra();
    const nombre = String(ob?.ESTADOBRA ?? ob?.estadoObra ?? '') || 'Sin estado';
    const found = this.MAPA_ESTADOS_COLOR.find(
      (e) => e.nombre.toLowerCase() === nombre.toLowerCase()
    );
    return {
      nombre,
      color: found?.color ?? '#94A3B8',
    };
  });

  async ngOnInit(): Promise<void> {
    this.idObra = Number(this.route.snapshot.paramMap.get('id')) || null;
    if (!this.idObra) {
      this.error.set('Obra no válida.');
      this.cargando.set(false);
      return;
    }
    await this.cargarTodo();
  }

  private async cargarTodo(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    // Helper: convierte una llamada al API en Promise que no rechaza.
    const q = async <T>(o: Promise<T> | null): Promise<T | null> => {
      if (!o) return null;
      try {
        return await o;
      } catch {
        return null;
      }
    };

    try {
      // Queries en paralelo; los opcionales no impiden renderizar la página.
      const [detalle, estadosRaw, notasRaw, fotosRaw, trabajadoresRaw, pagosRaw] =
        await Promise.all([
          q(firstValueFrom(this.api.get<any>('/Obras/detalle/' + this.idObra))),
          q(firstValueFrom(this.api.get<any[]>('/Obras/estados'))),
          q(firstValueFrom(this.api.get<any[]>('/Obras/' + this.idObra + '/notas'))),
          q(firstValueFrom(this.api.get<any[]>('/Obras/' + this.idObra + '/fotos'))),
          q(firstValueFrom(this.api.get<any[]>('/Obras/' + this.idObra + '/trabajadores'))),
          // Pago: solo se consulta para roles administrativos (evita 403).
          this.auth.isWorker()
            ? Promise.resolve(null)
            : q(firstValueFrom(this.api.get<any[]>('/Obras/' + this.idObra + '/pagos'))),
        ]);

      if (detalle) {
        this.obra.set(detalle);
      } else {
        this.error.set('No se pudo cargar la obra.');
      }

      const listaEstados: any[] = (estadosRaw as any[]) || [];
      this.estados.set(
        listaEstados
          .map((e) => ({
            id: Number(e.IDESTADOOBRA ?? e.idEstadoObra),
            nombre: String(e.NOMBRE ?? e.nombre ?? ''),
            orden: Number(e.ORDEN ?? e.orden ?? 0),
          }))
          .filter((e) => e.id && e.nombre)
      );

      const listaNotas: any[] = (notasRaw as any[]) || [];
      this.notas.set(
        listaNotas.map((n) => ({
          id: Number(n.IDNOTAOBRA ?? n.idNotaObra),
          nota: String(n.NOTA ?? n.nota ?? ''),
          fecha: n.FECHACREACION ?? n.fechaCreacion ?? '',
          idEstadoObra: Number(n.ESTADOSOBRA_IDESTADOOBRA ?? n.idEstadoObra ?? 0),
        }))
      );

      const listaFotos: any[] = (fotosRaw as any[]) || [];
      this.fotos.set(
        listaFotos.map((f) => ({
          id: Number(f.IDFOTOOBRA ?? f.idFotoObra),
          ruta: String(f.RUTAARCHIVO ?? f.rutaArchivo ?? ''),
          idEstadoObra: Number(f.ESTADOSOBRA_IDESTADOOBRA ?? f.idEstadoObra ?? 0),
        }))
      );

      // Carga las imágenes usando el token de autenticación (las fotos ya se
      // registran como BLOB en la BD; el <img> no puede mandar Authorization).
      this.cargarImagenesFotos(listaFotos);

      const listaTrabajadores: any[] = (trabajadoresRaw as any[]) || [];
      this.trabajadores.set(
        listaTrabajadores.map((t) => ({
          idDetalleAsignacion: Number(t.IDDETALLEASIGNACION ?? t.idDetalleAsignacion),
          idTrabajador: Number(t.TRABAJADORES_IDTRABAJADOR ?? t.idTrabajador ?? 0),
          nombre: t.NOMBRECOMPLETO ?? t.nombreCompleto ?? '',
          telefono: t.TELEFONOTRABAJADOR ?? t.telefonoTrabajador ?? '',
          idEstadoObra: Number(t.ESTADOSOBRA_IDESTADOOBRA ?? t.idEstadoObra ?? 0),
          estadoObra: t.ESTADOBRA ?? t.estadoObra ?? '',
          fechaAsignacion: t.FECHAASIGNACION ?? t.fechaAsignacion ?? '',
        }))
      );

      const listaPagos: any[] = (pagosRaw as any[]) || [];
      this.pagos.set(
        listaPagos.map((p) => ({
          id: Number(p.IDDETALLEPAGO ?? p.idDetallePago),
          monto: Number(p.MONTO ?? p.monto ?? 0),
          fecha: p.FECHAREGISTRO ?? p.fechaRegistro ?? '',
          tipoPago: p.TIPOPAGO ?? p.tipoPago ?? '',
          formaPago: p.FORMAPAGO ?? p.formaPago ?? '',
          estadoObra: p.ESTADOOBRAALPAGO ?? p.estadoObra ?? '',
          trabajador: p.TRABAJADORQUEREGISTRO ?? p.trabajador ?? '',
        }))
      );
    } catch {
      this.error.set('Error al cargar la información de la obra.');
    } finally {
      this.cargando.set(false);
    }
  }

  nombreEstado(id: number): string {
    const e = this.estados().find((x) => x.id === id);
    return e?.nombre ?? 'Sin etapa';
  }

  formatearFecha(valor: string | Date | undefined | null): string {
    if (!valor) return '—';
    const fecha = new Date(String(valor));
    if (isNaN(fecha.getTime())) return String(valor);
    return fecha.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  formatearMonto(monto: number): string {
    return monto.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  }

  urlFoto(f: FotoDetalle): string {
    // Las fotos nuevas se muestran como Blob (requieren el token de auth, que
    // el <img> no envía) vía objectURL. Las antiguas solo tienen ruta estática.
    return f.url || '/uploads/' + f.ruta.replace(/^uploads[\\/]/, '');
  }

  // Descarga cada foto autenticada y la convierte en objectURL local.
  private async cargarImagenesFotos(listaFotos: any[]): Promise<void> {
    const conId = listaFotos.filter((f) => f.IDFOTOOBRA ?? f.idFotoObra);
    if (conId.length === 0) return;

    const actuales = this.fotos();
    for (const item of conId) {
      const idFoto = Number(item.IDFOTOOBRA ?? item.idFotoObra);
      if (!idFoto) continue;

      try {
        const blob = await firstValueFrom(this.api.getBlob('/Obras/Fotos/' + idFoto + '/archivo'));
        const url = URL.createObjectURL(blob);
        const idx = actuales.findIndex((x) => x.id === idFoto);
        if (idx >= 0) {
          actuales[idx] = { ...actuales[idx], url };
          this.fotos.set([...actuales]);
        }
      } catch {
        // Foto ilegible o sin token: se deja la ruta estática como respaldo.
      }
    }
  }

  formatoMedida(valor: any): string {
    const n = Number(valor);
    return valor != null && !isNaN(n) && n > 0 ? `${n} m` : '—';
  }

  setTab(tab: 'general' | 'historial' | 'trabajadores' | 'pagos'): void {
    this.tab.set(tab);
  }

  regresar(): void {
    // El árbol de navegación SIGEHU ya no expone "Obras y Proyectos" en el
    // sidebar (se eliminó como acceso principal). El Detalle de Obra se alcanza
    // desde tres puntos: Dashboard (Kanban/calendario), Detalle de Cliente
    // (pestaña Trabajos/Obras) y el omnibox. Regresar debe devolver al usuario
    // al punto de origen, NO a la página obsoleta /admin/obras.
    //
    // Resolución:
    //   1) Si la navegación trajo state.clienteId (vino de Detalle de Cliente),
    //      regresar ahí.
    //   2) En otro caso, si hay historial de navegación real, usar history.back()
    //      para volver a la pantalla exacta de origen (Dashboard, etc.).
    //   3) Si no hay historial (entrada directa por URL/refresh), ir al Dashboard,
    //      que es la pantalla principal vigente de obras.
    const state = (this.router.getCurrentNavigation()?.extras.state ??
      (history.state as { clienteId?: number } | null)) as { clienteId?: number } | null;
    if (state?.clienteId) {
      this.router.navigate(['/admin/clientes', state.clienteId]);
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    this.router.navigate(['/admin/dashboard']);
  }
}