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
     - Barra de pestañas por ETAPAS del flujo operativo (Levantamiento,
       Fabricación, Instalación, Instalado, Garantías). TODAS las etapas se
       muestran: la actual es editable, las pasadas son de solo consulta y las
       futuras se bloquean con un mensaje orientativo.
     - Contenido específico por etapa: fecha programada y quién envió las
       medidas (Levantamiento); fecha de inicio + formulario de materiales
       (Fabricación); fecha de instalación + kit de instalación con checklist
       (Instalación); resumen consolidado + botón "Finalizar Obra" (Instalado);
       placeholder (Garantías).
     - Vista final cuando la obra está finalizada: resumen consolidado de todas
       las etapas incluyendo Garantías.
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

interface MaterialObraItem {
  idMaterial: number;
  nombre: string;
  unidadMedida?: string;
  cantidad?: number | null;
  medida?: string | null;
  notas?: string | null;
}

interface KitChecklistItem {
  idChecklistItem: number;
  idMaterial: number;
  nombre: string;
  cantidad?: number | null;
  notas?: string | null;
  marcado: boolean;
}

interface KitObra {
  idObraKit: number;
  idKit: number;
  nombre: string;
  descripcion?: string;
  asignadoPor?: string;
  materiales: KitChecklistItem[];
}

interface CatalogoItem {
  id: number;
  nombre: string;
  unidadMedida?: string;
}

interface ResumenEtapa {
  id: number;
  nombre: string;
  color: string;
  fecha: string;         // fecha programada de la etapa (o '—')
  trabajadores: string;  // nombres separados por coma
  notas: number;
  fotos: number;
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

  // Datos por etapa.
  materialesObra = signal<MaterialObraItem[]>([]);
  kitObra = signal<KitObra | null>(null);
  materialesCatalogo = signal<CatalogoItem[]>([]);
  kitsCatalogo = signal<CatalogoItem[]>([]);

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

  // Formularios de la etapa actual (solo Propietario).
  nuevoTrabajadorId = signal<number | null>(null);
  agregandoTrabajador = signal(false);

  materialSel = signal<number | null>(null);
  materialCantidad = signal('');
  materialMedida = signal('');
  materialNotas = signal('');
  guardandoMaterial = signal(false);

  kitSel = signal<number | null>(null);
  guardandoKit = signal(false);

  guardandoFecha = signal<string | null>(null); // nombre de la columna en guarda
  finalizandoObra = signal(false);

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

  // Etapas OFICIALES navegables del flujo: excluye "Solicitud recibida" (1,
  // no es una etapa navegable: es la condición transitoria de una obra nueva)
  // y "Pendiente de aceptación" (8, estado intermedio de doble validación).
  etapasOficiales = computed<EstadoDetalle[]>(() =>
    this.estados()
      .filter((e) => e.id !== 1 && e.id !== 8)
      .sort((a, b) => a.orden - b.orden)
  );

  // Estado actual REAL de la obra (lo que ilustra el badge). Si la obra está
  // en "Pendiente de aceptación" (8), se resuelve a la etapa origen real
  // usando la última nota registrada.
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
      // el primer estado realista desde el que se puede invocar 8.
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

  // Etapa que la barra considera "actual". Diferencia clave con estadoActual:
  // una obra en "Solicitud recibida" (1) no tiene etapa navegable propia, así
  // que su etapa actual para la barra es "Levantamiento pendiente" (2).
  etapaActualBarra = computed<EstadoDetalle | null>(() => {
    const actual = this.estadoActual();
    if (!actual) return null;
    if (actual.id === 1) {
      return this.estados().find((e) => e.id === 2) ?? null;
    }
    return this.etapasOficiales().find((e) => e.id === actual.id) ?? null;
  });

  // La obra está finalizada: se muestra la vista consolidada en lugar de las
  // pestañas de etapas (no existe pestaña "Finalizado").
  esFinalizada = computed(() => this.estadoActual()?.id === 7);

  // La barra muestra TODAS las etapas oficiales (pasadas y futuras), para
  // poder bloquear con mensaje las que aún no se han alcanzado.
  etapasVisibles = computed<EstadoDetalle[]>(() => this.etapasOficiales());

