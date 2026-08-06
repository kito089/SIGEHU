import { Component, Input, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EntityFormComponent } from '../../../../shared/components/entity-form/entity-form.component';
import { ContactListComponent } from '../../../../shared/components/contact-list/contact-list.component';
import type { ClienteTipo, Contacto } from '../../../../core/models/cliente.model';
import {
  TELEFONO_PATTERN,
  RFC_PATTERN,
  CODIGO_POSTAL_PATTERN,
  EMAIL_MAX,
  NOMBRE_MAX,
  DIRECCION_MAX,
  OBSERVACIONES_MAX,
  RAZON_SOCIAL_MAX,
  telefonoOcorreoRequired,
} from '../../../../shared/validators/custom-validators';

/* =========================================================================
   SIGEHU — Agregar / Editar Cliente (componente Angular standalone)

   Registra tanto Personas como Empresas mediante un selector de dos botones
   mutuamente excluyentes que reconstruye el formulario según el tipo.

   Conexión al backend (pertenencia: módulo Clientes):
     - GET    /Clientes/RegimenesFiscales  → catálogo de regímenes
     - GET    /Clientes/UsosCFDI           → catálogo de usos de CFDI
     - GET    /Clientes/:id                → carga datos para edición
     - POST   /Clientes                    → alta
     - PUT    /Clientes/:id                → edición
   ========================================================================= */

