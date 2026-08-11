import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../../services/api.service';
import { AuthService } from '../../../../../services/auth.service';
import { ToastService } from '../../../../../core/services/toast.service';
import { NuevaObraModalComponent } from '../nueva-obra-modal/nueva-obra-modal.component';

/* =========================================================================
   SIGEHU — Nuevo Trabajo → Agregar Obra (flujo transaccional)

   Unicode del checklist "Trabajos/Obras":
     - Modal Nuevo Trabajo: cliente (automático), nombre, descripción, dirección.
     - Al pulsar "Siguiente" se abre un modal para Agregar la obra del trabajo:
       la dirección del trabajo se precarga, la descripción puede modificarse.
     - Un trabajo requiere mínimo una obra: si la obra no se inserta (cancelada
       o fallida), el trabajo tampoco se crea.
     - Si se cancela la creación de la obra, se muestra: "Se canceló la creación
       de la Obra y el Trabajo."
   ========================================================================= */

@Component({
  selector: 'app-nuevo-trabajo-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NuevaObraModalComponent],
  templateUrl: './nuevo-trabajo-modal.component.html',
  styleUrls: ['./nuevo-trabajo-modal.component.scss'],
})
export class NuevoTrabajoModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  @Input() idClienteInicial: number | null = null;

  @Output() creado = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  form: FormGroup;
  cargando = false;
  guardando = false;

  // Direcciones del cliente para el combobox de dirección del trabajo.
  direccionesCliente: { label: string; valor: string }[] = [];
  usarOtraDireccion = false;

  // Paso 2: crear la primera obra del trabajo.
  pasoAgregarObra = false;

  // Dirección del trabajo a precargar en el modal de obra (paso 2).
  direccionPrecargada(): string | null {
    return this.datosTrabajo?.direccion ?? null;
  }

  // Datos del trabajo pendiente (ya validados) que se crearán junto con la obra.
  private datosTrabajo: { idCliente: number; nombre: string; descripcion: string; direccion: string } | null = null;

  // idTrabajo temporal tras crear el trabajo + obra (para encadenar notas/fotos).
  private idTrabajoCreado: number | null = null;

  constructor() {
    this.form = this.fb.group({
      idCliente: [null, [Validators.required]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      descripcion: [''],
      direccion: [''],
    });
  }

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    try {
      if (this.idClienteInicial != null) {
        this.form.patchValue({ idCliente: this.idClienteInicial });
        await this.cargarDirecciones(this.idClienteInicial);
      }
    } finally {
      this.cargando = false;
    }
  }

  private async cargarDirecciones(idCliente: number): Promise<void> {
    try {
      const raw: any = await firstValueFrom(this.api.get<any>('/Clientes/' + idCliente));
      const direccion = String(raw.DIRECCION ?? raw.Direccion ?? raw.direccion ?? '').trim();
      const direccionFiscal = String(raw.DIRECCIONFISCAL ?? raw.DireccionFiscal ?? raw.direccionFiscal ?? '').trim();
      const opciones: { label: string; valor: string }[] = [];
      if (direccion) opciones.push({ label: 'Dirección del cliente: ' + direccion, valor: direccion });
      if (direccionFiscal && direccionFiscal !== direccion) {
        opciones.push({ label: 'Dirección fiscal: ' + direccionFiscal, valor: direccionFiscal });
      }
      this.direccionesCliente = opciones;
    } catch {
      this.direccionesCliente = [];
    }
  }

  onDireccionSelect(valor: string): void {
    if (valor === '__otra__') {
      this.usarOtraDireccion = true;
      this.form.patchValue({ direccion: '' });
    } else {
      this.usarOtraDireccion = false;
      this.form.patchValue({ direccion: valor });
    }
  }

  // "Siguiente" → valida el trabajo y abre el modal de Agregar Obra.
  onSiguiente(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.datosTrabajo = {
      idCliente: raw.idCliente,
      nombre: raw.nombre.trim(),
      descripcion: raw.descripcion?.trim() ?? '',
      direccion: raw.direccion?.trim() ?? '',
    };
    if (!this.datosTrabajo.direccion) {
      this.toast.warning('Indica la dirección del trabajo.');
      return;
    }
    this.pasoAgregarObra = true;
  }

  // El modal de obra emite `creada`: ahora sí se crea el trabajo de forma
  // atómica con su obra (el trabajo se inserta y la obra ya existe).
  async onObraCreada(idObra: number): Promise<void> {
    if (!this.datosTrabajo) return;
    this.guardando = true;
    try {
      const res: any = await firstValueFrom(this.api.post<any>('/Obras/trabajos', {
        idCliente: this.datosTrabajo.idCliente,
        Nombre: this.datosTrabajo.nombre,
        Descripcion: this.datosTrabajo.descripcion || null,
        Direccion: this.datosTrabajo.direccion || null,
      }));
      this.idTrabajoCreado = Number(res?.idTrabajo ?? 0);
      if (!this.idTrabajoCreado) {
        throw new Error('El backend no devolvió el id del trabajo');
      }

      // Vincular la obra ya creada al trabajo.
      await firstValueFrom(this.api.post<any>(`/Obras/trabajos/${this.idTrabajoCreado}/obras`, {
        idsObras: [Number(idObra)],
      }));

      this.toast.success('Trabajo y obra creados correctamente');
      this.creado.emit();
    } catch {
      this.toast.error('No se pudo completar la creación del Trabajo y la Obra.');
    } finally {
      this.guardando = false;
      this.pasoAgregarObra = false;
      this.datosTrabajo = null;
    }
  }

  // Cancelación del modal "Agregar Obra" → aviso de cancelación conjunta.
  onObraCancelada(): void {
    this.pasoAgregarObra = false;
    this.datosTrabajo = null;
    this.toast.info('Se canceló la creación de la Obra y el Trabajo.');
  }

  regresarTrabajo(): void {
    this.pasoAgregarObra = false;
    this.datosTrabajo = null;
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}