  // Próxima etapa oficial a la que se puede avanzar (siguiente orden).
  siguienteEtapa = computed<EstadoDetalle | null>(() => {
    const actual = this.estadoActual();
    if (!actual) return null;
    const oficiales = this.etapasOficiales();
    const idx = oficiales.findIndex((e) => e.id === actual.id);
    if (idx >= 0 && idx < oficiales.length - 1) {
      return oficiales[idx + 1];
    }
    // Si estadoActual es intermedio (8) o inicial (1), encontrar por orden.
    const siguientes = oficiales.filter((e) => e.orden > actual.orden);
    return siguientes.length > 0 ? siguientes[0] : null;
  });

  // El botón "Avanzar etapa" solo aplica mientras la obra no esté en la etapa
  // terminal de operación (Instalado/Garantía): ahí el cierre se hace con
  // "Finalizar Obra", no avanzando a Garantía.
  mostrarBotonAvanzar = computed(() =>
    !this.esTrabajador() &&
    !!this.siguienteEtapa() &&
    this.etapaActualBarra()?.id !== 5 &&
    !this.esFinalizada()
  );

  // "Finalizar Obra" está disponible cuando la obra está en "Instalado" (5) o
  // "Garantía" (6): ambos admiten la transición a "Finalizado" (7) en el SP.
  mostrarBotonFinalizar = computed(() =>
    !this.esTrabajador() &&
    !this.esFinalizada() &&
    (this.etapaActualBarra()?.id === 5 || this.etapaActualBarra()?.id === 6)
  );

  // Mensaje orientativo de las etapas futuras bloqueadas.
  mensajeBloqueo = computed(() => {
    const etapa = this.etapaActualBarra();
    return etapa
      ? `La obra actual se encuentra en «${etapa.nombre}». Termine la fase antes de acceder.`
      : '';
  });

  // Indica si la pestaña de etapa seleccionada tiene o no actividad (notas,
  // fotos o trabajadores asignados).
  etapaSelVacia = computed(() => {
    const id = this.tab();
    if (id == null) return true;
    const grupos = this.gruposPorAutorDeEtapa(id);
    if (grupos.length === 0) return true;
    return grupos.every((g) => g.notas.length === 0 && g.fotos.length === 0);
  });

  // Porcentaje de checklist del kit verificado.
  porcentajeKitVerificado = computed(() => {
    const kit = this.kitObra();
    if (!kit || kit.materiales.length === 0) return 0;
    const ok = kit.materiales.filter((m) => m.marcado).length;
    return Math.round((ok / kit.materiales.length) * 100);
  });

  // Trabajadores del catálogo aún no asignados a la etapa actual (selector).
  trabajadoresDisponibles = computed(() => {
    const etapa = this.etapaActualBarra();
    const asignados = etapa
      ? this.trabajadoresDeEtapa(etapa.id).map((t) => t.idTrabajador)
      : [];
    return this.trabajadoresLista().filter((t) => !asignados.includes(t.idTrabajador));
  });

  // Resumen consolidado por etapa (usado en la vista Instalado y en la vista
  // final de obra finalizada).
  resumenEtapas = computed<ResumenEtapa[]>(() =>
    [2, 3, 4, 5].map((id) => {
      const etapa = this.estados().find((e) => e.id === id);
      const nombre = etapa?.nombre ?? this.nombreEstado(id);
      return {
        id,
        nombre,
        color: this.colorEstado(nombre),
        fecha: this.fechaEtapa(
          id === 2 ? 'FechaLevantamiento' : id === 3 ? 'FechaFabricacion' : 'FechaInstalacion'
        ),
        trabajadores: this.trabajadoresDeEtapa(id).map((t) => t.nombre).filter(Boolean).join(', ') || '—',
        notas: this.notas().filter((n) => n.idEstadoObra === id).length,
        fotos: this.fotos().filter((f) => f.idEstadoObra === id).length,
      };
    })
  );

  async ngOnInit(): Promise<void> {
    this.idObra = Number(this.route.snapshot.paramMap.get('id')) || null;
    if (!this.idObra) {
      this.error.set('Obra no válida.');
      this.cargando.set(false);
      return;
    }
    await this.cargarTodo();
    // Pestaña inicial: el estado actual de la obra (o la primera navegable).
    const actual = this.etapaActualBarra() ?? this.estadoActual();
    if (actual && !this.esFinalizada()) this.tab.set(actual.id);
  }

