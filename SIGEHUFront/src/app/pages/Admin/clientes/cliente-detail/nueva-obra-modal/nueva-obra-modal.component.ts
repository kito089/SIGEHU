import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../../services/api.service';
import { ToastService } from '../../../../../core/services/toast.service';

/* =========================================================================
   SIGEHU — Nueva Obra (modal desde el detalle de Cliente)

   Permite registrar una obra desde la pestaña "Trabajos y Obras" del
   detalle de cliente. El combobox de clientes se llena únicamente con los
   clientes existentes en la BD (GET /Clientes), por lo que no es posible
   asociar la obra a un cliente inexistente. El "tipo de trabajo" lista los
   trabajos del cliente seleccionado (tabla TRABAJO) o "Obra independiente".

   Emite `creada` tras persistir (POST /Obras) para que el detalle recargue
   el árbol, y `cancelar` al cerrar.
   ========================================================================= */

interface OpcionCliente {
  idCliente: number;
  nombre: string;
}

interface OpcionTrabajo {
  idTrabajo: number;
  nombre: string;
}

@Component({
  selector: 'app-nueva-obra-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './nueva-obra-modal.component.html',
  styleUrls: ['./nueva-obra-modal.component.scss'],
})
export class NuevaObraModalComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private toast = inject(ToastService);

  @Input() idClienteInicial: number | null = null;

  @Output() creada = new EventEmitter<void>();
  @Output() cancelar = new EventEmitter<void>();

  form: FormGroup;
  cargando = false;
  guardando = false;

  clientes: OpcionCliente[] = [];
  trabajos: OpcionTrabajo[] = [];

  constructor() {
    this.form = this.fb.group({
      idCliente: [null, [Validators.required]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      idTrabajo: [null],
      fechaInicio: ['', [Validators.required]],
      direccion: [''],
    });
  }

  async ngOnInit(): Promise<void> {
    this.cargando = true;
    try {
      await this.cargarClientes();
      if (this.idClienteInicial != null) {
        this.form.patchValue({ idCliente: this.idClienteInicial });
        await this.cargarTrabajos(this.idClienteInicial);
      }
    } finally {
      this.cargando = false;
    }
  }

  private async cargarClientes(): Promise<void> {
    try {
      const rows: any[] = await firstValueFrom(this.api.get<any[]>('/Clientes'));
      this.clientes = (rows || [])
        .filter((r) => r.ACTIVO ?? r.Activo ?? r.activo ?? true)
        .map((r) => ({
          idCliente: Number(r.IDCLIENTE ?? r.idCliente ?? r.id),
          nombre: String(r.NOMBRE ?? r.Nombre ?? r.nombre ?? ''),
        }))
        .filter((c) => c.idCliente && c.nombre);
    } catch {
      this.clientes = [];
    }
  }

  private async cargarTrabajos(idCliente: number): Promise<void> {
    try {
      const raw: any = await firstValueFrom(this.api.get<any>('/Clientes/' + idCliente + '/trabajos'));
      const lista = Array.isArray(raw?.trabajos) ? raw.trabajos : [];
      this.trabajos = lista.map((t: any) => ({
        idTrabajo: Number(t.IDTRABAJO ?? t.idTrabajo),
        nombre: String(t.NOMBRE ?? t.Nombre ?? t.nombre ?? ''),
      }));
    } catch {
      this.trabajos = [];
    }
  }

  async onClienteCambio(): Promise<void> {
    const id = this.form.get('idCliente')?.value;
    this.form.patchValue({ idTrabajo: null });
    if (id != null) {
      await this.cargarTrabajos(Number(id));
    } else {
      this.trabajos = [];
    }
  }

  async onGuardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    const raw = this.form.getRawValue();

    try {
      await firstValueFrom(this.api.post<any>('/Obras', {
        idCliente: raw.idCliente,
        Nombre: raw.nombre.trim(),
        Direccion: raw.direccion?.trim() || null,
        idTrabajo: raw.idTrabajo ?? null,
        FechaInicio: raw.fechaInicio || null,
      }));
      this.toast.success('Obra creada correctamente');
      this.creada.emit();
    } catch {
      // El interceptor de errores ya notifica el fallo vía toast.
    } finally {
      this.guardando = false;
    }
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}