import { Component, Input, OnInit, inject, ElementRef, HostListener, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { KitsService } from '../../../../services/kits.service';
import { MaterialesService } from '../../../../services/materiales.service';
import { Material } from '../../../../core/models/material.model';
import { KitMaterial, KitInstalacion } from '../../../../core/models/kit.model';
import { ToastService } from '../../../../core/services/toast.service';
import { EntityFormComponent } from '../../../../shared/components/entity-form/entity-form.component';

/* =========================================================================
   SIGEHU — Nuevo / Actualizar Kit de Instalación (RF-22).

   Incluye:
     - Datos del Kit: Nombre* y Descripción (campos reales del backend).
     - Selector de materiales: despliega todos los materiales activos
       (GET /Materiales) + opción final "+ Agregar nuevo material".
     - CRUD embebido para crear un Material sin abandonar el formulario
       (misma estructura/validación que el módulo Materiales).
     - Edición inmediata de cantidad y notas de cada material en memoria;
       al guardar se persiste todo el conjunto del kit.

   Persistencia:
     - Alta:   POST /Kits   { Nombre, Descripcion, materiales[] }
     - Edición: PUT /Kits/:id (el backend REEMPLAZA el conjunto; se envía
       el arreglo completo).

   Esta en memoria (cantidad/notas) se persiste al enviar el kit completo,
   acorde al contrato del backend que reemplaza Kits_has_Materiales.
   ========================================================================= */

@Component({
  selector: 'app-kit-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EntityFormComponent],
  templateUrl: './kit-form.component.html',
  styleUrl: './kit-form.component.scss',
})
export class KitFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private kitsService = inject(KitsService);
  private materialesService = inject(MaterialesService);
  private toast = inject(ToastService);

  @Input() kitId: number | null = null;

  form: FormGroup;

  // Referencia al wrapper del buscador para detectar clics fuera (combobox).
  @ViewChild('buscarWrap') buscarWrap?: ElementRef<HTMLElement>;

  // Selección y búsqueda de materiales del kit.
  materialesSeleccionados: KitMaterial[] = [];
  materialesDisponibles: Material[] = [];
  selectorAbierto = false;
  busquedaMaterial = '';

  // CRUD embebido para crear un material sin abandonar el kit.
  nuevoMaterialAbierto = false;
  nuevoMaterialForm: FormGroup;
  guardandoMaterial = false;

  loading = false;
  guardando = false;

  constructor() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: [''],
    });

    this.nuevoMaterialForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2)]],
      unidadMedida: ['', [Validators.required, Validators.maxLength(20)]],
      descripcion: [''],
    });
  }

  ngOnInit(): void {
    const qId = this.route.snapshot.queryParamMap.get('id');
    if (qId) {
      this.kitId = Number(qId) || null;
    }

    this.cargarMaterialesDisponibles();

    if (this.kitId) {
      this.loading = true;
      this.cargarKit(this.kitId).then(ok => {
        this.loading = false;
        if (!ok) {
          this.router.navigate(['/admin/kits']);
        }
      });
    }
  }

  get esEdicion(): boolean {
    return this.kitId !== null;
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

  private async cargarKit(id: number): Promise<boolean> {
    try {
      const kit: KitInstalacion = await firstValueFrom(this.kitsService.obtener(id));
      this.form.patchValue({
        nombre: kit.nombre ?? '',
        descripcion: kit.descripcion ?? '',
      });
      this.materialesSeleccionados = (kit.materiales ?? []).map(m => ({
        idMaterial: m.idMaterial,
        nombre: m.nombre,
        unidadMedida: m.unidadMedida ?? '',
        cantidad: m.cantidad ?? null,
        notasKit: m.notasKit ?? null,
      }));
      return true;
    } catch {
      this.toast.error('No se pudo cargar el kit para edición.');
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

  yaEstaEnKit(idMaterial?: number): boolean {
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
      this.toast.warning('Este material ya forma parte del kit.');
      return;
    }
    this.materialesSeleccionados.push({
      idMaterial: material.idMaterial,
      nombre: material.nombre,
      unidadMedida: material.unidadMedida ?? '',
      cantidad: null,
      notasKit: null,
    });
    this.cerrarSelector();
  }

  private yaSeleccionado(idMaterial?: number): boolean {
    return idMaterial != null && this.materialesSeleccionados.some(m => m.idMaterial === idMaterial);
  }

  quitarMaterial(index: number): void {
    this.materialesSeleccionados.splice(index, 1);
  }

  onCantidadChange(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.materialesSeleccionados[index].cantidad = value === '' ? null : Number(value);
  }

  onNotasChange(index: number, event: Event): void {
    this.materialesSeleccionados[index].notasKit = (event.target as HTMLInputElement).value;
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
          cantidad: null,
          notasKit: null,
        });
      }

      this.toast.success('Material creado y agregado al kit');
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

  // ── Persistencia del kit ───────────────────────────────────────────────
  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Corrige los campos marcados antes de guardar');
      return;
    }

    const raw = this.form.getRawValue();
    const nombre = String(raw.nombre ?? '').trim();
    const descripcion = raw.descripcion ? String(raw.descripcion).trim() : null;

    const materiales = this.materialesSeleccionados.map(m => ({
      idMaterial: m.idMaterial as number,
      Cantidad: m.cantidad ?? null,
      Notas: m.notasKit ?? null,
    }));

    this.guardando = true;
    try {
      if (this.kitId) {
        await firstValueFrom(this.kitsService.actualizar(this.kitId, nombre, descripcion, materiales));
        this.toast.success('Kit actualizado correctamente');
      } else {
        await firstValueFrom(this.kitsService.crear(nombre, descripcion, materiales));
        this.toast.success('Kit creado correctamente');
      }
      this.router.navigate(['/admin/kits']);
    } catch (err) {
      const mensajeBackend = (err as { error?: { error?: string } })?.error?.error;
      if (!mensajeBackend) {
        this.toast.error('Error de comunicación: no se pudo guardar el kit.');
      }
      console.error('[kit-form] Error al guardar:', err);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/kits']);
  }
}