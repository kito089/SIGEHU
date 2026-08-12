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
  RFC_PATTERN,
  CODIGO_POSTAL_PATTERN,
  EMAIL_MAX,
  NOMBRE_MAX,
  DIRECCION_MAX,
  OBSERVACIONES_MAX,
  RAZON_SOCIAL_MAX,
  telefonoOcorreoRequired,
} from '../../../../shared/validators/custom-validators';
import {
  TELEFONO_REACTIVO_PATTERN,
  filtrarTelefonoInput,
  sanitizarTelefono,
} from '../../../../core/utils/telefono.util';


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

  // Tipo de cliente seleccionado (Persona | Empresa). La edición detecta el
  // tipo guardado y reconstruye el formulario correspondiente.
  tipo = signal<ClienteTipo>('persona');

  contactos = signal<Contacto[]>([]);

  form: FormGroup;
  loading = false;
  guardando = false;

  regimenesFiscales: OpcionCatalogo[] = [];
  usosCfdi: OpcionCatalogo[] = [];

  busquedaRegimen = signal('');
  busquedaUso = signal('');

  // Tarea: ComboBox abiertos con un solo clic. La lista se despliega al
  // enfocar/activar el campo completo (y también al escribir), sin requerir
  // un segundo clic. `comboAbierto` guarda cuál catálogo está desplegado.
  comboAbierto = signal<string | null>(null);

  listadoRegimen = computed(() => this.filtrarCatalogo(this.busquedaRegimen(), this.regimenesFiscales));
  listadoUso = computed(() => this.filtrarCatalogo(this.busquedaUso(), this.usosCfdi));

  mostrarListaRegimen = computed(() => this.comboAbierto() === 'regimen' || this.busquedaRegimen().trim() !== '');
  mostrarListaUso = computed(() => this.comboAbierto() === 'uso' || this.busquedaUso().trim() !== '');

  constructor() {
    this.form = this.buildForm();
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

  get fiscalGroup(): FormGroup {
    return this.form.get('fiscal') as FormGroup;
  }

  // --- Construcción del formulario (Persona | Empresa) ------------------

  private buildForm(): FormGroup {
    const group = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(NOMBRE_MAX)]],
      telefono: ['', [Validators.pattern(TELEFONO_REACTIVO_PATTERN), Validators.maxLength(14)]],
      correo: ['', [Validators.email, Validators.maxLength(EMAIL_MAX)]],
      direccion: ['', [Validators.maxLength(DIRECCION_MAX)]],
      observaciones: ['', [Validators.maxLength(OBSERVACIONES_MAX)]],
      fiscal: this.fb.group({
        datosFiscales: [false],
        rfc: ['', [Validators.minLength(12), Validators.maxLength(13), Validators.pattern(RFC_PATTERN)]],
        razonSocial: ['', [Validators.maxLength(RAZON_SOCIAL_MAX)]],
        regimenFiscal: ['', []],
        usoCFDI: ['', []],
        codigoPostal: ['', [Validators.pattern(CODIGO_POSTAL_PATTERN)]],
        direccionFiscal: ['', [Validators.maxLength(DIRECCION_MAX)]],
      }),
    });

    this.aplicarValidacionTipo(group);
    return group;
  }

  // Validación condicional según el tipo:
  //   - Persona: exige al menos un Teléfono O un Correo (validator cruzado
  //     a nivel FormGroup, regulado por RF-03).
  //   - Empresa: los medios de contacto se gestionan vía la lista de
  //     Contactos (al menos 1 obligatorio, validado en onSubmit), por lo
  //     que el FormGroup no aplica el validator Teléfono/Correo directo.
  //   - Ambos tipos: RFC obligatorio (12-13 caracteres) SÓLO cuando el
  //     switch "Datos Fiscales" está activado. Para empresa el switch es
  //     activable (ON/OFF); si se desactiva, los campos fiscales se
  //     ocultan y el RFC deja de ser obligatorio.
  private aplicarValidacionTipo(group: FormGroup): void {
    if (this.tipo() === 'persona') {
      group.setValidators([telefonoOcorreoRequired]);
    } else {
      group.setValidators([]);
    }
    this.actualizarValidacionFiscal(group);
    group.updateValueAndValidity();
  }

  // Ajusta los validadores del RFC en función del estado del switch
  // "Datos Fiscales". Se invoca al cambiar de tipo y cada vez que el switch
  // cambia de valor (valueChanges del control datosFiscales).
  private actualizarValidacionFiscal(group: FormGroup): void {
    const rfc = group.get(['fiscal', 'rfc']);
    const datosFiscalesOn = !!group.get(['fiscal', 'datosFiscales'])?.value;

    rfc?.clearValidators();
    if (datosFiscalesOn) {
      rfc?.addValidators([Validators.required, Validators.minLength(12), Validators.maxLength(13), Validators.pattern(RFC_PATTERN)]);
    } else {
      rfc?.addValidators([Validators.minLength(12), Validators.maxLength(13), Validators.pattern(RFC_PATTERN)]);
    }
    rfc?.updateValueAndValidity();
  }

  // Cambia el tipo de cliente (Persona | Empresa) y recalibra validaciones.
  setTipo(tipo: ClienteTipo): void {
    this.tipo.set(tipo);
    this.aplicarValidacionTipo(this.form);
  }

  // Reacción al switch "Datos Fiscales": recalibra la obligatoriedad del RFC
  // según el nuevo estado del switch. Lo enlaza el HTML vía (change).
  onDatosFiscalesToggle(): void {
    const group = this.form;
    const datosFiscales = group.get(['fiscal', 'datosFiscales'])?.value;
    // Si se apaga el switch, limpiar los campos fiscales para no enviar
    // datos parciales/huérfanos al backend (coherente con el guardado).
    if (!datosFiscales) {
      group.get(['fiscal', 'rfc'])?.setValue('');
      group.get(['fiscal', 'razonSocial'])?.setValue('');
      group.get(['fiscal', 'regimenFiscal'])?.setValue('');
      group.get(['fiscal', 'usoCFDI'])?.setValue('');
      group.get(['fiscal', 'codigoPostal'])?.setValue('');
      group.get(['fiscal', 'direccionFiscal'])?.setValue('');
    }
    this.actualizarValidacionFiscal(group);
  }

  // Al alternar el switch Datos Fiscales se actualizan los validators del RFC
  // (sin re-validar el estado completo del formulario).
  onDatosFiscalesChange(): void {
    this.actualizarValidacionRfc(this.form, this.tipo());
  }

  // Las personas solo requieren un teléfono o un correo; las empresas
  // requieren al menos un contacto registrado.
  get requiereContacto(): boolean {
    return this.tipo() === 'empresa';
  }

  // Validador cruzado `telefonoOcorreoRequired` (a nivel FormGroup):
  // solo aplica a Persona. Devuelve TRUE cuando ambos medios están vacíos.
  // NO depende de `touched`/`dirty`/`submitted`: el mensaje es visible
  // desde el primer render (formulario recién abierto con ambos vacíos) y
  // desaparece/reaparece de forma reactiva en cuanto cambia el contenido.
  get telefonoOcorreoInvalido(): boolean {
    if (this.tipo() !== 'persona') return false;
    return this.form.errors?.['telefonoOcorreo'] === true;
  }

  // Empresa sin contactos: bandera para mostrar la leyenda y bloquear el
  // guardado (coincide con la verificación de onSubmit).
  get faltaContactoEmpresa(): boolean {
    return this.tipo() === 'empresa' && this.contactos().length === 0;
  }

  // Catálogos del módulo Clientes ------------------------------------------

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

  seleccionarRegimen(opcion: OpcionCatalogo): void {
    this.form.get(['fiscal', 'regimenFiscal'])?.setValue(opcion.value);
    this.busquedaRegimen.set('');
    this.comboAbierto.set(null);
  }

  seleccionarUso(opcion: OpcionCatalogo): void {
    this.form.get(['fiscal', 'usoCFDI'])?.setValue(opcion.value);
    this.busquedaUso.set('');
    this.comboAbierto.set(null);
  }

  abrirCombo(clave: string): void {
    this.comboAbierto.set(clave);
  }

  cerrarCombo(): void {
    setTimeout(() => this.comboAbierto.set(null), 150);
  }

  labelCatalogo(valor: string, catalogo: OpcionCatalogo[]): string {
    return catalogo.find(o => o.value === valor)?.label ?? '';
  }

  onContactosChange(lista: Contacto[]): void {
    this.contactos.set(lista);
  }

  // ── Teléfono ─────────────────────────────────────────────────────────────
  // Filtra en vivo: solo "+", números y espacios (misma regla que Trabajadores).
  onTelefonoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = filtrarTelefonoInput(input.value);
    if (limpio !== input.value) {
      input.value = limpio;
      this.form.get('telefono')?.setValue(limpio);
    }
  }

  // ----------------------------------------------------------------------
  // Submit
  // ----------------------------------------------------------------------

  async onSubmit(): Promise<void> {
    if (this.form.invalid || (this.tipo() === 'empresa' && this.contactos().length === 0)) {
      this.form.markAllAsTouched();
      this.toast.warning(this.tipo() === 'empresa' && this.contactos().length === 0
        ? 'Es necesario mínimo 1 contacto'
        : 'Corrige los campos marcados antes de guardar.');
      return;
    }

    // Teléfono del cliente persona: mismo saneado/validación que Trabajadores.
    const raw = this.form.getRawValue();
    if (this.tipo() === 'persona' && raw.telefono && sanitizarTelefono(raw.telefono) === null) {
      this.toast.error('Teléfono inválido: usa "+52" y el número, máximo 14 caracteres incluyendo espacios');
      return;
    }

    // Teléfono de los contactos de una empresa: misma regla por contacto.
    if (this.tipo() === 'empresa') {
      const conTelefonoInvalido = this.contactos().some(
        c => (c.telefono ?? '').trim() !== '' && sanitizarTelefono(c.telefono ?? '') === null
      );
      if (conTelefonoInvalido) {
        this.toast.warning('Revisa el teléfono de los contactos: usa "+52" y el número, máximo 14 caracteres incluyendo espacios');
        return;
      }

      // Cada contacto con datos debe tener al menos teléfono o correo
      // (los contactos por registrar y que queden vacíos no se guardarán).
      const conSinMedio = this.contactos().some(c => {
        const tieneDatos =
          (c.nombreCompleto ?? '').trim() !== '' || (c.observaciones ?? '').trim() !== '';
        return tieneDatos && (c.telefono ?? '').trim() === '' && (c.correo ?? '').trim() === '';
      });
      if (conSinMedio) {
        this.toast.warning('Cada contacto debe tener al menos un teléfono o un correo.');
        return;
      }
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
    // Si el checkbox "Datos Fiscales" está desactivado se envían los campos
    // fiscales como nulos (el backend deriva TieneDatosFiscales de la RFC).
    let fiscal = raw.fiscal;
    if (!this.fiscalGroup.get('datosFiscales')?.value) {
      fiscal = {
        rfc: null, razonSocial: null, regimenFiscal: null,
        usoCFDI: null, codigoPostal: null, direccionFiscal: null,
      };
    }

    if (this.tipo() === 'persona') {
      // Persona: el backend crea/actualiza el contacto principal a partir de
      // Telefono/Correo. Por eso NO se envía `contactos` (enviar un array
      // vacío en edición eliminaría el contacto principal existente).
      const payload: Record<string, unknown> = {
        Nombre: raw.nombre,
        RazonSocial: fiscal.razonSocial || null,
        Observaciones: raw.observaciones || null,
        RFC: fiscal.rfc || null,
        idRegimenFiscal: fiscal.regimenFiscal ? Number(fiscal.regimenFiscal) : null,
        idUsoCFDI: fiscal.usoCFDI ? Number(fiscal.usoCFDI) : null,
        CodigoPostal: fiscal.codigoPostal || null,
        Direccion: raw.direccion || null,
        DireccionFiscal: fiscal.direccionFiscal || null,
        Telefono: raw.telefono ? sanitizarTelefono(raw.telefono) : null,
        Correo: raw.correo || null,
        tipo: 'persona',
      };

      if (this.clienteId) {
        await firstValueFrom(this.api.put('/Clientes/' + this.clienteId, payload));
      } else {
        await firstValueFrom(this.api.post('/Clientes', payload));
      }
      return;
    }

    const payload: Record<string, unknown> = {
      Nombre: raw.nombre,
      RazonSocial: fiscal.razonSocial || null,
      Observaciones: raw.observaciones || null,
      RFC: fiscal.rfc || null,
      idRegimenFiscal: fiscal.regimenFiscal ? Number(fiscal.regimenFiscal) : null,
      idUsoCFDI: fiscal.usoCFDI ? Number(fiscal.usoCFDI) : null,
      CodigoPostal: fiscal.codigoPostal || null,
      Direccion: raw.direccion || null,
      DireccionFiscal: fiscal.direccionFiscal || null,
      tipo: 'empresa',
    };

    // Se envían también los idContactoCliente para que el backend pueda
    // distinguir un contacto editado (UPDATE) de uno nuevo (INSERT), y así
    // el historial registra correctamente la operación. Las filas que quedaron
    // vacías (añadidas y sin datos) se descartan.
    const contactos = this.contactos()
      .filter(c => (c.nombreCompleto ?? '').trim() !== '' || (c.telefono ?? '').trim() !== '' || (c.correo ?? '').trim() !== '')
      .map(c => ({
      idContactoCliente: c.id ?? null,
      NombreCompleto: c.nombreCompleto,
      Telefono: c.telefono ? sanitizarTelefono(c.telefono) : null,
      Correo: c.correo || null,
      Observaciones: c.observaciones || null,
    }));

    payload['contactos'] = contactos;

    if (this.clienteId) {
      await firstValueFrom(this.api.put('/Clientes/' + this.clienteId, payload));
    } else {
      await firstValueFrom(this.api.post('/Clientes', payload));
    }
  }

  private async fetchCliente(id: number): Promise<ClienteForm> {
    const raw: any = await firstValueFrom(this.api.get('/Clientes/' + id));
    const tipoRaw = String(raw.TIPO ?? raw.Tipo ?? raw.tipo ?? 'empresa').toLowerCase();
    return {
      tipo: tipoRaw === 'persona' ? 'persona' : 'empresa',
      nombre: raw.NOMBRE ?? raw.Nombre ?? raw.nombre ?? '',
      direccion: raw.DIRECCION ?? raw.Direccion ?? raw.direccion ?? '',
      telefono: raw.TELEFONO ?? raw.Telefono ?? raw.telefono ?? '',
      correo: raw.CORREO ?? raw.Correo ?? raw.correo ?? '',
      observaciones: raw.OBSERVACIONES ?? raw.observaciones ?? '',
      rfc: raw.RFC ?? raw.rfc ?? '',
      razonSocial: raw.RAZONSOCIAL ?? raw.RazonSocial ?? raw.razonSocial ?? '',
      idRegimenFiscal: raw.IDREGIMENFISCAL ?? raw.idRegimenFiscal ?? null,
      idUsoCFDI: raw.IDUSOCFDI ?? raw.idUsoCFDI ?? null,
      regimenFiscal: raw.REGIMENFISCAL ?? raw.RegimenFiscal ?? raw.regimenFiscal ?? '',
      usoCFDI: raw.USOCFDI ?? raw.UsoCFDI ?? raw.usoCFDI ?? '',
      codigoPostal: raw.CODIGOPOSTAL ?? raw.codigoPostal ?? '',
      direccionFiscal: raw.DIRECCIONFISCAL ?? raw.DireccionFiscal ?? raw.direccionFiscal ?? '',
      contactos: Array.isArray(raw.contactos) ? raw.contactos.map((c: any) => ({
        id: c.IDCONTACTOCLIENTE ?? c.idContactoCliente ?? c.id,
        nombreCompleto: c.NOMBRECOMPLETO ?? c.NombreCompleto ?? c.nombreCompleto ?? '',
        telefono: c.TELEFONO ?? c.Telefono ?? c.telefono ?? '',
        correo: c.CORREO ?? c.Correo ?? c.correo ?? '',
        observaciones: c.OBSERVACIONES ?? c.observaciones ?? '',
      })) : [],
    };
  }

  private aplicarEdicion(data: ClienteForm): void {
    this.tipo.set(data.tipo);
    this.aplicarValidacionTipo(this.form);

    this.form.patchValue({
      nombre: data.nombre,
      telefono: data.telefono ?? '',
      correo: data.correo ?? '',
      direccion: data.direccion ?? '',
      observaciones: data.observaciones ?? '',
      fiscal: {
        datosFiscales: this.tipo() === 'empresa' ? true : datosFiscalesGuardados,
        rfc: data.rfc ?? '',
        razonSocial: data.razonSocial ?? '',
        regimenFiscal: data.idRegimenFiscal != null ? String(data.idRegimenFiscal) : '',
        usoCFDI: data.idUsoCFDI != null ? String(data.idUsoCFDI) : '',
        codigoPostal: data.codigoPostal ?? '',
        direccionFiscal: data.direccionFiscal ?? '',
      },
    });

    // Recalibra los validadores del RFC según el estado del switch tras
    // cargar los datos fiscales existentes (pueden venir activos).
    this.actualizarValidacionFiscal(this.form);

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
  razonSocial?: string;
  idRegimenFiscal?: number | null;
  idUsoCFDI?: number | null;
  regimenFiscal?: string;
  usoCFDI?: string;
  codigoPostal?: string;
  direccionFiscal?: string;
  contactos?: Contacto[];
}
