import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// import { Router, ActivatedRoute } from '@angular/router';
// import { TrabajadoresService } from '../../services/trabajadores.service';

/* =========================================================================
   SIGEHU — Nuevo / Actualizar Trabajador (componente Angular standalone)

   Sirve tanto para alta como para edición: si recibe [trabajadorId] carga
   los datos existentes y cambia el título/botón a modo edición (este es el
   formulario al que apunta el botón "Actualizar Datos" de la tabla).

   Sin roles ni estado laboral, según la revisión de negocio. La asignación
   de obras se maneja desde su propia pantalla, no desde aquí.

   Conexión al backend: reemplaza fetchTrabajador() y guardar() por tus
   llamadas reales (GET/POST/PUT /api/trabajadores).
   ========================================================================= */

@Component({
  selector: 'app-trabajador-new',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './trabajadornew.component.html',
  styleUrls: ['./trabajadornew.component.css'],
})
export class TrabajadorNewComponent implements OnInit {

  // Si viene con id (por @Input o por parámetro de ruta), es edición.
  @Input() trabajadorId: number | null = null;

  form: FormGroup;
  loading = false;
  guardando = false;

  oficios = [
    'Especialista en Corte y Soldadura',
    'Especialista en Pintura',
    'Levantamiento y medidas',
    'Ayudante General',
    'Otro',
  ];

  constructor(
    private fb: FormBuilder,
    // private router: Router,
    // private route: ActivatedRoute,
    // private trabajadoresService: TrabajadoresService,
  ) {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      oficio: ['', [Validators.required]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      correo: ['', [Validators.email]],
      observaciones: [''],
    });
  }

  ngOnInit(): void {
    // Si tu ruta usa /trabajadores/editar/:id en vez de @Input, descomenta:
    // this.trabajadorId = Number(this.route.snapshot.paramMap.get('id')) || null;

    if (this.trabajadorId) {
      this.loading = true;
      this.fetchTrabajador(this.trabajadorId).then(trabajador => {
        this.form.patchValue(trabajador);
        this.loading = false;
      });
    }
  }

  get esEdicion(): boolean {
    return this.trabajadorId !== null;
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    const payload = this.form.getRawValue();

    try {
      await this.guardar(payload);
      // this.router.navigate(['/trabajadores']);
      console.log('Trabajador guardado', payload);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    // this.router.navigate(['/trabajadores']);
    console.log('Cancelado');
  }

  // ---------------------------------------------------------------------
  // Mocks — reemplázalos por tus llamadas reales al backend.
  // ---------------------------------------------------------------------

  private async fetchTrabajador(id: number): Promise<Record<string, unknown>> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          nombre: 'J. López',
          oficio: 'Especialista en Corte y Soldadura',
          telefono: '3315562290',
          correo: 'jlopez@herreriautrilla.com',
          observaciones: 'Disponible turno matutino, maneja soldadora MIG.',
        });
      }, 400);
    });
  }

  private async guardar(payload: unknown): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500));
  }
}