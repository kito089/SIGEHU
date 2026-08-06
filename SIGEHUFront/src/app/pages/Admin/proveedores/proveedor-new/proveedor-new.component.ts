import { Component, Input, OnInit, inject, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ProveedoresService, ProveedorPayload } from '../../../../services/proveedores.service';
import { MaterialesService } from '../../../../services/materiales.service';
import { Material } from '../../../../core/models/material.model';
import { Proveedor, ProveedorMaterial } from '../../../../core/models/proveedor.model';
import { ToastService } from '../../../../core/services/toast.service';
import { EntityFormComponent } from '../../../../shared/components/entity-form/entity-form.component';
<<<<<<< HEAD
import {
  TELEFONO_REACTIVO_PATTERN,
  TELEFONO_ERROR_ENVIO,
  filtrarTelefonoInput,
  sanitizarTelefono,
} from '../../../../core/utils/telefono.util';
=======
import { noWhitespaceValidator } from '../../../../core/validators/no-whitespace.validator';
>>>>>>> e7bac74 (cambos)

/* =========================================================================
   SIGEHU — Nuevo / Actualizar Proveedor.

   Incluye:
     - Datos del proveedor (campos reales del backend: Nombre*, Direccion,
       Telefono, Correo, GiroPrincipal, ContactoCompras, Notas).
     - Selector de materiales (mismo comportamiento que el módulo Kits):
       buscador permanente + "+ Agregar nuevo material" + indicador de
       "Agregado" + cierre por clic fuera / Escape.
     - CRUD embebido para crear un Material sin abandonar el formulario.
     - Edición por material de Precio unitario y Notas (columnas reales del
       pivote Proveedores_has_Materiales: PrecioUnitario, Notas).

   Persistencia:
     - Alta:  POST /Proveedores { Nombre, ...opcionales, materiales[] }
     - Edición: PUT /Proveedores/:id (backend REEMPLAZA el conjunto; se envía
       el arreglo completo).
   ========================================================================= */

@Component({
  selector: 'app-proveedor-new',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EntityFormComponent],
  templateUrl: './proveedor-new.component.html',
  styleUrl: './proveedor-new.component.scss',
})
export class ProveedorNewComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private service = inject(ProveedoresService);
  private materialesService = inject(MaterialesService);
  private toast = inject(ToastService);

  @Input() proveedorId: number | null = null;

  form: FormGroup;

  // Referencia al wrapper del buscador para detectar clics fuera (combobox).
  @ViewChild('buscarWrap') buscarWrap?: ElementRef<HTMLElement>;

  // Selección y búsqueda de materiales del proveedor.
  materialesSeleccionados: ProveedorMaterial[] = [];
  materialesDisponibles: Material[] = [];
  selectorAbierto = false;
  busquedaMaterial = '';

  // CRUD embebido para crear un material sin abandonar el proveedor.
  nuevoMaterialAbierto = false;
  nuevoMaterialForm: FormGroup;
  guardandoMaterial = false;

  loading = false;
  guardando = false;

  constructor() {
    this.form = this.fb.group({
<<<<<<< HEAD
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      giroPrincipal: ['', [Validators.maxLength(100)]],
      contactoCompras: ['', [Validators.maxLength(150)]],
      telefono: ['', [Validators.pattern(TELEFONO_REACTIVO_PATTERN)]],
      correo: ['', [Validators.email, Validators.maxLength(254)]],
      direccion: [''],
      notas: [''],
=======
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100), noWhitespaceValidator()]],
      giroPrincipal: ['', [Validators.maxLength(100)]],
      contactoCompras: ['', [Validators.maxLength(150)]],
      telefono: ['', [Validators.pattern(/^[0-9()\s\-+]{7,15}$/)]],
      correo: ['', [Validators.email, Validators.maxLength(254)]],
      direccion: ['', [Validators.maxLength(250)]],
      notas: ['', [Validators.maxLength(500)]],