interface OpcionCatalogo {
  value: string;
  label: string;
}

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EntityFormComponent, ContactListComponent],
  templateUrl: './cliente-form.component.html',
  styleUrls: ['./cliente-form.component.css'],
})
export class ClienteFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  @Input() clienteId: number | null = null;

  tipo = signal<ClienteTipo>('persona');
  showDatosFiscalesPersona = signal(false);
  showDatosFiscalesEmpresa = signal(false);
  contactos = signal<Contacto[]>([]);

  form: FormGroup;
  loading = false;
  guardando = false;

  regimenesFiscales: OpcionCatalogo[] = [];
  usosCfdi: OpcionCatalogo[] = [];

  busquedaRegimenPersona = signal('');
  busquedaRegimenEmpresa = signal('');
  busquedaUsoPersona = signal('');
  busquedaUsoEmpresa = signal('');

  listadoRegimenPersona = computed(() => this.filtrarCatalogo(this.busquedaRegimenPersona(), this.regimenesFiscales));
  listadoRegimenEmpresa = computed(() => this.filtrarCatalogo(this.busquedaRegimenEmpresa(), this.regimenesFiscales));
  listadoUsoPersona = computed(() => this.filtrarCatalogo(this.busquedaUsoPersona(), this.usosCfdi));
  listadoUsoEmpresa = computed(() => this.filtrarCatalogo(this.busquedaUsoEmpresa(), this.usosCfdi));

  constructor() {
    this.form = this.buildPersonaForm();
    this.form.setValidators([telefonoOcorreoRequired]);
  }

  ngOnInit(): void {
    const qId = this.route.snapshot.queryParamMap.get('id');
    if (qId) {
      this.clienteId = Number(qId) || null;
    }

    this.cargarCatalogos();

    if (this.clienteId) {
      this.loading = true;
      this.fetchCliente(this.clienteId).then(data => {
        this.aplicarEdicion(data);
        this.loading = false;
      }).catch(() => {
        this.loading = false;
        this.toast.error('No se pudo cargar la información del cliente.');
      });
    }
  }

  get esEdicion(): boolean {
    return this.clienteId !== null;
  }

  get esPersona(): boolean {
    return this.tipo() === 'persona';
  }

  get esEmpresa(): boolean {
    return this.tipo() === 'empresa';
  }

  get fiscalPersonaGroup(): FormGroup {
    return this.form.get('fiscalPersona') as FormGroup;
  }

  get fiscalEmpresaGroup(): FormGroup {
    return this.form.get('fiscalEmpresa') as FormGroup;
  }

  setTipo(t: ClienteTipo): void {
    if (this.tipo() === t) return;
    this.tipo.set(t);
    this.form = t === 'persona' ? this.buildPersonaForm() : this.buildEmpresaForm();
    if (t === 'persona') {
      this.form.setValidators([telefonoOcorreoRequired]);
    } else {
      this.form.setValidators([]);
    }
  }

  // --- Construcción de formularios por tipo (wave 2) --------------------

  private buildPersonaForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(NOMBRE_MAX)]],
      telefono: ['', [Validators.pattern(TELEFONO_PATTERN)]],
      correo: ['', [Validators.email, Validators.maxLength(EMAIL_MAX)]],
      observaciones: ['', [Validators.maxLength(OBSERVACIONES_MAX)]],
      fiscalPersona: this.fb.group({
        rfc: ['', [Validators.pattern(RFC_PATTERN)]],
        razonSocial: ['', [Validators.maxLength(RAZON_SOCIAL_MAX)]],
        regimenFiscal: ['', []],
        usoCFDI: ['', []],
        codigoPostal: ['', [Validators.pattern(CODIGO_POSTAL_PATTERN)]],
        direccion: ['', [Validators.maxLength(DIRECCION_MAX)]],
      }),
    });
  }

  private buildEmpresaForm(): FormGroup {
    return this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(NOMBRE_MAX)]],
      direccion: ['', [Validators.maxLength(DIRECCION_MAX)]],
      observaciones: ['', [Validators.maxLength(OBSERVACIONES_MAX)]],
      fiscalEmpresa: this.fb.group({
        rfc: ['', [Validators.pattern(RFC_PATTERN)]],
        razonSocial: ['', [Validators.maxLength(RAZON_SOCIAL_MAX)]],
        regimenFiscal: ['', []],
        usoCFDI: ['', []],
        codigoPostal: ['', [Validators.pattern(CODIGO_POSTAL_PATTERN)]],
        direccionFiscal: ['', [Validators.maxLength(DIRECCION_MAX)]],
      }),
    });
  }

  // Searchers reutilizados (consumen catálogos del módulo Clientes) ------

  private async cargarCatalogos(): Promise<void> {
    try {
      const res = await Promise.all([
        firstValueFrom(this.api.get('/Clientes/RegimenesFiscales')),
        firstValueFrom(this.api.get('/Clientes/UsosCFDI')),
      ]);
      const regs: any[] = (res[0] as any[]) ?? [];
      const usos: any[] = (res[1] as any[]) ?? [];
      this.regimenesFiscales = (regs || []).map(r => ({
        value: String(r.IDREGIMENFISCAL ?? r.idRegimenFiscal),
        label: `${r.CODIGO ?? r.Codigo ?? ''} · ${r.DESCRIPCION ?? r.Descripcion ?? ''}`,
      }));
      this.usosCfdi = (usos || []).map(u => ({
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
    return catalogo.filter(o => o.label.toLowerCase().includes(q));
  }

  seleccionarRegimenPersona(opcion: OpcionCatalogo): void {
    this.form.get(['fiscalPersona', 'regimenFiscal'])?.setValue(opcion.value);
    this.busquedaRegimenPersona.set('');
  }

  seleccionarRegimenEmpresa(opcion: OpcionCatalogo): void {
    this.form.get(['fiscalEmpresa', 'regimenFiscal'])?.setValue(opcion.value);
    this.busquedaRegimenEmpresa.set('');
  }

  seleccionarUsoPersona(opcion: OpcionCatalogo): void {
    this.form.get(['fiscalPersona', 'usoCFDI'])?.setValue(opcion.value);
    this.busquedaUsoPersona.set('');
  }

  seleccionarUsoEmpresa(opcion: OpcionCatalogo): void {
    this.form.get(['fiscalEmpresa', 'usoCFDI'])?.setValue(opcion.value);
    this.busquedaUsoEmpresa.set('');
  }

  labelCatalogo(valor: string, catalogo: OpcionCatalogo[]): string {
    return catalogo.find(o => o.value === valor)?.label ?? '';
  }

  onToggleDatosFiscalesPersona(activo: boolean): void {
    this.showDatosFiscalesPersona.set(activo);
  }

  onToggleDatosFiscalesEmpresa(activo: boolean): void {
    this.showDatosFiscalesEmpresa.set(activo);
  }

  onContactosChange(lista: Contacto[]): void {
    this.contactos.set(lista);
  }

  // ----------------------------------------------------------------------
  // Submit
  // ----------------------------------------------------------------------

  async onSubmit(): Promise<void> {
    if (this.form.invalid || (this.esEmpresa && this.contactos().length === 0)) {
      this.form.markAllAsTouched();
      this.toast.warning(this.esEmpresa && this.contactos().length === 0
        ? 'Registra al menos un contacto para la empresa.'
        : 'Corrige los campos marcados antes de guardar.');
      return;
    }

    this.guardando = true;

    try {
      await this.guardar();
      this.toast.success(this.esEdicion ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente');
      this.router.navigate(['/admin/clientes']);
    } catch (err) {
      const mensajeBackend = (err as any)?.error?.error;
      if (!mensajeBackend) {
        this.toast.error('Error de comunicación: no se pudo completar la transacción de datos.');
      }
      console.error('[cliente-form] Error al guardar:', err);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/clientes']);
  }

  private async guardar(): Promise<void> {
    const raw = this.form.getRawValue();
    const esPersonaCliente = this.tipo() === 'persona';

    const fiscalesActivos = esPersonaCliente
      ? this.showDatosFiscalesPersona()
      : this.showDatosFiscalesEmpresa();

    const fiscal = esPersonaCliente ? raw.fiscalPersona : raw.fiscalEmpresa;

    const payload: Record<string, unknown> = {
      Nombre: raw.nombre,
      Observaciones: raw.observaciones || null,
      RFC: fiscalesActivos ? (fiscal.rfc || null) : null,
      idRegimenFiscal: fiscalesActivos && fiscal.regimenFiscal ? Number(fiscal.regimenFiscal) : null,
      idUsoCFDI: fiscalesActivos && fiscal.usoCFDI ? Number(fiscal.usoCFDI) : null,
      CodigoPostal: fiscalesActivos ? (fiscal.codigoPostal || null) : null,
      Direccion: fiscalesActivos ? (fiscal.direccion || fiscal.direccionFiscal || null) : null,
      tipo: this.tipo(),
    };

    if (esPersonaCliente) {
      payload['Telefono'] = String(raw.telefono || '').replace(/\D/g, '');
      payload['Correo'] = raw.correo || null;
    }

    const contactos = this.contactos().map(c => ({
      NombreCompleto: c.nombreCompleto,
      Telefono: String(c.telefono || '').replace(/\D/g, ''),
      Correo: c.correo || null,
    }));

    if (this.clienteId) {
      payload['contactos'] = esPersonaCliente
        ? [{ NombreCompleto: raw.nombre, Telefono: payload['Telefono'], Correo: payload['Correo'] }, ...contactos]
        : contactos;
      await firstValueFrom(this.api.put('/Clientes/' + this.clienteId, payload));
    } else {
      payload['contactos'] = esPersonaCliente
        ? [{ NombreCompleto: raw.nombre, Telefono: payload['Telefono'], Correo: payload['Correo'] }, ...contactos]
        : contactos;
      await firstValueFrom(this.api.post('/Clientes', payload));
    }
  }

  private async fetchCliente(id: number): Promise<ClienteForm> {
    const raw: any = await firstValueFrom(this.api.get('/Clientes/' + id));
    const tipoValor = raw.TIPOCLIENTE ?? raw.tipoCliente ?? '';
    const tipo: ClienteTipo = /persona|fisic/i.test(tipoValor) ? 'persona' : 'empresa';
    return {
      tipo,
      nombre: raw.NOMBRE ?? raw.nombre ?? '',
      direccion: raw.DIRECCION ?? raw.direccion ?? '',
      telefono: raw.TELEFONO ?? raw.telefono ?? '',
      correo: raw.CORREO ?? raw.correo ?? '',
      observaciones: raw.OBSERVACIONES ?? raw.observaciones ?? '',
      rfc: raw.RFC ?? raw.rfc ?? '',
      idRegimenFiscal: raw.IDREGIMENFISCAL ?? raw.idRegimenFiscal ?? null,
      idUsoCFDI: raw.IDUSOCFDI ?? raw.idUsoCFDI ?? null,
      codigoPostal: raw.CODIGOPOSTAL ?? raw.codigoPostal ?? '',
      contactos: Array.isArray(raw.contactos) ? raw.contactos.map((c: any) => ({
        nombreCompleto: c.NombreCompleto ?? c.nombreCompleto ?? '',
        telefono: c.Telefono ?? c.telefono ?? '',
        correo: c.Correo ?? c.correo ?? '',
      })) : [],
    };
  }

  private aplicarEdicion(data: ClienteForm): void {
    this.setTipo(data.tipo === 'empresa' ? 'empresa' : 'persona');
    const tieneFiscales = !!data.rfc;

    if (data.tipo === 'persona') {
      this.form.patchValue({
        nombre: data.nombre,
        telefono: data.telefono ?? '',
        correo: data.correo ?? '',
        observaciones: data.observaciones ?? '',
        fiscalPersona: {
          rfc: data.rfc ?? '',
          regimenFiscal: data.idRegimenFiscal != null ? String(data.idRegimenFiscal) : '',
          usoCFDI: data.idUsoCFDI != null ? String(data.idUsoCFDI) : '',
          codigoPostal: data.codigoPostal ?? '',
        },
      });
      if (data.rfc) this.showDatosFiscalesPersona.set(true);
    } else {
      this.form.patchValue({
        nombre: data.nombre,
        direccion: data.direccion ?? '',
        observaciones: data.observaciones ?? '',
        fiscalEmpresa: {
          rfc: data.rfc ?? '',
          regimenFiscal: data.idRegimenFiscal != null ? String(data.idRegimenFiscal) : '',
          usoCFDI: data.idUsoCFDI != null ? String(data.idUsoCFDI) : '',
          codigoPostal: data.codigoPostal ?? '',
          direccionFiscal: data.direccion ?? '',
        },
      });
      if (data.rfc) this.showDatosFiscalesEmpresa.set(true);
    }

    if (data.contactos && data.contactos.length) {
      this.contactos.set(data.contactos);
    }
  }
}

interface ClienteForm {
  tipo: ClienteTipo;
  nombre: string;
  direccion?: string;
  telefono?: string;
  correo?: string;
  observaciones?: string;
  rfc?: string;
  idRegimenFiscal?: number | null;
  idUsoCFDI?: number | null;
  codigoPostal?: string;
  contactos?: Contacto[];
}