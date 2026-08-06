import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../services/api.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EntityFormComponent } from '../../../../shared/components/entity-form/entity-form.component';

/* =========================================================================
   SIGEHU — Agregar / Editar Cliente (componente Angular standalone)

   Sirve tanto para alta como para edición: si recibe [clienteId] (por
   @Input o por queryParam `id`) carga los datos existentes y cambia el
   título/botón a modo edición.

   Conexión al backend:
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
  imports: [CommonModule, ReactiveFormsModule, EntityFormComponent],
  templateUrl: './cliente-form.component.html',
  styleUrls: ['./cliente-form.component.css'],
})
export class ClienteFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  // Si viene con id (por @Input o por queryParam), es edición.
  @Input() clienteId: number | null = null;

  form: FormGroup;
  loading = false;
  guardando = false;

  regimenesFiscales: OpcionCatalogo[] = [];
  usosCfdi: OpcionCatalogo[] = [];

  constructor() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10,15}$/)]],
      correo: ['', [Validators.required, Validators.email]],
      direccion: ['', [Validators.required]],
      observaciones: [''],

      requiereFactura: [false],
      datosFiscales: [false],

      fiscal: this.fb.group({
        rfc: [{ value: '', disabled: true }],
        razonSocialFiscal: [{ value: '', disabled: true }],
        regimenFiscal: [{ value: '', disabled: true }],
        usoCfdi: [{ value: '', disabled: true }],
        codigoPostalFiscal: [{ value: '', disabled: true }],
        direccionFiscal: [{ value: '', disabled: true }],
      }),

      contactos: this.fb.array([]),
    });
  }

  ngOnInit(): void {
    const qId = this.route.snapshot.queryParamMap.get('id');
    if (qId) {
      this.clienteId = Number(qId) || null;
    }

    this.cargarCatalogos();
    // En alta se parte con un contacto vacío para capturar; en edición el
    // contacto principal se gestiona con los campos superiores (tel/correo)
    // y el backend solo actualiza esos datos (PUT /Clientes/:id).
    if (!this.clienteId) {
      this.agregarContacto();
    }

    if (this.clienteId) {
      this.loading = true;
      this.fetchCliente(this.clienteId).then(cliente => {
        this.form.patchValue(cliente);
        if (cliente.datosFiscales) this.onToggleDatosFiscales(true);
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

  get contactos(): FormArray {
    return this.form.get('contactos') as FormArray;
  }

  get fiscalGroup(): FormGroup {
    return this.form.get('fiscal') as FormGroup;
  }

  private async cargarCatalogos(): Promise<void> {
    try {
      const res = await Promise.all([
        firstValueFrom(this.api.get('/Clientes/RegimenesFiscales')),
        firstValueFrom(this.api.get('/Clientes/UsosCFDI')),
      ]);
      const regs: any[] = res[0] as any[] ?? [];
      const usos: any[] = res[1] as any[] ?? [];
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

  agregarContacto(nombre = '', telefono = ''): void {
    this.contactos.push(
      this.fb.group({
        nombre: [nombre, Validators.required],
        telefono: [telefono, [Validators.required, Validators.pattern(/^\d{10,15}$/)]],
      }),
    );
  }

  eliminarContacto(index: number): void {
    this.contactos.removeAt(index);
  }

  onToggleDatosFiscales(activo: boolean): void {
    this.form.get('datosFiscales')?.setValue(activo);

    const requiredIfActivo = activo ? [Validators.required] : [];

    Object.keys(this.fiscalGroup.controls).forEach(key => {
      const control = this.fiscalGroup.get(key)!;
      if (activo) {
        control.enable();
        control.setValidators(key === 'rfc' || key === 'regimenFiscal' || key === 'usoCfdi' ? requiredIfActivo : []);
      } else {
        control.disable();
        control.clearValidators();
      }
      control.updateValueAndValidity();
    });
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Corrige los campos marcados antes de guardar');
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

  // ---------------------------------------------------------------------
  // Persistencia — llamadas reales al backend.
  // ---------------------------------------------------------------------

  private async guardar(): Promise<void> {
    const raw = this.form.getRawValue();
    const datosFiscalesActivos = !!raw.datosFiscales;
    const contactos = raw.contactos
      .filter((c: any) => c.nombre && c.telefono)
      .map((c: any) => ({
        NombreCompleto: c.nombre,
        Telefono: String(c.telefono).replace(/\D/g, ''),
      }));

    const payload: Record<string, unknown> = {
      Nombre: raw.nombre,
      Direccion: raw.direccion || null,
      Telefono: String(raw.telefono || '').replace(/\D/g, ''),
      Correo: raw.correo || null,
      Observaciones: raw.observaciones || null,
      RFC: datosFiscalesActivos ? (raw.fiscal.rfc || null) : null,
      idRegimenFiscal: datosFiscalesActivos && raw.fiscal.regimenFiscal ? Number(raw.fiscal.regimenFiscal) : null,
      idUsoCFDI: datosFiscalesActivos && raw.fiscal.usoCfdi ? Number(raw.fiscal.usoCfdi) : null,
      CodigoPostal: datosFiscalesActivos ? (raw.fiscal.codigoPostalFiscal || null) : null,
    };

    if (this.clienteId) {
      await firstValueFrom(this.api.put('/Clientes/' + this.clienteId, payload));
    } else {
      // El principal se envía como primer contacto; el resto se agrega al array.
      payload['contactos'] = [
        { NombreCompleto: raw.nombre, Telefono: payload['Telefono'], Correo: payload['Correo'] },
        ...contactos,
      ];
      await firstValueFrom(this.api.post('/Clientes', payload));
    }
  }

  private async fetchCliente(id: number): Promise<any> {
    const raw: any = await firstValueFrom(this.api.get('/Clientes/' + id));
    const tieneFiscales = !!(raw.RFC ?? raw.rfc);

    return {
      nombre: raw.NOMBRE ?? raw.nombre ?? '',
      telefono: raw.TELEFONO ?? raw.telefono ?? '',
      correo: raw.CORREO ?? raw.correo ?? '',
      direccion: raw.DIRECCION ?? raw.direccion ?? '',
      observaciones: raw.OBSERVACIONES ?? raw.observaciones ?? '',
      requiereFactura: tieneFiscales,
      datosFiscales: tieneFiscales,
      fiscal: {
        rfc: raw.RFC ?? raw.rfc ?? '',
        razonSocialFiscal: raw.NOMBRE ?? raw.nombre ?? '',
        regimenFiscal: raw.IDREGIMENFISCAL != null ? String(raw.IDREGIMENFISCAL) : '',
        usoCfdi: raw.IDUSOCFDI != null ? String(raw.IDUSOCFDI) : '',
        codigoPostalFiscal: raw.CODIGOPOSTAL ?? raw.codigoPostal ?? '',
        direccionFiscal: raw.DIRECCION ?? raw.direccion ?? '',
      },
    };
  }
}
