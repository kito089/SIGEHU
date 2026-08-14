import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { ContactListComponent } from '../../../../shared/components/contact-list/contact-list.component';
import { ConfirmModalComponent } from '../../../../shared/components/confirm-modal/confirm-modal.component';
import { NuevaObraModalComponent } from './nueva-obra-modal/nueva-obra-modal.component';
import { NuevoTrabajoModalComponent } from './nuevo-trabajo-modal/nuevo-trabajo-modal.component';
import { AgruparObrasModalComponent } from './agrupar-obras-modal/agrupar-obras-modal.component';
import type { ClienteTipo, Contacto } from '../../../../core/models/cliente.model';
import {
  RFC_PATTERN,
  CODIGO_POSTAL_PATTERN,
  EMAIL_MAX,
  NOMBRE_MAX,
  DIRECCION_MAX,
  OBSERVACIONES_MAX,
  RAZON_SOCIAL_MAX,
} from '../../../../shared/validators/custom-validators';
import {
  TELEFONO_REACTIVO_PATTERN,
  filtrarTelefonoInput,
  sanitizarTelefono,
} from '../../../../core/utils/telefono.util';

/* =========================================================================
   SIGEHU — Detalle de Cliente (página completa, reemplaza el modal)

   Ruta: /admin/clientes/:id  (acceso: Clientes → Ver Detalle)

   1. Información general: muestra la información completa del cliente según
      su tipo (Persona | Empresa), con los campos bloqueados inicialmente.
      Cada campo editable tiene su botón "Editar" que pasa a "Guardar":
      habilita el campo, valida, guarda y lo vuelve a bloquear. NO se
      permite modificar el tipo del cliente desde esta pantalla.
   2. Trabajos/Obras: árbol Cliente → Obras independientes y Trabajos → Obras.
   ========================================================================= */

type CampoEditable =
  | 'nombre'
  | 'telefono'
  | 'correo'
  | 'direccion'
  | 'observaciones'
  | 'rfc'
  | 'razonSocial'
  | 'regimenFiscal'
  | 'usoCFDI'
  | 'codigoPostal'
  | 'direccionFiscal';

/** Campos del grupo fiscal (RFC y relación SAT), usados para habilitar/
    deshabilitar el formulario "Agregar Datos Fiscales". */
const CAMPOS_FISCALES: CampoEditable[] = ['rfc', 'razonSocial', 'regimenFiscal', 'usoCFDI', 'codigoPostal', 'direccionFiscal'];

interface OpcionCatalogo {
  value: string;
  label: string;
}

interface ObraDetalle {
  idObra: number;
  nombre: string;
  direccion?: string;
  estadoObra?: string;
  fechaCreacion?: string;
}

interface TrabajoDetalle {
  idTrabajo: number;
  nombre: string;
  descripcion?: string;
  direccion?: string;
  fechaCreacion?: string;
  obras: ObraDetalle[];
}

