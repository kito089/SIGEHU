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

   Estructura (refactor 2026-08-12):
     - Cabecera fija (siempre visible): nombre de la obra, cliente, contacto,
       estado actual con color, datos generales (direcciones, RFC, fechas,
       medidas). Reemplaza la antigua pestaña "General" como pestaña.
     - Barra de pestañas por ETAPAS del flujo operativo (visibilidad
       progresiva: solo etapas alcanzadas hasta el estado actual inclusive).
     - Control para avanzar al siguiente estado de la obra.
     - Por cada pestaña de etapa: trabajadores asignados a esa etapa + notas
       y fotos de esa etapa agrupadas por trabajador (incluye al admin).
     - Sección de Pagos (solo rol administrativo): botones para registrar
       pago parcial / liquidación + historial tabular. NO se calcula saldo.
   ========================================================================= */

interface EstadoDetalle {
  id: number;
  nombre: string;
  orden: number;
}

interface TrabajadorListItem {
  idTrabajador: number;
  nombreCompleto: string;
  rol: string;
}

interface NotaDetalle {
  id: number;
  nota: string;
  fecha: string;
  idEstadoObra: number;
  estadoObra?: string;
  idTrabajador: number;
  autor: string;       // NombreCompleto de quien escribió
  rolAutor?: string;   // Propietario / Trabajador
}

interface FotoDetalle {
  id: number;
  ruta: string;
  url?: string;
  idEstadoObra: number;
  estadoObra?: string;
  idTrabajador: number;
  autor: string;       // NombreCompleto de quien subió
  rolAutor?: string;
  fecha?: string;      // FechaCreacion (opcional — puede no llegar del JOIN)
}

interface TrabajadorAsignado {
  idDetalleAsignacion: number;
  idTrabajador: number;
  nombre?: string;
  telefono?: string;
  rol?: string;
  idEstadoObra: number;
  estadoObra?: string;
  fechaAsignacion?: string;
}

interface PagoDetalle {
  id: number;
  monto: number;
  fecha: string;
  tipoPago?: string;   // Efectivo / Transferencia
  formaPago?: string;  // Anticipo / Parcial / Liquidación
  estadoObra?: string;
  trabajador?: string; // Quién recibió el pago
}

// Agrupación de notas/fotos por autor en una etapa.
interface AutorGrupo {
  idTrabajador: number;
  nombre: string;
  rol?: string;
  notas: NotaDetalle[];
  fotos: FotoDetalle[];
}

// Formulario de registro de pago.
interface FormPagoState {
  monto: number | null;
  // UI "Tipo de pago" (Anticipo / Parcial / Liquidación) → BBDD FormasPago.
  idFormaPago: number | null;
  // UI "Forma de pago" (Efectivo / Transferencia) → BBDD TiposPago.
  idTipoPago: number | null;
  idTrabajadorReceptor: number | null;
  fechaPago: string; // ISO yyyy-mm-dd
  guardando: boolean;
  errorValidacion: string | null;
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
  trabajadoresLista = signal<TrabajadorListItem[]>([]);

  // Pestaña activa: idEstadoObra de la etapa seleccionada.
  tab = signal<number | null>(null);

  // Indica si el modal de registro de pago está abierto.
  modalPagoAbierto = signal(false);
  formPago = signal<FormPagoState>({
    monto: null,
    idFormaPago: null,
    idTipoPago: null,
    idTrabajadorReceptor: null,
    fechaPago: '',
    guardando: false,
    errorValidacion: null,
  });

  // Opciones de los catálogos (hardcodeadas: SIGEHU.sql define 2+3 filas
  // fijas y la BD no expone endpoints de listado; sería innecesario crear
  // endpoints nuevos para tres valores constantes por catálogo).
  // Mapeo UI ↔ BD (esquema histórico del SIGEHU):
  //   - UI "Tipo de pago"  (Anticipo/Parcial/Liquidación) → BD FormasPago (idFormaPago)
  //   - UI "Forma de pago" (Efectivo/Transferencia)       → BD TiposPago  (idTipoPago)
  readonly OPC_FORMAS_PAGO = [
    { id: 1, label: 'Anticipo' },
    { id: 2, label: 'Parcial' },
    { id: 3, label: 'Liquidación' },
  ];
  readonly OPC_TIPOS_PAGO = [
    { id: 1, label: 'Efectivo' },
    { id: 2, label: 'Transferencia' },
  ];