>>>>>>> e7bac74 (cambos)
    });

    this.nuevoMaterialForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150), noWhitespaceValidator()]],
      unidadMedida: ['', [Validators.required, Validators.maxLength(20), noWhitespaceValidator()]],
      descripcion: ['', [Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
    const qId = this.route.snapshot.queryParamMap.get('id');
    if (qId) {
      this.proveedorId = Number(qId) || null;
    }

    this.cargarMaterialesDisponibles();

    if (this.proveedorId) {
      this.loading = true;
      this.cargarProveedor(this.proveedorId).then(ok => {
        this.loading = false;
        if (!ok) {
          this.toast.error('No se pudo cargar el proveedor para edición.');
          this.router.navigate(['/admin/proveedores']);
        }
      });
    }
  }

  get esEdicion(): boolean {
    return this.proveedorId !== null;
  }

  // Controles tipados del CRUD embebido (evita AbstractControl | null en el template).
  get matNombreControl(): FormControl {
    return this.nuevoMaterialForm.get('nombre') as FormControl;
  }

  get matUnidadControl(): FormControl {
    return this.nuevoMaterialForm.get('unidadMedida') as FormControl;
  }

  get matDescripcionControl(): FormControl {
    return this.nuevoMaterialForm.get('descripcion') as FormControl;
  }

  async cargarMaterialesDisponibles(): Promise<void> {
    try {
      this.materialesDisponibles = await firstValueFrom(this.materialesService.listar());
    } catch {
      this.materialesDisponibles = [];
    }
  }

  private async cargarProveedor(id: number): Promise<boolean> {
    try {
      const proveedor: Proveedor | undefined = await firstValueFrom(this.service.obtener(id));
      if (!proveedor) return false;

      this.form.patchValue({
        nombre: proveedor.nombre ?? '',
        direccion: proveedor.direccion ?? '',
        telefono: proveedor.telefono ?? '',
        correo: proveedor.correo ?? '',
        giroPrincipal: proveedor.giroPrincipal ?? '',
        contactoCompras: proveedor.contactoCompras ?? '',
        notas: proveedor.notas ?? '',
      });

      this.materialesSeleccionados = (proveedor.materiales ?? []).map(m => ({
        idMaterial: m.idMaterial,
        nombre: m.nombre,
        unidadMedida: m.unidadMedida ?? '',
        descripcion: m.descripcion ?? null,
        precio: m.precio ?? null,
        notasProveedor: m.notasProveedor ?? null,
      }));
      return true;
    } catch {
      return false;
    }
  }

  // ── Selector de materiales ──────────────────────────────────────────────
  get materialesFiltradosBuscador(): Material[] {
    const term = this.busquedaMaterial.trim().toLowerCase();
    if (!term) return this.materialesDisponibles;
    return this.materialesDisponibles.filter(m =>
      m.nombre.toLowerCase().includes(term) ||
      (m.unidadMedida ?? '').toLowerCase().includes(term)
    );
  }

  yaEstaEnProveedor(idMaterial?: number): boolean {
    if (idMaterial == null) return false;
    return this.materialesSeleccionados.some(m => m.idMaterial === idMaterial);
  }

  onFocoBuscador(): void {
    this.nuevoMaterialAbierto = false;
    this.selectorAbierto = true;
  }

  cerrarSelector(): void {
    this.selectorAbierto = false;
    this.busquedaMaterial = '';
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.selectorAbierto) return;
    const target = event.target as HTMLElement | null;
    if (target && this.buscarWrap?.nativeElement.contains(target)) return;
    this.cerrarSelector();
  }

  onBusquedaMaterial(event: Event): void {
    this.busquedaMaterial = String((event.target as HTMLInputElement).value ?? '');
    if (!this.selectorAbierto) {
      this.selectorAbierto = true;
    }
  }

  seleccionarMaterial(material: Material): void {
    if (this.yaSeleccionado(material.idMaterial)) {
      this.toast.warning('Este material ya está asociado a este proveedor.');
      return;
    }
    this.materialesSeleccionados.push({
      idMaterial: material.idMaterial,
      nombre: material.nombre,
      unidadMedida: material.unidadMedida ?? '',
      descripcion: material.descripcion ?? null,
      precio: null,
      notasProveedor: null,
    });
    this.cerrarSelector();
  }

  private yaSeleccionado(idMaterial?: number): boolean {
    return idMaterial != null && this.materialesSeleccionados.some(m => m.idMaterial === idMaterial);
  }

  quitarMaterial(index: number): void {
    this.materialesSeleccionados.splice(index, 1);
  }

  onPrecioChange(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    if (value === '') {
      this.materialesSeleccionados[index].precio = null;
      return;
    }
    const num = Number(value);
    if (!Number.isFinite(num)) return;
    // Columna DECIMAL(10,2): rango [0 .. 99999999.99].
    this.materialesSeleccionados[index].precio = Math.min(Math.max(num, 0), 99999999.99);
  }

  // ── Teléfono (igual que Trabajadores) ───────────────────────────────────
  // Filtra en vivo: solo "+", números y espacios.
  onTelefonoInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const limpio = filtrarTelefonoInput(input.value);
    if (limpio !== input.value) {
      input.value = limpio;
      this.form.get('telefono')?.setValue(limpio);
    }
  }

  onNotasChange(index: number, event: Event): void {
    this.materialesSeleccionados[index].notasProveedor = (event.target as HTMLInputElement).value;
  }

  // ── CRUD embebido: crear material ───────────────────────────────────────
  abrirNuevoMaterial(): void {
    this.cerrarSelector();
    this.nuevoMaterialForm.reset({
      nombre: '',
      unidadMedida: '',
      descripcion: '',
    });
    this.nuevoMaterialAbierto = true;
  }

  cerrarNuevoMaterial(): void {
    this.nuevoMaterialAbierto = false;
    this.guardandoMaterial = false;
  }

  async guardarNuevoMaterial(): Promise<void> {
    if (this.nuevoMaterialForm.invalid) {
      this.nuevoMaterialForm.markAllAsTouched();
      this.toast.warning('Corrige los campos marcados antes de guardar');
      return;
    }

    const raw = this.nuevoMaterialForm.getRawValue();
    const nombre = String(raw.nombre ?? '').trim();

    // ids presentes antes del alta, para detectar el material recién creado.
    const idsPrevios = new Set(this.materialesDisponibles.map(m => m.idMaterial));

    this.guardandoMaterial = true;
    try {
      await firstValueFrom(this.materialesService.crear({
        nombre,
        unidadMedida: String(raw.unidadMedida ?? '').trim(),
        descripcion: raw.descripcion ? String(raw.descripcion).trim() : null,
      }));

      // Refrescar la lista (el POST no devuelve el id) y localizar el nuevo.
      await this.cargarMaterialesDisponibles();
      const nuevoO = this.materialesDisponibles.find(m =>
        !idsPrevios.has(m.idMaterial) && m.nombre === nombre
      ) ?? this.materialesDisponibles.find(m => m.nombre === nombre);

      if (nuevoO) {
        this.materialesSeleccionados.push({
          idMaterial: nuevoO.idMaterial,
          nombre: nuevoO.nombre,
          unidadMedida: nuevoO.unidadMedida ?? '',
          descripcion: nuevoO.descripcion ?? null,
          precio: null,
          notasProveedor: null,
        });
      }

      this.toast.success('Material creado y asociado al proveedor');
      this.cerrarNuevoMaterial();
    } catch (err) {
      const mensajeBackend = (err as { error?: { error?: string } })?.error?.error;
      if (!mensajeBackend) {
        this.toast.error('Error de comunicación: no se pudo crear el material.');
      }
    } finally {
      this.guardandoMaterial = false;
    }
  }

  // ── Persistencia del proveedor ─────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Corrige los campos marcados antes de guardar');
      return;
    }

    const raw = this.form.getRawValue();
    const telefono = sanitizarTelefono(raw.telefono || '');
    if (telefono === null && raw.telefono) {
      this.toast.error(TELEFONO_ERROR_ENVIO);
      return;
    }

    const payload: ProveedorPayloadForm = {
      nombre: String(raw.nombre ?? '').trim(),
      direccion: raw.direccion ? String(raw.direccion).trim() : null,
      telefono,
      correo: raw.correo ? String(raw.correo).trim() : null,
      giroPrincipal: raw.giroPrincipal ? String(raw.giroPrincipal).trim() : null,
      contactoCompras: raw.contactoCompras ? String(raw.contactoCompras).trim() : null,
      notas: raw.notas ? String(raw.notas).trim() : null,
      materiales: this.materialesSeleccionados.map(m => ({
        idMaterial: m.idMaterial as number,
        precio: m.precio == null ? null
          : Math.min(Math.max(m.precio, 0), 99999999.99),
        notas: m.notasProveedor ?? null,
      })),
    };

    this.guardando = true;
    try {
      if (this.proveedorId) {
        await firstValueFrom(this.service.actualizar(this.proveedorId, payload));
        this.toast.success('Proveedor actualizado correctamente');
      } else {
        await firstValueFrom(this.service.crear(payload));
        this.toast.success('Proveedor creado correctamente');
      }
      this.router.navigate(['/admin/proveedores']);
    } catch (err) {
      const mensajeBackend = (err as { error?: { error?: string } })?.error?.error;
      if (!mensajeBackend) {
        this.toast.error('Error de comunicación: no se pudo guardar el proveedor.');
      }
      console.error('[proveedor-new] Error al guardar:', err);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/proveedores']);
  }
}

type ProveedorPayloadForm = {
  nombre: string;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  giroPrincipal?: string | null;
  contactoCompras?: string | null;
  notas?: string | null;
  materiales: { idMaterial: number; precio: number | null; notas: string | null }[];
};