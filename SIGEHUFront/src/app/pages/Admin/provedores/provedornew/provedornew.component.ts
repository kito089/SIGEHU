import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// import { Router, ActivatedRoute } from '@angular/router';
// import { ProveedoresService } from '../../services/proveedores.service';

/* =========================================================================
   SIGEHU — Agregar / Editar Proveedor (componente Angular standalone)

   Sirve tanto para alta como para edición: si recibe [proveedorId] carga
   los datos existentes y cambia el título/botón a modo edición.

   Conexión al backend: reemplaza fetchProveedor() y guardar() por tus
   llamadas reales (GET/POST/PUT /api/proveedores).
   ========================================================================= */

@Component({
  selector: 'app-proveedor-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './provedornew.component.html',
  styleUrls: ['./provedornew.component.css'],
})
export class ProveedorFormComponent implements OnInit {

  // Si viene con id (por @Input o por parámetro de ruta), es edición.
  @Input() proveedorId: number | null = null;

  form: FormGroup;
  loading = false;
  guardando = false;

  opcionesFinancieras = [
    { value: '', label: 'Sin definir' },
    { value: 'credito', label: 'Política de crédito' },
    { value: 'contado', label: 'Pago de contado' },
    { value: 'anticipo', label: 'Requiere anticipo' },
  ];

  constructor(
    private fb: FormBuilder,
    // private router: Router,
    // private route: ActivatedRoute,
    // private proveedoresService: ProveedoresService,
  ) {
    this.form = this.fb.group({
      empresa: ['', [Validators.required, Validators.minLength(3)]],
      giroPrincipal: [''], // aún no se usa en BD, pero ya viene contemplado
      contacto: ['', [Validators.required]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
      correo: ['', [Validators.email]],
      direccion: [''],
      datoFinanciero: [''],
      observaciones: [''],
    });
  }

  ngOnInit(): void {
    // Si tu ruta usa /proveedores/editar/:id en vez de @Input, descomenta:
    // this.proveedorId = Number(this.route.snapshot.paramMap.get('id')) || null;

    if (this.proveedorId) {
      this.loading = true;
      this.fetchProveedor(this.proveedorId).then(proveedor => {
        this.form.patchValue(proveedor);
        this.loading = false;
      });
    }
  }

  get esEdicion(): boolean {
    return this.proveedorId !== null;
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
      // this.router.navigate(['/proveedores']);
      console.log('Proveedor guardado', payload);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    // this.router.navigate(['/proveedores']);
    console.log('Cancelado');
  }

  // ---------------------------------------------------------------------
  // Mocks — reemplázalos por tus llamadas reales al backend.
  // ---------------------------------------------------------------------

  private async fetchProveedor(id: number): Promise<Record<string, unknown>> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          empresa: 'Aceros Monterrey',
          giroPrincipal: 'Distribuidor de perfiles y lámina',
          contacto: 'Ing. Berta Vda. de Silva',
          telefono: '3336640286',
          correo: 'ventas@acerosmonterrey.com',
          direccion: 'Zona Industrial, Guadalajara, Jal.',
          datoFinanciero: 'credito',
          observaciones: 'Entrega en 48 hrs, pedido mínimo de 1 tonelada.',
        });
      }, 400);
    });
  }

  private async guardar(payload: unknown): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500));
  }
}