  esTrabajador = computed(() => this.auth.isWorker());

  // Total pagado (suma de DetallesPagos.Monto).
  totalPagos = computed(() =>
    this.pagos().reduce((acc, p) => acc + (Number(p.monto) || 0), 0)
  );

  // Color por nombre de estado (reutiliza el mapa de ObrasComponent).
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

  // Catálogo ordenado de etapas OFICIALES del flujo (excluye el estado
  // intermedio "Pendiente de aceptación" id=8 — no es una etapa que se muestra
  // al usuario como una pestaña operativa; es un estado intermedio de doble
  // validación). Lo construemos a partir de `estados()` para respetar el
  // orden que venga de BD.
  etapasOficiales = computed<EstadoDetalle[]>(() =>
    this.estados()
      .filter((e) => e.id !== 8)
      .sort((a, b) => a.orden - b.orden)
  );

  // Estado actual de la obra. Si la obra está en "Pendiente de aceptación"
  // (id=8, estado intermedio del flujo de doble validación), lo resolvemos a
  // la etapa origen real (levantamiento / fabricación / instalación) usando
  // la última nota registrada — ese es el estado que debe ilustrar la barra
  // de etapas al usuario, no el intermedio de validación.
  estadoActual = computed<EstadoDetalle | null>(() => {
    const ob = this.obra();
    const id = Number(ob?.IDESTADOOBRA ?? ob?.idEstadoObra ?? 0);
    const nombre = String(ob?.ESTADOBRA ?? ob?.estadoObra ?? '') || '';
    const encontrado = this.estados().find((e) =>
      e.id === id || e.nombre.toLowerCase() === nombre.toLowerCase()
    );

    if (encontrado && encontrado.id !== 8) {
      return encontrado;
    }

    if (encontrado && encontrado.id === 8) {
      // Pendiente de aceptación: usar la última nota para inferir la etapa
      // origen real (levantamiento=2 / fabricación=3 / instalación=4).
      const ultimaNota = this.notas()[0];
      if (ultimaNota) {
        const etapa = this.estados().find((e) => e.id === ultimaNota.idEstadoObra);
        if (etapa) return etapa;
      }
      // Sin notas: flooring conservador a "Levantamiento pendiente" (ord=2),
      // el primer estado realista desde el que se puede invocar 8. Si la BD
      // no tiene notas, nunca revelamos etapas posteriores.
      const fallback = this.estados().find((e) => e.id === 2);
      return fallback ?? encontrado;
    }

    // No encontrado: sintetizar por nombre.
    if (nombre) {
      const color = this.colorEstado(nombre);
      return { id, nombre, orden: 0, color } as EstadoDetalle & { color: string };
    }
    return null;
  });

  estadoActualInfo = computed(() => {
    const e = this.estadoActual();
    const nombre = e?.nombre ?? 'Sin estado';
    const color = this.colorEstado(nombre);
    return { nombre, color, id: e?.id ?? 0, orden: e?.orden ?? 0 };
  });

  // Etapas visibles en la barra: solo las alcanzadas hasta el estado actual
  // inclusive. Si la obra está en un estado intermedio (id=8 "Pendiente de
  // aceptación"), mostramos hasta la etapa origen (levantamiento / fabricación
  // / instalación) que ya estaba cumplida.
  etapasVisibles = computed<EstadoDetalle[]>(() => {
    const actual = this.estadoActual();
    if (!actual) return [];
    const ordenActual = actual.orden;
    return this.etapasOficiales().filter((e) => e.orden <= ordenActual);
  });

  // Próxima etapa oficial a la que se puede avanzar (siguiente orden). Sirve
  // para el botón "Avanzar etapa".
  siguienteEtapa = computed<EstadoDetalle | null>(() => {
    const actual = this.estadoActual();
    if (!actual) return null;
    const oficiales = this.etapasOficiales();
    const idx = oficiales.findIndex((e) => e.id === actual.id);
    if (idx >= 0 && idx < oficiales.length - 1) {
      return oficiales[idx + 1];
    }
    // Si estadoActual es intermedio (8), encontrar siguiente por orden.
    const siguientes = oficiales.filter((e) => e.orden > actual.orden);
    return siguientes.length > 0 ? siguientes[0] : null;
  });

