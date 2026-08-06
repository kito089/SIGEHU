import { Component, Input, OnInit, inject, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../../../services/api.service';
import { ComprasService } from '../../../../services/compras.service';
import { ProveedoresService } from '../../../../services/proveedores.service';
import { Compra, DetalleCompra, CompraPayload } from '../../../../core/models/compra.model';
import { ToastService } from '../../../../core/services/toast.service';
import { EntityFormComponent } from '../../../../shared/components/entity-form/entity-form.component';

/* =========================================================================
   SIGEHU — Nueva / Actualizar Orden de Compra.

   Formulario de Alta y Edición de la tabla `Compras`. Campos administrados
   automáticamente (idCompra, FechaCreacion, Recibida) se omiten.

   Incluye:
     - Buscador con ComboBox de Trabajador asignado (selección única; no se
       permite crear trabajadores desde aquí).
     - Mini CRUD de materiales de la compra (misma mecánica que Proveedores):
       selecciona únicamente materiales existentes por proveedor, permitiendo
       nombres repetidos cuando pertenecen a proveedores distintos.

   Persistencia:
     - Alta:   POST /Compras { idTrabajador, FechaCompra?, Notas?, detalles[] }
     - Edición: PUT /Compras/:id (backend reemplaza los detalles)
   ========================================================================= */

interface TrabajadorOpcion {
  idTrabajador: number;
  nombreCompleto: string;
  telefono: string;
}

interface MaterialProveedorItem {
  key: string;
  idProveedor: number;
  idMaterial: number;
  nombreMaterial: string;
  nombreProveedor: string;
  unidadMedida: string;
  precio: number | null;
}

interface DetalleRow {
  idProveedor: number;
  idMaterial: number;
  nombreMaterial: string;
  nombreProveedor: string;
  unidadMedida: string;
  cantidad: number;
  medida: string | null;
}

@Component({
  selector: 'app-compra-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EntityFormComponent],
  templateUrl: './compra-form.component.html',
  styleUrl: './compra-form.component.scss',
})
export class CompraFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private api = inject(ApiService);
  private service = inject(ComprasService);
  private proveedoresService = inject(ProveedoresService);
  private toast = inject(ToastService);

  @Input() compraId: number | null = null;

  form: FormGroup;

  // ── Buscador de trabajador (combobox de selección única) ────────────────
  @ViewChild('buscarTrabajadorWrap') buscarTrabajadorWrap?: ElementRef<HTMLElement>;
  trabajadores: TrabajadorOpcion[] = [];
  selectorTrabajadorAbierto = false;
  busquedaTrabajador = '';

  // ── Buscador de materiales (combobox de materiales por proveedor) ───────
  @ViewChild('buscarMaterialWrap') buscarMaterialWrap?: ElementRef<HTMLElement>;
  materialesCatalogo: MaterialProveedorItem[] = [];
  detallesSeleccionados: DetalleRow[] = [];
  selectorMaterialAbierto = false;
  busquedaMaterial = '';

  loading = false;
  guardando = false;

  constructor() {
    this.form = this.fb.group({
      idTrabajador: [null as number | null, [Validators.required]],
      fechaCompra: ['', [this.fechaNoAnteriorAHoyValidator]],
      notas: ['', [Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
    const qId = this.route.snapshot.queryParamMap.get('id');
    if (qId) {
      this.compraId = Number(qId) || null;
    }

    this.cargarTrabajadores();
    this.cargarCatalogoMateriales();

    if (this.compraId) {
      this.loading = true;
      this.cargarCompra(this.compraId).then(ok => {
        this.loading = false;
        if (!ok) {
          this.toast.error('No se pudo cargar la compra para edición.');
          this.router.navigate(['/admin/orden']);
        }
      });
    }
  }

  get esEdicion(): boolean {
    return this.compraId !== null;
  }

  // ── Datos iniciales ─────────────────────────────────────────────────────
  private async cargarTrabajadores(): Promise<void> {
    try {
      const rows: Record<string, unknown>[] = await firstValueFrom(this.api.get<Record<string, unknown>[]>('/Trabajadores?asignables=true'));
      this.trabajadores = (rows ?? []).map(row => ({
        idTrabajador: Number(row['IDTRABAJADOR'] ?? row['idTrabajador'] ?? 0),
        nombreCompleto: String(row['NOMBRECOMPLETO'] ?? row['nombreCompleto'] ?? ''),
        telefono: String(row['TELEFONO'] ?? row['telefono'] ?? ''),
      }));
    } catch {
      this.trabajadores = [];
    }
  }

  private async cargarCatalogoMateriales(): Promise<void> {
    try {
      const proveedores = await firstValueFrom(this.proveedoresService.listar());
      this.materialesCatalogo = [];
      for (const p of proveedores) {
        for (const m of p.materiales ?? []) {
          if (m.idMaterial == null) continue;
          this.materialesCatalogo.push({
            key: `${p.idProveedor}|${m.idMaterial}`,
            idProveedor: p.idProveedor as number,
            idMaterial: m.idMaterial,
            nombreMaterial: m.nombre,
            nombreProveedor: p.nombre,
            unidadMedida: m.unidadMedida ?? '',
            precio: m.precio ?? null,
          });
        }
      }
    } catch {
      this.materialesCatalogo = [];
    }
  }

  private async cargarCompra(id: number): Promise<boolean> {
    try {
      const compra: Compra = await firstValueFrom(this.service.obtener(id));

      const trabajador = this.trabajadores.find(t => t.idTrabajador === compra.trabajadoresIdTrabajador);
      this.form.patchValue({
        idTrabajador: compra.trabajadoresIdTrabajador,
        fechaCompra: this.toDateTimeLocal(compra.fechaCompra),
        notas: compra.notas ?? '',
      });
      if (trabajador) {
        this.busquedaTrabajador = trabajador.nombreCompleto;
      }

      this.detallesSeleccionados = (compra.detalles ?? []).map((d: DetalleCompra) => ({
        idProveedor: d.idProveedor,
        idMaterial: d.idMaterial,
        nombreMaterial: d.nombreMaterial,
        nombreProveedor: d.nombreProveedor,
        unidadMedida: d.unidadMedida ?? '',
        cantidad: d.cantidad,
        medida: d.medida ?? null,
      }));

      return true;
    } catch {
      return false;
    }
  }

  // ── Trabajador (combobox de selección única) ────────────────────────────
  get trabajadoresFiltrados(): TrabajadorOpcion[] {
    const term = this.busquedaTrabajador.trim().toLowerCase();
    if (!term) return this.trabajadores;
    return this.trabajadores.filter(t =>
      t.nombreCompleto.toLowerCase().includes(term) ||
      t.telefono.includes(term)
    );
  }

  get trabajadorSeleccionado(): TrabajadorOpcion | null {
    const id = this.form.get('idTrabajador')?.value;
    if (id == null) return null;
    return this.trabajadores.find(t => t.idTrabajador === id) ?? null;
  }

  onFocoTrabajador(): void {
    this.selectorTrabajadorAbierto = true;
  }

  cerrarSelectorTrabajador(): void {
    this.selectorTrabajadorAbierto = false;
  }

  onBusquedaTrabajador(event: Event): void {
    this.busquedaTrabajador = String((event.target as HTMLInputElement).value ?? '');
    this.form.get('idTrabajador')?.setValue(null);
    if (!this.selectorTrabajadorAbierto) {
      this.selectorTrabajadorAbierto = true;
    }
  }

  seleccionarTrabajador(trabajador: TrabajadorOpcion): void {
    this.form.get('idTrabajador')?.setValue(trabajador.idTrabajador);
    this.busquedaTrabajador = trabajador.nombreCompleto;
    this.cerrarSelectorTrabajador();
  }

  quitarTrabajador(): void {
    this.form.get('idTrabajador')?.setValue(null);
    this.busquedaTrabajador = '';
  }

  // ── Materiales (mini CRUD de la compra) ─────────────────────────────────
  get materialesFiltradosBuscador(): MaterialProveedorItem[] {
    const term = this.busquedaMaterial.trim().toLowerCase();
    if (!term) return this.materialesCatalogo;
    return this.materialesCatalogo.filter(m =>
      m.nombreMaterial.toLowerCase().includes(term) ||
      m.nombreProveedor.toLowerCase().includes(term)
    );
  }

  materialYaAgregado(item: MaterialProveedorItem): boolean {
    return this.detallesSeleccionados.some(d =>
      d.idProveedor === item.idProveedor && d.idMaterial === item.idMaterial
    );
  }

  onFocoMaterial(): void {
    this.selectorMaterialAbierto = true;
  }

  cerrarSelectorMaterial(): void {
    this.selectorMaterialAbierto = false;
    this.busquedaMaterial = '';
  }

  onBusquedaMaterial(event: Event): void {
    this.busquedaMaterial = String((event.target as HTMLInputElement).value ?? '');
    if (!this.selectorMaterialAbierto) {
      this.selectorMaterialAbierto = true;
    }
  }

  seleccionarMaterial(item: MaterialProveedorItem): void {
    if (this.materialYaAgregado(item)) {
      this.toast.warning('Este material ya está asociado a esta compra con el mismo proveedor.');
      return;
    }
    this.detallesSeleccionados.push({
      idProveedor: item.idProveedor,
      idMaterial: item.idMaterial,
      nombreMaterial: item.nombreMaterial,
      nombreProveedor: item.nombreProveedor,
      unidadMedida: item.unidadMedida,
      cantidad: 1,
      medida: null,
    });
    this.cerrarSelectorMaterial();
  }

  quitarMaterial(index: number): void {
    this.detallesSeleccionados.splice(index, 1);
  }

  onCantidadChange(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    const num = Number(value);
    if (value === '' || !Number.isFinite(num)) {
      this.detallesSeleccionados[index].cantidad = 0;
      return;
    }
    this.detallesSeleccionados[index].cantidad = Math.min(Math.max(num, 0), 99999999.99);
  }

  onMedidaChange(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.detallesSeleccionados[index].medida = value ? value : null;
  }

  // ── Cierre por clic fuera (comboboxes) ──────────────────────────────────
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (this.selectorTrabajadorAbierto && target) {
      if (!this.buscarTrabajadorWrap?.nativeElement.contains(target)) {
        this.cerrarSelectorTrabajador();
      }
    }
    if (this.selectorMaterialAbierto && target) {
      if (!this.buscarMaterialWrap?.nativeElement.contains(target)) {
        this.cerrarSelectorMaterial();
      }
    }
  }

  // ── Fecha ───────────────────────────────────────────────────────────────
  // La fecha de compra no puede ser anterior a hoy (RNF Compras).
  private fechaNoAnteriorAHoyValidator = (control: AbstractControl): ValidationErrors | null => {
    const valor = control.value as string;
    if (!valor) return null;

    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return null;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (d < hoy) {
      return { fechaAnterior: true };
    }
    return null;
  };

  // Valor mínimo para el input datetime-local: hoy a las 00:00.
  get minFecha(): string {
    const hoy = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${hoy.getFullYear()}-${pad(hoy.getMonth() + 1)}-${pad(hoy.getDate())}T00:00`;
  }

  toDateTimeLocal(valor?: string): string {
    if (!valor) return '';
    const d = new Date(valor);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  private toTimestamp(valor: string): string | null {
    if (!valor) return null;
    return `${valor.replace('T', ' ')}:00`;
  }

  // ── Precio (combobox de materiales) ─────────────────────────────────────
  formatoPrecio(precio: number | null | undefined): string {
    if (precio == null || Number.isNaN(precio)) return '';
    return `$${Number(precio).toFixed(2)}`;
  }

  // ── Persistencia ────────────────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      if (this.form.get('fechaCompra')?.hasError('fechaAnterior')) {
        this.toast.warning('La fecha de compra no puede ser anterior a hoy.');
        return;
      }
      this.toast.warning('Selecciona el trabajador asignado antes de guardar');
      return;
    }

    if (this.detallesSeleccionados.length === 0) {
      this.toast.warning('Agrega al menos un material a la compra.');
      return;
    }

    if (this.detallesSeleccionados.some(d => !d.cantidad || d.cantidad <= 0)) {
      this.toast.warning('Todos los materiales deben tener una cantidad mayor a cero.');
      return;
    }

    const raw = this.form.getRawValue();

    const payload: CompraPayload = {
      idTrabajador: Number(raw.idTrabajador),
      FechaCompra: this.toTimestamp(String(raw.fechaCompra ?? '')),
      Notas: raw.notas ? String(raw.notas).trim() : null,
      detalles: this.detallesSeleccionados.map(d => ({
        idProveedor: d.idProveedor,
        idMaterial: d.idMaterial,
        cantidad: d.cantidad,
        medida: d.medida,
      })),
    };

    this.guardando = true;
    try {
      if (this.compraId) {
        await firstValueFrom(this.service.actualizar(this.compraId, payload));
        this.toast.success('Compra actualizada correctamente');
      } else {
        await firstValueFrom(this.service.crear(payload));
        this.toast.success('Compra creada correctamente');
      }
      this.router.navigate(['/admin/orden']);
    } catch (err) {
      const mensajeBackend = (err as { error?: { error?: string } })?.error?.error;
      if (!mensajeBackend) {
        this.toast.error('Error de comunicación: no se pudo guardar la compra.');
      }
      console.error('[compra-form] Error al guardar:', err);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/orden']);
  }
}