@Component({
  selector: 'app-cliente-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SkeletonComponent, ContactListComponent, ConfirmModalComponent, NuevaObraModalComponent, NuevoTrabajoModalComponent, AgruparObrasModalComponent],
  templateUrl: './cliente-detail.component.html',
  styleUrl: './cliente-detail.component.scss',
})
export class ClienteDetailComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  clienteId: number | null = null;

  cargando = signal(true);
  guardando = signal(false);

  tipo = signal<ClienteTipo>('persona');

  // Pestañas: 'general' | 'obras'
  tab = signal<'general' | 'obras'>('general');

  // Modal "Nueva Obra" desde la pestaña Trabajos y Obras.
  mostrarNuevaObra = signal(false);

  // Campo actualmente en edición (su botón muestra "Guardar").
  campoEditando = signal<CampoEditable | null>(null);

  // Registro inicial de datos fiscales (cliente aún sin datos fiscales).
  agregandoFiscales = signal(false);
  guardandoFiscales = signal(false);
  // Indica si el cliente tiene datos fiscales PERSISTIDOS (cargados desde BD).
  // Determina si se muestra el switch "Agregar Datos Fiscales" o el listado de
  // campos ya guardados. NO depende del formulario en vivo: así un borrador
  // (switch ON + campos en edición) no se interpreta como datos guardados y no
  // se "auto-guarda" al escribir (BUG: guardado prematuro de Datos Fiscales).
  // Confirmación modal para eliminar todos los datos fiscales.
  confirmarEliminarFiscales = signal(false);

  contactos = signal<Contacto[]>([]);

  // Recarga canónica de contactos: avanza tras cada persistencia exitosa para
  // que `contact-list` (modo edición por fila) abandone la edición en curso.
  contactosVersion = signal(0);

  // Trabajos / Obras (pestaña 2)
  trabajos = signal<TrabajoDetalle[]>([]);
  obrasIndependientes = signal<ObraDetalle[]>([]);

  // Fase 5 — Selección de obras independientes para agrupar.
  modoAgrupar = signal(false);
  obrasSeleccionadas = signal<Set<number>>(new Set());
  obrasSeleccionadasLista = computed(() =>
    this.obrasIndependientes()
      .filter((o) => this.obrasSeleccionadas().has(o.idObra))
      .map((o) => ({
        idObra: o.idObra,
        nombre: o.nombre,
        direccion: o.direccion,
        estadoObra: o.estadoObra,
      }))
  );
  mostrarAgruparObras = signal(false);

  // Acordeón: ids de trabajos expandidos.
  expandidos = signal<Set<number>>(new Set());

  // Filtros de la pestaña.
  filtroEstado = signal<string>('todos');
  filtroTipo = signal<string>('todos');

  // Catálogo de estados para el filtro.
  estadosObraCatalogo: { id: number; nombre: string }[] = [];

  // Vista filtrada según filtroEstado / filtroTipo.
  obrasIndependientesFiltradas = computed(() =>
    this.aplicarFiltroEstado(this.obrasIndependientes())
  );
  trabajosFiltrados = computed(() =>
    this.trabajos()
      .map((t) => ({ ...t, obras: this.aplicarFiltroEstado(t.obras) }))
      .filter((t) => this.filtroTipo() === 'todos' || t.obras.length > 0)
  );
  tieneObras = computed(() => {
    const independientes = this.obrasIndependientesFiltradas();
    const trabajosVisibles = this.trabajosFiltrados();
    return independientes.length > 0 || trabajosVisibles.some((t) => t.obras.length > 0);
  });

  // Catálogos fiscales para el combo searchable de régimen / uso CFDI.
  regimenesFiscales: OpcionCatalogo[] = [];
  usosCfdi: OpcionCatalogo[] = [];
  busquedaRegimen = signal('');
  busquedaUso = signal('');
  comboAbierto = signal<string | null>(null);
  listadoRegimen = computed(() => this.filtrarCatalogo(this.busquedaRegimen(), this.regimenesFiscales));
  listadoUso = computed(() => this.filtrarCatalogo(this.busquedaUso(), this.usosCfdi));
  mostrarListaRegimen = computed(() => this.comboAbierto() === 'regimenFiscal' || this.busquedaRegimen().trim() !== '');
  mostrarListaUso = computed(() => this.comboAbierto() === 'usoCFDI' || this.busquedaUso().trim() !== '');

  form: FormGroup;

  constructor() {
    this.form = this.buildForm();
  }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id')) || null;
    if (!id) {
      this.toast.error('Cliente no válido.');
      this.router.navigate(['/admin/clientes']);
      return;
    }
    this.clienteId = id;
    void this.cargarTodo();
  }

  get esPersona(): boolean {
    return this.tipo() === 'persona';
  }

  get titulo(): string {
    return this.esPersona ? this.valor('nombre') || 'Detalle de Cliente' : this.valor('nombre') || 'Detalle de Empresa';
  }

  get tipoLabel(): string {
    return this.esPersona ? 'Persona' : 'Empresa';
  }

  // Datos fiscales del cliente (RFC y relación SAT). Se muestran si hay
  // al menos un valor GUARDADO (persistido). No se deriva del formulario en
  // vivo: el borrador de "Agregar Datos Fiscales" (switch ON) no cuenta como
  // datos guardados, evitando que teclear una letra dispare persistencia.
  fiscalesGuardados = signal(false);

  tieneDatosFiscales(): boolean {
    return this.fiscalesGuardados();
  }

  // --- Construcción del formulario (misma estructura que cliente-form) ----

  private buildForm(): FormGroup {
    const group = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(NOMBRE_MAX)]],
      telefono: ['', [Validators.pattern(TELEFONO_REACTIVO_PATTERN), Validators.maxLength(14)]],
      correo: ['', [Validators.email, Validators.maxLength(EMAIL_MAX)]],
      direccion: ['', [Validators.maxLength(DIRECCION_MAX)]],
      observaciones: ['', [Validators.maxLength(OBSERVACIONES_MAX)]],
      fiscal: this.fb.group({
        rfc: ['', [Validators.minLength(12), Validators.maxLength(13), Validators.pattern(RFC_PATTERN)]],
        razonSocial: ['', [Validators.maxLength(RAZON_SOCIAL_MAX)]],
        regimenFiscal: ['', []],
        usoCFDI: ['', []],
        codigoPostal: ['', [Validators.pattern(CODIGO_POSTAL_PATTERN)]],
        direccionFiscal: ['', [Validators.maxLength(DIRECCION_MAX)]],
      }),
    });

    // Los campos nacen bloqueados: solo se habilitan al pulsar "Editar".
    Object.values(group.controls).forEach((c) => c.disable());
    (group.get('fiscal') as FormGroup)?.controls && Object.values((group.get('fiscal') as FormGroup).controls).forEach((c) => c.disable());

    return group;
  }

  control(campo: CampoEditable): FormControl {
    if (campo === 'rfc' || campo === 'razonSocial' || campo === 'regimenFiscal' || campo === 'usoCFDI' || campo === 'codigoPostal' || campo === 'direccionFiscal') {
      return this.form.get(['fiscal', campo]) as FormControl;
    }
    return this.form.get(campo) as FormControl;
  }

  valor(campo: CampoEditable): string {
    const v = this.control(campo)?.value;
    return v == null ? '' : String(v);
  }

  estaEditando(campo: CampoEditable): boolean {
    return this.campoEditando() === campo;
  }

  editarCampo(campo: CampoEditable): void {
    if (this.guardando()) return;
    this.control(campo)?.enable();
    this.campoEditando.set(campo);
  }

  // ── Teléfono ─────────────────────────────────────────────────────────────
  // Filtra en vivo: solo "+", números y espacios (misma regla que Trabajadores).
  onTelefonoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = filtrarTelefonoInput(input.value);
    if (limpio !== input.value) {
      input.value = limpio;
      this.control('telefono')?.setValue(limpio);
    }
  }

  // --- Catálogos fiscales --------------------------------------------------

  private async cargarCatalogos(): Promise<void> {
    try {
      const res = await Promise.all([
        firstValueFrom(this.api.get('/Clientes/RegimenesFiscales')),
        firstValueFrom(this.api.get('/Clientes/UsosCFDI')),
      ]);
      const regs: any[] = (res[0] as any[]) ?? [];
      const usos: any[] = (res[1] as any[]) ?? [];
      this.regimenesFiscales = (regs || []).map((r) => ({
        value: String(r.IDREGIMENFISCAL ?? r.idRegimenFiscal),
        label: `${r.CODIGO ?? r.Codigo ?? ''} · ${r.DESCRIPCION ?? r.Descripcion ?? ''}`,
      }));
      this.usosCfdi = (usos || []).map((u) => ({
        value: String(u.IDUSOCFDI ?? u.idUsoCFDI),
        label: `${u.USOCFDI ?? u.UsoCFDI ?? ''} · ${u.DESCRIPCION ?? u.Descripcion ?? ''}`,
      }));
    } catch {
      // Catálogos opcionales: si fallan se conservan los valores por defecto.
    }
  }

  private filtrarCatalogo(termino: string, catalogo: OpcionCatalogo[]): OpcionCatalogo[] {
    const q = termino.trim().toLowerCase();
    if (!q) return catalogo;
    return catalogo.filter((o) => o.label.toLowerCase().includes(q));
  }

  labelCatalogo(clave: 'regimenFiscal' | 'usoCFDI'): string {
    const valorActual = this.control(clave)?.value ?? '';
    const catalogo = clave === 'regimenFiscal' ? this.regimenesFiscales : this.usosCfdi;
    return catalogo.find((o) => o.value === valorActual)?.label ?? '';
  }

  abrirCombo(clave: string): void {
    this.comboAbierto.set(clave);
  }

  cerrarCombo(): void {
    setTimeout(() => this.comboAbierto.set(null), 150);
  }

  seleccionarRegimen(opcion: OpcionCatalogo): void {
    this.control('regimenFiscal')?.setValue(opcion.value);
    this.busquedaRegimen.set('');
    this.comboAbierto.set(null);
  }

  seleccionarUso(opcion: OpcionCatalogo): void {
    this.control('usoCFDI')?.setValue(opcion.value);
    this.busquedaUso.set('');
    this.comboAbierto.set(null);
  }

  // --- Carga inicial ---------------------------------------------------------

  private async cargarTodo(): Promise<void> {
    this.cargando.set(true);
    try {
      await Promise.all([this.cargarDetalle(), this.cargarTrabajos()]);
      void this.cargarCatalogos();
    } catch {
      this.toast.error('No se pudo cargar la información del cliente.');
    } finally {
      this.cargando.set(false);
    }
  }

  private async cargarDetalle(): Promise<void> {
    const raw: any = await firstValueFrom(this.api.get('/Clientes/' + this.clienteId));

    const tipoRaw = String(raw.TIPO ?? raw.Tipo ?? raw.tipo ?? 'persona').toLowerCase();
    const tipo: ClienteTipo = tipoRaw === 'persona' ? 'persona' : 'empresa';
    this.tipo.set(tipo);

    this.form.patchValue({
      nombre: raw.NOMBRE ?? raw.Nombre ?? raw.nombre ?? '',
      telefono: raw.TELEFONO ?? raw.Telefono ?? raw.telefono ?? '',
      correo: raw.CORREO ?? raw.Correo ?? raw.correo ?? '',
      direccion: raw.DIRECCION ?? raw.Direccion ?? raw.direccion ?? '',
      observaciones: raw.OBSERVACIONES ?? raw.observaciones ?? '',
      fiscal: {
        rfc: (raw.RFC ?? raw.rfc ?? '') || '',
        razonSocial: (raw.RAZONSOCIAL ?? raw.RazonSocial ?? raw.razonSocial ?? '') || '',
        regimenFiscal: raw.IDREGIMENFISCAL != null ? String(raw.IDREGIMENFISCAL ?? raw.idRegimenFiscal) : '',
        usoCFDI: raw.IDUSOCFDI != null ? String(raw.IDUSOCFDI ?? raw.idUsoCFDI) : '',
        codigoPostal: (raw.CODIGOPOSTAL ?? raw.codigoPostal ?? '') || '',
        direccionFiscal: raw.DIRECCIONFISCAL ?? raw.DireccionFiscal ?? raw.direccionFiscal ?? '',
      },
    });

    // ¿Hay datos fiscales PERSISTIDOS? (los del borrador "Agregar Datos
    // Fiscales" NO cuentan). Controla la rama del template: switch "Agregar"
    // vs. edición campo por campo.
    const fiscalPersistido = [
      raw.RFC ?? raw.rfc ?? '',
      raw.RAZONSOCIAL ?? raw.RazonSocial ?? raw.razonSocial ?? '',
      raw.IDREGIMENFISCAL != null ? String(raw.IDREGIMENFISCAL ?? raw.idRegimenFiscal) : '',
      raw.IDUSOCFDI != null ? String(raw.IDUSOCFDI ?? raw.idUsoCFDI) : '',
      raw.CODIGOPOSTAL ?? raw.codigoPostal ?? '',
      raw.DIRECCIONFISCAL ?? raw.DireccionFiscal ?? raw.direccionFiscal ?? '',
    ];
    this.fiscalesGuardados.set(fiscalPersistido.some((v) => String(v ?? '').trim() !== ''));

    this.contactos.set(
      Array.isArray(raw.contactos)
        ? raw.contactos.map((c: any) => ({
            id: c.IDCONTACTOCLIENTE ?? c.idContactoCliente ?? c.id,
            nombreCompleto: c.NOMBRECOMPLETO ?? c.NombreCompleto ?? c.nombreCompleto ?? '',
            telefono: c.TELEFONO ?? c.Telefono ?? c.telefono ?? '',
            correo: c.CORREO ?? c.Correo ?? c.correo ?? '',
            observaciones: c.OBSERVACIONES ?? c.observaciones ?? '',
          }))
        : []
    );
  }

  private async cargarTrabajos(): Promise<void> {
    const raw: any = await firstValueFrom(this.api.get('/Clientes/' + this.clienteId + '/trabajos'));

    // Catálogo de estados (para el filtro), si no está cargado aún.
    if (this.estadosObraCatalogo.length === 0) {
      try {
        const estados: any[] = await firstValueFrom(this.api.get<any[]>('/Obras/estados'));
        this.estadosObraCatalogo = (estados || [])
          .map((e) => ({
            id: Number(e.IDESTADOOBRA ?? e.idEstadoObra),
            nombre: String(e.NOMBRE ?? e.Nombre ?? e.nombre ?? ''),
          }))
          .filter((e) => e.id && e.nombre);
      } catch {
        this.estadosObraCatalogo = [];
      }
    }

    const mapObra = (o: any): ObraDetalle => ({
      idObra: Number(o.IDOBRA ?? o.idObra),
      nombre: o.NOMBRE ?? o.Nombre ?? o.nombre ?? '',
      direccion: o.DIRECCION ?? o.Direccion ?? o.direccion ?? '',
      estadoObra: o.ESTADOBRA ?? o.EstadoObra ?? o.estadoObra ?? '',
      fechaCreacion: o.FECHACREACION ?? o.fechaCreacion ?? '',
    });

    this.obrasIndependientes.set(
      (Array.isArray(raw.obrasIndependientes) ? raw.obrasIndependientes : []).map(mapObra)
    );

    this.trabajos.set(
      (Array.isArray(raw.trabajos) ? raw.trabajos : []).map((t: any) => ({
        idTrabajo: Number(t.IDTRABAJO ?? t.idTrabajo),
        nombre: t.NOMBRE ?? t.Nombre ?? t.nombre ?? '',
        descripcion: t.DESCRIPCION ?? t.Descripcion ?? t.descripcion ?? '',
        direccion: t.DIRECCION ?? t.Direccion ?? t.direccion ?? '',
        fechaCreacion: t.FECHACREACION ?? t.fechaCreacion ?? '',
        obras: (Array.isArray(t.obras) ? t.obras : []).map(mapObra),
      }))
    );
  }

  // --- Guardar campo (patrón Editar / Guardar) ------------------------------

  invalidarCampo(campo: CampoEditable): boolean {
    const c = this.control(campo);
    return !!c && c.invalid && c.touched;
  }

  mensajeError(campo: CampoEditable): string {
    const c = this.control(campo);
    if (!c || !c.errors) return '';
    const k = Object.keys(c.errors ?? {})[0];
    switch (k) {
      case 'required': return 'Este campo es obligatorio.';
      case 'email': return 'Correo electrónico inválido.';
      case 'pattern':
        return campo === 'telefono' ? 'Teléfono inválido: usa "+52" y el número (máx. 14 caracteres incluyendo espacios).'
          : campo === 'rfc' ? 'RFC inválido (12-13 caracteres).'
          : campo === 'codigoPostal' ? 'Código postal de 5 dígitos.'
          : 'Formato inválido.';
      case 'maxlength': return 'El valor excede la longitud permitida.';
      default: return 'Valor inválido.';
    }
  }

  async guardarCampo(campo: CampoEditable): Promise<void> {
    const c = this.control(campo);
    if (!c) return;
    c.markAsTouched();

    // Validación del formulario completo (los demás campos están bloqueados,
    // por lo que no modifican su estado; solo se valida el campo editable).
    if (c.invalid) {
      this.toast.warning(this.mensajeError(campo));
      return;
    }

    // Persona: exige al menos un teléfono o un correo (misma regla del alta).
    if (this.esPersona && (campo === 'telefono' || campo === 'correo')) {
      const tel = String(this.valor('telefono')).trim();
      const cor = String(this.valor('correo')).trim();
      if (!tel && !cor) {
        this.toast.warning('Para una persona se requiere al menos un teléfono o un correo.');
        return;
      }
    }

    this.guardando.set(true);
    try {
      const payload = this.buildPayload();
      await firstValueFrom(this.api.put('/Clientes/' + this.clienteId, payload));

      c.disable();
      this.campoEditando.set(null);

      // Recarga el detalle para reflejar el estado canónico en BD.
      await this.cargarDetalle();
      this.toast.success('Campo actualizado correctamente');
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    } finally {
      this.guardando.set(false);
    }
  }

  // --- Datos fiscales: registro inicial (cliente sin datos) ------------------
  // Mismo diseño que cliente-form: switch ON/OFF que despliega el formulario.

  /** Activa/cancela el formulario "Agregar Datos Fiscales". */
  toggleAgregarFiscales(): void {
    if (this.guardando() || this.guardandoFiscales()) return;
    const activar = !this.agregandoFiscales();
    this.agregandoFiscales.set(activar);
    if (activar) {
      CAMPOS_FISCALES.forEach((campo) => {
        this.control(campo).setValue('');
        this.control(campo).enable();
      });
    } else {
      this.cancelarAgregarFiscales();
    }
  }

  cancelarAgregarFiscales(): void {
    CAMPOS_FISCALES.forEach((campo) => {
      this.control(campo).reset();
      this.control(campo).disable();
    });
    this.busquedaRegimen.set('');
    this.busquedaUso.set('');
    this.comboAbierto.set(null);
    this.agregandoFiscales.set(false);
  }

  async guardarFiscales(): Promise<void> {
    if (this.guardandoFiscales()) return;

    // Regla de cliente-form: el RFC es obligatorio cuando el switch está ON.
    const rfc = String(this.valor('rfc')).trim();
    if (!rfc) {
      this.toast.warning('El RFC es obligatorio para registrar los datos fiscales.');
      return;
    }

    CAMPOS_FISCALES.forEach((campo) => this.control(campo).markAsTouched());
    const invalido = CAMPOS_FISCALES.find((campo) => this.control(campo).invalid);
    if (invalido) {
      this.toast.warning(this.mensajeError(invalido));
      return;
    }

    this.guardandoFiscales.set(true);
    try {
      // El borrador fiscal se agrega EXPLÍCITAMENTE al payload (buildPayload
      // lo excluye mientras agregandoFiscales() está activo para que el
      // guardado de otros campos no persista el borrador).
      const payload = this.buildPayload();
      const fiscal = this.form.getRawValue().fiscal;
      payload['RazonSocial'] = fiscal.razonSocial || null;
      payload['RFC'] = fiscal.rfc || null;
      payload['idRegimenFiscal'] = fiscal.regimenFiscal ? Number(fiscal.regimenFiscal) : null;
      payload['idUsoCFDI'] = fiscal.usoCFDI ? Number(fiscal.usoCFDI) : null;
      payload['CodigoPostal'] = fiscal.codigoPostal || null;
      payload['DireccionFiscal'] = fiscal.direccionFiscal || null;

      await firstValueFrom(this.api.put('/Clientes/' + this.clienteId, payload));
      CAMPOS_FISCALES.forEach((campo) => this.control(campo).disable());
      this.agregandoFiscales.set(false);
      await this.cargarDetalle();
      this.toast.success('Datos fiscales registrados correctamente');
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    } finally {
      this.guardandoFiscales.set(false);
    }
  }

  // --- Datos fiscales: eliminación (requiere confirmación modal) -------------

  solicitarEliminarFiscales(): void {
    if (this.guardando() || this.guardandoFiscales()) return;
    this.confirmarEliminarFiscales.set(true);
  }

  cancelarEliminarFiscales(): void {
    this.confirmarEliminarFiscales.set(false);
  }

  async eliminarFiscales(): Promise<void> {
    this.confirmarEliminarFiscales.set(false);
    if (this.guardando() || this.guardandoFiscales()) return;

    this.guardandoFiscales.set(true);
    try {
      const payload = this.buildPayload();
      payload['RFC'] = null;
      payload['RazonSocial'] = null;
      payload['idRegimenFiscal'] = null;
      payload['idUsoCFDI'] = null;
      payload['CodigoPostal'] = null;
      payload['DireccionFiscal'] = null;
      await firstValueFrom(this.api.put('/Clientes/' + this.clienteId, payload));
      await this.cargarDetalle();
      this.toast.success('Datos fiscales eliminados');
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    } finally {
      this.guardandoFiscales.set(false);
    }
  }

  // --- Contactos (empresa): estado en memoria. Persistencia SOLO por acción
  // explícita del usuario (Guardar/Cancelar/Eliminar por fila). No hay
  // autoguardado: escribir en un campo jamás dispara HTTP.

  onContactosChange(lista: Contacto[]): void {
    this.contactos.set(lista);
  }

  // Persistencia explícita de la lista de contactos (modo edición por fila).
  // Se invoca únicamente desde `persistirContactos` (Guardar/Eliminar por
  // fila), nunca al escribir en los campos.
  async persistirContactos(lista: Contacto[]): Promise<void> {
    if (this.guardando() || this.guardandoFiscales()) return;

    // Regla de negocio (backend): una empresa requiere al menos un contacto.
    if (lista.length === 0) {
      this.toast.warning('Para una empresa se requiere al menos un contacto.');
      await this.cargarDetalle();
      return;
    }

    const contactosPayload = lista.map((c) => ({
      idContactoCliente: c.id ?? null,
      NombreCompleto: c.nombreCompleto,
      Telefono: c.telefono ? sanitizarTelefono(c.telefono) : null,
      Correo: c.correo || null,
      Observaciones: c.observaciones || null,
    }));

    this.guardando.set(true);
    try {
      const payload = this.buildPayload();
      payload['contactos'] = contactosPayload;
      await firstValueFrom(this.api.put('/Clientes/' + this.clienteId, payload));
      await this.cargarDetalle();
      this.contactosVersion.update((v) => v + 1);
      this.toast.success('Contactos actualizados correctamente');
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    } finally {
      this.guardando.set(false);
    }
  }

  private buildPayload(): Record<string, unknown> {
    const raw = this.form.getRawValue();

    // Mientras se está en "Agregar Datos Fiscales" (borrador), el guardado de
    // OTROS campos NO debe incluir el borrador fiscal: eso evita persistir
    // datos incompletos al guardar un campo de información general.
    const fiscal = this.agregandoFiscales()
      ? { rfc: '', razonSocial: '', regimenFiscal: '', usoCFDI: '', codigoPostal: '', direccionFiscal: '' }
      : raw.fiscal;

    const base: Record<string, unknown> = {
      Nombre: raw.nombre,
      RazonSocial: fiscal.razonSocial || null,
      Observaciones: raw.observaciones || null,
      RFC: fiscal.rfc || null,
      idRegimenFiscal: fiscal.regimenFiscal ? Number(fiscal.regimenFiscal) : null,
      idUsoCFDI: fiscal.usoCFDI ? Number(fiscal.usoCFDI) : null,
      CodigoPostal: fiscal.codigoPostal || null,
      DireccionFiscal: fiscal.direccionFiscal || null,
    };

    if (this.esPersona) {
      // Persona: el backend actualiza el contacto principal con Telefono/Correo.
      // No se envían `contactos` para no alterar la lista de contactos.
      return {
        ...base,
        Direccion: raw.direccion || null,
        Telefono: raw.telefono ? sanitizarTelefono(raw.telefono) : null,
        Correo: raw.correo || null,
        tipo: 'persona',
      };
    }

    // Empresa: la lista de contactos se gestiona por fila desde esta pantalla
    // (Guardar/Eliminar explícitos); `persistirContactos` agrega `contactos`
    // al payload. Aquí no se envían para no alterar la lista en operaciones
    // de otros campos.
    return {
      ...base,
      Direccion: raw.direccion || null,
      tipo: 'empresa',
    };
  }

  // --- Pestaña Trabajos / Obras ---------------------------------------------

  // Fase 4 — Acordeón: expande/colapsa un trabajo.
  toggleTrabajo(id: number): void {
    this.expandidos.update((set) => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  estaExpandido(id: number): boolean {
    return this.expandidos().has(id);
  }

  // Fase 6 — Filtros: por estado y por tipo (independiente | en trabajo).
  setFiltroEstado(valor: string): void {
    this.filtroEstado.set(valor);
  }

  setFiltroTipo(valor: string): void {
    this.filtroTipo.set(valor);
  }

  private aplicarFiltroEstado(obras: ObraDetalle[]): ObraDetalle[] {
    if (this.filtroEstado() === 'todos') return obras;
    return obras.filter((o) => o.estadoObra === this.filtroEstado());
  }

  // Agregar obra ligada a un trabajo (acordeón → botón "Agregar Obra").
  obraEnTrabajoSeleccionado: { id: number; nombre: string } | null = null;
  agregarObraATrabajo(idTrabajo: number, nombreTrabajo: string): void {
    this.obraEnTrabajoSeleccionado = { id: idTrabajo, nombre: nombreTrabajo };
    this.mostrarNuevaObra.set(true);
  }

  // Fase 5 — Selección de obras para agrupar.
  activarModoAgrupar(): void {
    this.modoAgrupar.set(true);
  }

  salirModoAgrupar(): void {
    this.modoAgrupar.set(false);
    this.obrasSeleccionadas.set(new Set());
  }

  toggleObraSeleccionada(idObra: number): void {
    this.obrasSeleccionadas.update((set) => {
      const next = new Set(set);
      if (next.has(idObra)) {
        next.delete(idObra);
      } else {
        next.add(idObra);
      }
      return next;
    });
  }

  estaSeleccionada(idObra: number): boolean {
    return this.obrasSeleccionadas().has(idObra);
  }

  abrirAgruparObras(): void {
    if (this.obrasSeleccionadas().size === 0) return;
    this.mostrarAgruparObras.set(true);
  }

  cerrarAgruparObras(): void {
    this.mostrarAgruparObras.set(false);
  }

  async onObrasAgrupadas(): Promise<void> {
    this.mostrarAgruparObras.set(false);
    this.salirModoAgrupar();
    await this.cargarTrabajos();
  }

  abrirNuevaObra(): void {
    this.obraEnTrabajoSeleccionado = null;
    this.mostrarNuevaObra.set(true);
  }

  cerrarNuevaObra(): void {
    this.mostrarNuevaObra.set(false);
  }

  async onNuevaObraCreada(): Promise<void> {
    this.mostrarNuevaObra.set(false);
    await this.cargarTrabajos();
  }

  // Modal "Nuevo Trabajo" desde la pestaña Trabajos y Obras.
  mostrarNuevoTrabajo = signal(false);

  abrirNuevoTrabajo(): void {
    this.mostrarNuevoTrabajo.set(true);
  }

  cerrarNuevoTrabajo(): void {
    this.mostrarNuevoTrabajo.set(false);
  }

  async onNuevoTrabajoCreado(): Promise<void> {
    this.mostrarNuevoTrabajo.set(false);
    await this.cargarTrabajos();
  }

  abrirObra(obra: ObraDetalle): void {
    this.router.navigate(['/admin/obras/detalle', obra.idObra], {
      state: { clienteId: this.clienteId },
    });
  }

  regresar(): void {
    this.router.navigate(['/admin/clientes']);
  }

  metaContacto(c?: Contacto): string {
    const partes = [c?.telefono, c?.correo].filter(Boolean);
    return partes.join(' · ');
  }
}