  // Indica si la pestaña de etapa seleccionada tiene o no actividad (notas,
  // fotos o trabajadores asignados). Es una signal para evitar_invitar
  // evaluaciones complejas desde el template (Angular no permite asignaciones
  // ni llamadas a `.every()` con predicados dinámicos dentro de @if.
  etapaSelVacia = computed(() => {
    const id = this.tab();
    if (id == null) return true;
    const grupos = this.gruposPorAutorDeEtapa(id);
    if (grupos.length === 0) return true;
    return grupos.every((g) => g.notas.length === 0 && g.fotos.length === 0);
  });

  async ngOnInit(): Promise<void> {
    this.idObra = Number(this.route.snapshot.paramMap.get('id')) || null;
    if (!this.idObra) {
      this.error.set('Obra no válida.');
      this.cargando.set(false);
      return;
    }
    await this.cargarTodo();
    // Pestaña inicial: el estado actual de la obra.
    const actual = this.estadoActual();
    if (actual) this.tab.set(actual.id);
  }

  private async cargarTodo(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    const q = async <T>(o: Promise<T> | null): Promise<T | null> => {
      if (!o) return null;
      try { return await o; } catch { return null; }
    };

    try {
      const [detalle, estadosRaw, notasRaw, fotosRaw, trabajadoresRaw, pagosRaw, trabajadoresListaRaw] =
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
          // Lista de trabajadores/administradores para el selector "recibió".
          this.auth.isWorker()
            ? Promise.resolve(null)
            : q(firstValueFrom(this.api.get<any[]>('/Trabajadores'))),
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
            id: Number(e.IDESTADOOBRA ?? e.idEstadoObra ?? e.idEstadoObra ?? 0),
            nombre: String(e.NOMBRE ?? e.Nombre ?? e.nombre ?? ''),
            orden: Number(e.ORDEN ?? e.Orden ?? e.orden ?? 0),
          }))
          .filter((e) => e.id && e.nombre)
      );

      const listaNotas: any[] = (notasRaw as any[]) || [];
      this.notas.set(
        listaNotas.map((n) => ({
          id: Number(n.IDNOTAOBRA ?? n.idNotaObra),
          nota: String(n.NOTA ?? n.Nota ?? n.nota ?? ''),
          fecha: n.FECHACREACION ?? n.FechaCreacion ?? n.fechaCreacion ?? '',
          idEstadoObra: Number(n.ESTADOSOBRA_IDESTADOOBRA ?? n.idEstadoObra ?? 0),
          idTrabajador: Number(n.TRABAJADORES_IDTRABAJADOR ?? n.idTrabajador ?? 0),
          autor: String(n.AUTORNOMBRE ?? n.AutorNombre ?? n.autorNombre ?? n.NOMBRECOMPLETO ?? ''),
          rolAutor: n.ROLAUTOR ?? n.RolAutor ?? n.rolAutor ?? undefined,
        }))
      );

      const listaFotos: any[] = (fotosRaw as any[]) || [];
      this.fotos.set(
        listaFotos.map((f) => ({
          id: Number(f.IDFOTOOBRA ?? f.idFotoObra),
          ruta: String(f.RUTAARCHIVO ?? f.RutaArchivo ?? ''),
          idEstadoObra: Number(f.ESTADOSOBRA_IDESTADOOBRA ?? f.idEstadoObra ?? 0),
          idTrabajador: Number(f.TRABAJADORES_IDTRABAJADOR ?? f.idTrabajador ?? 0),
          autor: String(f.SUBIONOMBRE ?? f.SubioNombre ?? f.subioNombre ?? f.NOMBRECOMPLETO ?? ''),
          rolAutor: f.ROLSUBIO ?? f.RolSubio ?? f.rolSubio ?? undefined,
          fecha: f.FECHACREACION ?? f.FechaCreacion ?? f.fechaCreacion ?? '',
        }))
      );
      this.cargarImagenesFotos(listaFotos);

      const listaTrabajadores: any[] = (trabajadoresRaw as any[]) || [];
      this.trabajadores.set(
        listaTrabajadores.map((t) => ({
          idDetalleAsignacion: Number(t.IDDETALLEASIGNACION ?? t.idDetalleAsignacion),
          idTrabajador: Number(t.TRABAJADORES_IDTRABAJADOR ?? t.Trabajadores_idTrabajador ?? t.idTrabajador ?? 0),
          nombre: t.NOMBRECOMPLETO ?? t.NombreCompleto ?? t.nombreCompleto ?? '',
          telefono: t.TELEFONOTRABAJADOR ?? t.TelefonoTrabajador ?? t.telefonoTrabajador ?? '',
          rol: t.ROLTRABAJADOR ?? t.RolTrabajador ?? undefined,
          idEstadoObra: Number(t.ESTADOSOBRA_IDESTADOOBRA ?? t.idEstadoObra ?? 0),
          estadoObra: t.ESTADOBRA ?? t.EstadoObra ?? t.estadoObra ?? '',
          fechaAsignacion: t.FECHAASIGNACION ?? t.FechaAsignacion ?? t.fechaAsignacion ?? '',
        }))
      );

      const listaPagos: any[] = (pagosRaw as any[]) || [];
      this.pagos.set(
        listaPagos.map((p) => ({
          id: Number(p.IDDETALLEPAGO ?? p.idDetallePago),
          monto: Number(p.MONTO ?? p.Monto ?? p.monto ?? 0),
          fecha: p.FECHAREGISTRO ?? p.FechaRegistro ?? p.fechaRegistro ?? '',
          // UI: "Tipo de pago"  (Anticipo/Parcial/Liquidación) ← backend FORMAPAGO
          // UI: "Forma de pago" (Efectivo/Transferencia)       ← backend TIPOPAGO
          tipoPago:  p.FORMAPAGO ?? p.formaPago ?? '',
          formaPago: p.TIPOPAGO  ?? p.tipoPago  ?? '',
          estadoObra: p.ESTADOOBRA ?? p.estadoObra ?? '',
          trabajador: p.TRABAJADORQUEREGISTRO ?? p.trabajador ?? '',
        }))
      );

      const listaTrabLista: any[] = (trabajadoresListaRaw as any[]) || [];
      this.trabajadoresLista.set(
        listaTrabLista.map((t) => ({
          idTrabajador: Number(t.IDTRABAJADOR ?? t.idTrabajador),
          nombreCompleto: String(t.NOMBRECOMPLETO ?? t.NombreCompleto ?? t.nombreCompleto ?? ''),
          rol: String(t.TIPONOMBRE ?? t.TipoNombre ?? (t.TIPOSUSUARIOS_IDTIPOUSUARIO === 1 ? 'Propietario' : 'Trabajador')),
        }))
      );

      // Si el usuario actual es admin, lo preselecciona como receptor del pago.
      const u = this.auth.getUser();
      if (u && !this.auth.isWorker() && u.idTrabajador) {
        this.formPago.update((f) => ({ ...f, idTrabajadorReceptor: Number(u.idTrabajador) }));
      }
    } catch {
      this.error.set('Error al cargar la información de la obra.');
    } finally {
      this.cargando.set(false);
    }
  }

  // ---- Utilidades ----------------------------------------------------------

  // Conversión segura para selects numéricos desde el template (Angular no
  // permite invocar `Number(...)` directamente en bindings).
  num(v: any): number {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  colorEstado(nombre: string): string {
    const found = this.MAPA_ESTADOS_COLOR.find(
      (e) => e.nombre.toLowerCase() === nombre.toLowerCase()
    );
    return found?.color ?? '#94A3B8';
  }

  nombreEstado(id: number): string {
    const e = this.estados().find((x) => x.id === id);
    return e?.nombre ?? 'Sin etapa';
  }

  nombreEstadoPorDefecto(id: number): string {
    // Para pestañas de etapa: usa el catálogo cargado; si no se encuentra,
    // retorna string vacío (la UI decide cómo mostrar el hueco).
    return this.nombreEstado(id);
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
    return (Number(monto) || 0).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
    });
  }

  urlFoto(f: FotoDetalle): string {
    return f.url || '/uploads/' + f.ruta.replace(/^uploads[\\/]/, '');
  }

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
        // Foto ilegible: se deja la ruta estática como respaldo.
      }
    }
  }

  formatoMedida(valor: any): string {
    const n = Number(valor);
    return valor != null && !isNaN(n) && n > 0 ? `${n} m` : '—';
  }

  // ---- Navegación de pestañas / estado -------------------------------------

  setTab(idEstado: number): void {
    this.tab.set(idEstado);
  }

  // Avanza al siguiente estado oficial de la obra vía SP_CAMBIAR_ESTADO_OBRA.
  // Solo habilitado para Propietario (endpoint PATCH ya está protegido en BE).
  async avanzarEstado(): Promise<void> {
    const actual = this.estadoActual();
    const siguiente = this.siguienteEtapa();
    if (!actual || !siguiente) return;
    if (!confirm(
      `¿Avanzar la obra "${this.obra()?.NOMBREOBRA ?? ''}" de "${actual.nombre}" a "${siguiente.nombre}"?\n` +
      `La transición se registrará en auditoría y no se puede deshacer.`
    )) return;

    try {
      await firstValueFrom(this.api.patch<any>(`/Obras/${this.idObra}/estado`, {
        idEstado: siguiente.id,
      }));
      this.toast.success(`Obra avanzada a "${siguiente.nombre}"`);
      await this.cargarTodo();
      // Mantenerse en la nueva etapa actual si existía pestaña previa.
      const nuevoActual = this.estadoActual();
      if (nuevoActual) this.tab.set(nuevoActual.id);
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'No se pudo avanzar el estado de la obra.';
      this.toast.error(msg);
    }
  }

  // ---- Datos por etapa (pestaña) -------------------------------------------

  // Trabajadores asignados a UNA etapa concreta.
  trabajadoresDeEtapa(idEstado: number): TrabajadorAsignado[] {
    return this.trabajadores().filter((t) => t.idEstadoObra === idEstado);
  }

  // Notas y fotos de una etapa concreta, agrupadas por autor.
  gruposPorAutorDeEtapa(idEstado: number): AutorGrupo[] {
    const notasEtapa = this.notas().filter((n) => n.idEstadoObra === idEstado);
    const fotosEtapa = this.fotos().filter((f) => f.idEstadoObra === idEstado);

    const mapa = new Map<number, AutorGrupo>();
    const asegurar = (id: number, nombre: string, rol?: string): AutorGrupo => {
      let g = mapa.get(id);
      if (!g) {
        g = { idTrabajador: id, nombre, rol, notas: [], fotos: [] };
        mapa.set(id, g);
      }
      return g;
    };

    // Orden cronológico inverso (más reciente primero) dentro de cada grupo.
    for (const n of notasEtapa) {
      const g = asegurar(n.idTrabajador, n.autor || 'Sin autor', n.rolAutor);
      g.notas.push(n);
    }
    for (const f of fotosEtapa) {
      const g = asegurar(f.idTrabajador, f.autor || 'Sin autor', f.rolAutor);
      g.fotos.push(f);
    }

    // Si hay trabajadores asignados sin notas/fotos, los incluimos como grupo
    // vacío para que se vea su asignación.
    for (const t of this.trabajadoresDeEtapa(idEstado)) {
      if (!mapa.has(t.idTrabajador)) {
        asegurar(t.idTrabajador, t.nombre || 'Sin nombre', t.rol);
      }
    }

    // El admin (rol Propietario) al final, manteniendo un orden predecible.
    return Array.from(mapa.values()).sort((a, b) => {
      const aAdmin = a.rol === 'Propietario' ? 1 : 0;
      const bAdmin = b.rol === 'Propietario' ? 1 : 0;
      return aAdmin - bAdmin || a.nombre.localeCompare(b.nombre);
    });
  }

  // ---- Modal de registro de pago -------------------------------------------

  abrirModalPago(forma: 'Parcial' | 'Liquidación' = 'Parcial'): void {
    const idForma = forma === 'Liquidación' ? 3 : 2; // 2=Parcial, 3=Liquidación
    const u = this.auth.getUser();
    const hoy = new Date();
    const fechaHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
    this.formPago.set({
      monto: null,
      idFormaPago: idForma,
      idTipoPago: null,
      idTrabajadorReceptor: u && u.idTrabajador ? Number(u.idTrabajador) : null,
      fechaPago: fechaHoy,
      guardando: false,
      errorValidacion: null,
    });
    this.modalPagoAbierto.set(true);
  }

  cerrarModalPago(): void {
    if (this.formPago().guardando) return;
    this.modalPagoAbierto.set(false);
  }

  setPagoMonto(v: string): void {
    const n = v === '' ? null : Number(v);
    this.formPago.update((f) => ({ ...f, monto: Number.isFinite(n) ? n : null }));
  }
  setPagoForma(id: number): void {
    this.formPago.update((f) => ({ ...f, idFormaPago: id }));
  }
  setPagoTipo(id: number): void {
    this.formPago.update((f) => ({ ...f, idTipoPago: id }));
  }
  setPagoReceptor(id: number): void {
    this.formPago.update((f) => ({ ...f, idTrabajadorReceptor: id }));
  }
  setPagoFecha(v: string): void {
    this.formPago.update((f) => ({ ...f, fechaPago: v }));
  }

  async guardarPago(): Promise<void> {
    const f = this.formPago();
    const errores: string[] = [];
    if (f.monto == null || Number(f.monto) <= 0) errores.push('Indica un monto mayor a 0.');
    if (!f.idFormaPago) errores.push('Selecciona el tipo de pago (Anticipo / Parcial / Liquidación).');
    if (!f.idTipoPago) errores.push('Selecciona la forma de pago (Efectivo / Transferencia).');
    if (!f.idTrabajadorReceptor) errores.push('Indica quién recibió el pago.');
    if (!f.fechaPago) errores.push('Indica la fecha del pago.');

    if (errores.length > 0) {
      this.formPago.update((st) => ({ ...st, errorValidacion: errores.join(' ') }));
      return;
    }

    this.formPago.update((st) => ({ ...st, guardando: true, errorValidacion: null }));

    // El backend exige también idEstadoObra: usamos el estado actual de la obra
    // como momento del pago (es el estado al cual se asocia el pago en BD).
    const actual = this.estadoActual();
    const idEstadoObra = actual?.id ?? 1;

    const payload = {
      monto: Number(f.monto),
      idFormaPago: f.idFormaPago,  // UI "tipo de pago" → BBDD FormasPago
      idTipoPago: f.idTipoPago,    // UI "forma de pago" → BBDD TiposPago
      idTrabajador: f.idTrabajadorReceptor,
      idEstadoObra,
    };

    try {
      await firstValueFrom(this.api.post<any>(`/Obras/${this.idObra}/pagos`, payload));
      this.toast.success('Pago registrado correctamente.');
      this.modalPagoAbierto.set(false);
      // Recarga solo pagos (no hace falta recargar todo).
      await this.recargarPagos();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'No se pudo registrar el pago.';
      this.formPago.update((st) => ({ ...st, errorValidacion: msg }));
    } finally {
      this.formPago.update((st) => ({ ...st, guardando: false }));
    }
  }

  private async recargarPagos(): Promise<void> {
    if (this.auth.isWorker()) return;
    try {
      const raw = await firstValueFrom(this.api.get<any[]>(`/Obras/${this.idObra}/pagos`));
      const lista: any[] = raw ?? [];
      this.pagos.set(
        lista.map((p) => ({
          id: Number(p.IDDETALLEPAGO ?? p.idDetallePago),
          monto: Number(p.MONTO ?? p.Monto ?? p.monto ?? 0),
          fecha: p.FECHAREGISTRO ?? p.FechaRegistro ?? p.fechaRegistro ?? '',
          tipoPago:  p.FORMAPAGO ?? p.formaPago ?? '',   // UI: Anticipo/Parcial/Liquidación
          formaPago: p.TIPOPAGO  ?? p.tipoPago  ?? '',   // UI: Efectivo/Transferencia
          estadoObra: p.ESTADOOBRA ?? p.estadoObra ?? '',
          trabajador: p.TRABAJADORQUEREGISTRO ?? p.trabajador ?? '',
        }))
      );
    } catch {
      // No reintentar: el interceptor notifica el error.
    }
  }

  regresar(): void {
    // (Mantiene la navegación corregida de la iteración anterior.)
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