  private async cargarTodo(): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    const q = async <T>(o: Promise<T> | null): Promise<T | null> => {
      if (!o) return null;
      try { return await o; } catch { return null; }
    };

    try {
      const [detalle, estadosRaw, notasRaw, fotosRaw, trabajadoresRaw, pagosRaw, trabajadoresListaRaw,
        materialesObraRaw, kitObraRaw, materialesCatalogoRaw, kitsCatalogoRaw] =
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
          // Datos por etapa.
          q(firstValueFrom(this.api.get<any[]>('/Obras/' + this.idObra + '/materiales'))),
          q(firstValueFrom(this.api.get<any>('/Obras/' + this.idObra + '/kit'))),
          q(firstValueFrom(this.api.get<any[]>('/Materiales'))),
          q(firstValueFrom(this.api.get<any[]>('/Kits'))),
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

      // ── Datos por etapa ────────────────────────────────────────────────────
      const listaMatObra: any[] = (materialesObraRaw as any[]) || [];
      this.materialesObra.set(
        listaMatObra.map((m) => ({
          idMaterial: Number(m.MATERIALES_IDMATERIAL ?? m.Materiales_idMaterial ?? m.idMaterial),
          nombre: String(m.NOMBRE ?? m.Nombre ?? ''),
          unidadMedida: String(m.UNIDADMEDIDA ?? m.UnidadMedida ?? ''),
          cantidad: m.CANTIDAD ?? m.Cantidad ?? null,
          medida: m.MEDIDA ?? m.Medida ?? null,
          notas: m.NOTAS ?? m.Notas ?? null,
        }))
      );

      const kitRaw: any = kitObraRaw as any;
      if (kitRaw && (kitRaw.IDOBRAKIT != null || kitRaw.idObraKit != null)) {
        this.kitObra.set({
          idObraKit: Number(kitRaw.IDOBRAKIT ?? kitRaw.idObraKit),
          idKit: Number(kitRaw.IDKIT ?? kitRaw.idKit),
          nombre: String(kitRaw.NOMBRE ?? kitRaw.Nombre ?? ''),
          descripcion: String(kitRaw.DESCRIPCION ?? kitRaw.Descripcion ?? ''),
          asignadoPor: String(kitRaw.ASIGNADOPOR ?? kitRaw.AsignadoPor ?? ''),
          materiales: ((kitRaw.Materiales ?? kitRaw.materiales ?? []) as any[]).map((i) => ({
            idChecklistItem: Number(i.IDCHECKLISTITEM ?? i.idChecklistItem),
            idMaterial: Number(i.IDMATERIAL ?? i.idMaterial),
            nombre: String(i.NOMBREMATERIAL ?? i.NombreMaterial ?? ''),
            cantidad: i.CANTIDAD ?? i.Cantidad ?? null,
            notas: i.NOTASKIT ?? i.NotasKit ?? null,
            marcado: Boolean(i.MARCADO ?? i.Marcado),
          })),
        });
      } else {
        this.kitObra.set(null);
      }

      const listaMatCat: any[] = (materialesCatalogoRaw as any[]) || [];
      this.materialesCatalogo.set(
        listaMatCat
          .map((m) => ({
            id: Number(m.IDMATERIAL ?? m.idMaterial),
            nombre: String(m.NOMBRE ?? m.Nombre ?? ''),
            unidadMedida: String(m.UNIDADMEDIDA ?? m.UnidadMedida ?? ''),
          }))
          .filter((m) => m.id)
      );

      const listaKitsCat: any[] = (kitsCatalogoRaw as any[]) || [];
      this.kitsCatalogo.set(
        listaKitsCat
          .map((k) => ({
            id: Number(k.IDKIT ?? k.idKit),
            nombre: String(k.NOMBRE ?? k.Nombre ?? ''),
          }))
          .filter((k) => k.id)
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
    const s = String(valor);
    // Fecha "yyyy-mm-dd" (input date): construir con componentes locales para
    // evitar el corrimiento de zona horaria al interpretarla como UTC.
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      const fechaLocal = new Date(y, m - 1, d);
      return fechaLocal.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
    const fecha = new Date(s);
    if (isNaN(fecha.getTime())) return s;
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

  // Valor de una fecha por etapa de la obra, como "yyyy-mm-dd" (input date).
  fechaEtapa(campo: 'FechaInicio' | 'FechaLevantamiento' | 'FechaFabricacion' | 'FechaInstalacion'): string {
    const ob = this.obra() ?? {};
    const v = ob[campo.toUpperCase()] ?? ob[campo] ?? '';
    if (!v) return '';
    const d = new Date(String(v));
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
  }

  // ---- Navegación de pestañas / estado -------------------------------------

  setTab(idEstado: number): void {
    this.tab.set(idEstado);
  }

  // Clasifica una etapa según la etapa actual de la obra (para la barra).
  clasificacionEtapa(id: number): 'actual' | 'pasada' | 'futura' {
    const barra = this.etapaActualBarra();
    const etapa = this.etapasOficiales().find((e) => e.id === id);
    if (!barra || !etapa) return 'futura';
    if (etapa.id === barra.id) return 'actual';
    return etapa.orden < barra.orden ? 'pasada' : 'futura';
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

  // Finaliza la obra por completo: transición 5/6 → 7 (SP_CAMBIAR_ESTADO_OBRA).
  // Confirmación explícita (requisito de la UI: acción irreversible).
  async finalizarObra(): Promise<void> {
    if (this.auth.isWorker() || this.finalizandoObra()) return;
    const confirmado = window.confirm(
      'Al finalizar la obra ya no se podrán editar sus datos ni registrar garantías. ¿Está seguro?'
    );
    if (!confirmado) return;

    this.finalizandoObra.set(true);
    try {
      await firstValueFrom(this.api.patch<any>(`/Obras/${this.idObra}/estado`, { idEstado: 7 }));
      this.toast.success('Obra finalizada correctamente.');
      await this.cargarTodo();
      this.tab.set(null); // la vista consolidada no usa pestañas
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'No se pudo finalizar la obra.';
      this.toast.error(msg);
    } finally {
      this.finalizandoObra.set(false);
    }
  }

  // ---- Datos por etapa (pestaña) -------------------------------------------

  // Trabajadores asignados a UNA etapa concreta.
  trabajadoresDeEtapa(idEstado: number): TrabajadorAsignado[] {
    return this.trabajadores().filter((t) => t.idEstadoObra === idEstado);
  }

  // Nombres (coma) de los trabajadores asignados a una etapa, para la vista
  // de Levantamiento y los resúmenes consolidados.
  nombresTrabajadores(idEstado: number): string {
    const nombres = this.trabajadoresDeEtapa(idEstado)
      .map((t) => t.nombre)
      .filter(Boolean);
    return nombres.length > 0 ? nombres.join(', ') : '—';
  }

  // Ítems del checklist del kit ya marcados.
  kitMarcados(kit: KitObra): number {
    return kit.materiales.filter((m) => m.marcado).length;
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

  // ---- Formularios de la etapa actual (Propietario) ------------------------

  setNuevoTrabajador(id: number): void { this.nuevoTrabajadorId.set(id); }
  setMaterialSel(id: number): void { this.materialSel.set(id); }
  setMaterialCantidad(v: string): void { this.materialCantidad.set(v); }
  setMaterialMedida(v: string): void { this.materialMedida.set(v); }
  setMaterialNotas(v: string): void { this.materialNotas.set(v); }
  setKitSel(id: number): void { this.kitSel.set(id); }

  // Guarda una fecha programada de etapa (PATCH /Obras/:id/fechas-etapas).
  async guardarFechaEtapa(
    campo: 'FechaLevantamiento' | 'FechaFabricacion' | 'FechaInstalacion',
    valor: string
  ): Promise<void> {
    if (this.auth.isWorker() || this.guardandoFecha()) return;
    if (this.fechaEtapa(campo) === valor) return; // sin cambios

    this.guardandoFecha.set(campo);
    try {
      await firstValueFrom(this.api.patch<any>(`/Obras/${this.idObra}/fechas-etapas`, { [campo]: valor }));
      this.toast.success('Fecha guardada correctamente.');
      await this.cargarTodo();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'No se pudo guardar la fecha.';
      this.toast.error(msg);
    } finally {
      this.guardandoFecha.set(null);
    }
  }

  // Asigna un trabajador a la etapa actual de la obra.
  async agregarTrabajador(): Promise<void> {
    const idTrabajador = this.nuevoTrabajadorId();
    const etapa = this.etapaActualBarra();
    if (this.auth.isWorker() || idTrabajador == null || !etapa || this.agregandoTrabajador()) return;

    this.agregandoTrabajador.set(true);
    try {
      await firstValueFrom(this.api.post<any>(`/Obras/${this.idObra}/trabajadores`, {
        idTrabajador,
        idEstadoObra: etapa.id,
      }));
      this.toast.success('Trabajador asignado a la etapa.');
      this.nuevoTrabajadorId.set(null);
      await this.cargarTodo();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'No se pudo asignar el trabajador.';
      this.toast.error(msg);
    } finally {
      this.agregandoTrabajador.set(false);
    }
  }

  // Quita un trabajador de la etapa (confirmación explícita: acción reversible
  // pero con impacto en el histórico de asignaciones).
  async quitarTrabajador(t: TrabajadorAsignado): Promise<void> {
    if (this.auth.isWorker()) return;
    if (!confirm(`¿Quitar a "${t.nombre}" de esta etapa?`)) return;
    try {
      await firstValueFrom(this.api.delete<any>(`/Obras/trabajadores/${t.idDetalleAsignacion}`));
      this.toast.success('Trabajador removido de la etapa.');
      await this.cargarTodo();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'No se pudo quitar el trabajador.';
      this.toast.error(msg);
    }
  }

  // Asigna un material del catálogo a la obra (etapa Fabricación).
  async asignarMaterial(): Promise<void> {
    const idMaterial = this.materialSel();
    if (this.auth.isWorker() || idMaterial == null || this.guardandoMaterial()) return;

    this.guardandoMaterial.set(true);
    try {
      await firstValueFrom(this.api.post<any>(`/Obras/${this.idObra}/materiales`, {
        idMaterial,
        cantidad: this.materialCantidad() ? Number(this.materialCantidad()) : null,
        medida: this.materialMedida() || null,
        notas: this.materialNotas() || null,
      }));
      this.toast.success('Material asignado a la obra.');
      this.materialSel.set(null);
      this.materialCantidad.set('');
      this.materialMedida.set('');
      this.materialNotas.set('');
      await this.cargarTodo();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'No se pudo asignar el material.';
      this.toast.error(msg);
    } finally {
      this.guardandoMaterial.set(false);
    }
  }

  // Quita un material de la obra.
  async quitarMaterial(m: MaterialObraItem): Promise<void> {
    if (this.auth.isWorker()) return;
    if (!confirm(`¿Quitar el material "${m.nombre}" de la obra?`)) return;
    try {
      await firstValueFrom(this.api.delete<any>(`/Obras/${this.idObra}/materiales/${m.idMaterial}`));
      this.toast.success('Material removido de la obra.');
      await this.cargarTodo();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'No se pudo quitar el material.';
      this.toast.error(msg);
    }
  }

  // Asigna un kit de instalación a la obra (etapa Instalación).
  async asignarKit(): Promise<void> {
    const idKit = this.kitSel();
    if (this.auth.isWorker() || idKit == null || this.guardandoKit()) return;

    this.guardandoKit.set(true);
    try {
      await firstValueFrom(this.api.post<any>(`/Obras/${this.idObra}/kit`, { idKit }));
      this.toast.success('Kit asignado a la obra.');
      this.kitSel.set(null);
      await this.cargarTodo();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'No se pudo asignar el kit.';
      this.toast.error(msg);
    } finally {
      this.guardandoKit.set(false);
    }
  }

  // Quita el kit asignado a la obra.
  async quitarKit(): Promise<void> {
    if (this.auth.isWorker() || !this.kitObra()) return;
    if (!confirm('¿Quitar el kit asignado a la obra?')) return;
    try {
      await firstValueFrom(this.api.delete<any>(`/Obras/${this.idObra}/kit`));
      this.toast.success('Kit removido de la obra.');
      await this.cargarTodo();
    } catch (e: any) {
      const msg = e?.error?.error || e?.message || 'No se pudo quitar el kit.';
      this.toast.error(msg);
    }
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
