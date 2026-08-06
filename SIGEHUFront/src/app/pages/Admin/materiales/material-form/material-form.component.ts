import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { MaterialesService } from '../../../../services/materiales.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EntityFormComponent } from '../../../../shared/components/entity-form/entity-form.component';
import { noWhitespaceValidator } from '../../../../core/validators/no-whitespace.validator';

/* =========================================================================
   SIGEHU — Nuevo / Actualizar Material o Herramienta (componente Angular standalone)

   Sirve tanto para alta como para edición: si recibe [materialId] (por @Input
   o por queryParam `id`) carga los datos existentes y cambia el título/botón
   a modo edición.

   Formulario basado únicamente en la estructura real de la entidad `Materiales`
   del backend (fuente de verdad) y en REQUIREMENTS.md / DISEÑO_UI.md:

     idMaterial   INTEGER identity (PK)
     Nombre       VARCHAR(150) NOT NULL
     UnidadMedida VARCHAR(20)  NOT NULL   → texto libre, sin catálogo
     Descripcion  BLOB TEXT    opcional
     Activo       BOOLEAN default TRUE     (soft-delete, no editable aquí)

   Endpoints:
     GET  /Materiales/:id  → carga datos para edición
     POST /Materiales      → alta
     PUT  /Materiales/:id  → edición
   ========================================================================= */

@Component({
  selector: 'app-material-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EntityFormComponent],
  templateUrl: './material-form.component.html',
  styleUrl: './material-form.component.scss',
})
export class MaterialFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private service = inject(MaterialesService);
  private toast = inject(ToastService);

  // Si viene con id (por @Input o por queryParam), es edición.
  @Input() materialId: number | null = null;

  form: FormGroup;
  loading = false;
  guardando = false;

  constructor() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(150), noWhitespaceValidator()]],
      unidadMedida: ['', [Validators.required, Validators.maxLength(20), noWhitespaceValidator()]],
      descripcion: ['', [Validators.maxLength(500)]],
    });
  }

  ngOnInit(): void {
    const qId = this.route.snapshot.queryParamMap.get('id');
    if (qId) {
      this.materialId = Number(qId) || null;
    }

    if (this.materialId) {
      this.loading = true;
      this.cargarMaterial(this.materialId).then(ok => {
        this.loading = false;
if (!ok) {
          this.router.navigate(['/admin/materiales']);
        }
      });
    }
  }

  get esEdicion(): boolean {
    return this.materialId !== null;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.warning('Corrige los campos marcados antes de guardar');
      return;
    }

    const raw = this.form.getRawValue();
    const payload = {
      nombre: String(raw.nombre ?? '').trim(),
      unidadMedida: String(raw.unidadMedida ?? '').trim(),
      descripcion: raw.descripcion ? String(raw.descripcion).trim() : null,
    };

    this.guardando = true;
    try {
      if (this.materialId) {
        await firstValueFrom(this.service.actualizar(this.materialId, payload));
        this.toast.success('Material actualizado correctamente');
      } else {
        await firstValueFrom(this.service.crear(payload));
        this.toast.success('Material creado correctamente');
      }
      this.router.navigate(['/admin/materiales']);
    } catch (err) {
      const mensajeBackend = (err as { error?: { error?: string } })?.error?.error;
      if (!mensajeBackend) {
        this.toast.error('Error de comunicación: no se pudo completar la operación.');
      }
      console.error('[material-form] Error al guardar:', err);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    this.router.navigate(['/admin/materiales']);
  }

  // ── Carga para edición ──────────────────────────────────────────────────
  private async cargarMaterial(id: number): Promise<boolean> {
    try {
      const material = await firstValueFrom(this.service.obtener(id));
      this.form.patchValue({
        nombre: material.nombre ?? '',
        unidadMedida: material.unidadMedida ?? '',
        descripcion: material.descripcion ?? '',
      });
      return true;
    } catch {
      this.toast.error('No se pudo cargar el material para edición.');
      return false;
    }
  }
}