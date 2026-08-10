import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { SkeletonComponent } from '../../../../shared/components/skeleton/skeleton.component';
import { NuevaObraModalComponent } from './nueva-obra-modal/nueva-obra-modal.component';
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
  imports: [CommonModule, ReactiveFormsModule, SkeletonComponent, NuevaObraModalComponent],
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

  contactos = signal<Contacto[]>([]);

  // Trabajos / Obras (pestaña 2)
  trabajos = signal<TrabajoDetalle[]>([]);
  obrasIndependientes = signal<ObraDetalle[]>([]);

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

  // --- Construcción del formulario (misma estructura que cliente-form) ----

  private buildForm(): FormGroup {
    const group = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(NOMBRE_MAX)]],
      telefono: ['', [Validators.pattern(TELEFONO_REACTIVO_PATTERN), Validators.maxLength(15)]],
      correo: ['', [Validators.email, Validators.maxLength(EMAIL_MAX)]],
      direccion: ['', [Validators.maxLength(DIRECCION_MAX)]],
      observaciones: ['', [Validators.maxLength(OBSERVACIONES_MAX)]],
      fiscal: this.fb.group({
        rfc: ['', [Validators.pattern(RFC_PATTERN)]],
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
        return campo === 'telefono' ? 'Teléfono inválido: usa "+", números y espacios (máx. 15 caracteres).'
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

  private buildPayload(): Record<string, unknown> {
    const raw = this.form.getRawValue();
    const fiscal = raw.fiscal;

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

    // Empresa: no se gestiona la lista de contactos desde esta pantalla, por
    // lo que NO se envía `contactos` (el backend conserva los existentes).
    return {
      ...base,
      Direccion: raw.direccion || null,
      tipo: 'empresa',
    };
  }

  // --- Pestaña Trabajos / Obras ---------------------------------------------

  tieneObras(): boolean {
    return this.obrasIndependientes().length > 0 || this.trabajos().some((t) => t.obras.length > 0);
  }

  abrirNuevaObra(): void {
    this.mostrarNuevaObra.set(true);
  }

  cerrarNuevaObra(): void {
    this.mostrarNuevaObra.set(false);
  }

  async onNuevaObraCreada(): Promise<void> {
    this.mostrarNuevaObra.set(false);
    await this.cargarTrabajos();
  }

  abrirObra(obra: ObraDetalle): void {
    this.router.navigate(['/admin/obras/editar', obra.idObra]);
  }

  regresar(): void {
    this.router.navigate(['/admin/clientes']);
  }

  metaContacto(c?: Contacto): string {
    const partes = [c?.telefono, c?.correo].filter(Boolean);
    return partes.join(' · ');
  }
}