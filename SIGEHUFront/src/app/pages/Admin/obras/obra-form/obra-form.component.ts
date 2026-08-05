import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EntityFormComponent } from '../../../../shared/components/entity-form/entity-form.component';
import { ApiService } from '../../../../services/api.service';
import { Cliente } from '../../../../core/models/cliente.model';

/* =========================================================================
   SIGEHU — Agregar / Editar Obra (RF-07 Alta de Obras)

   Sirve tanto para alta como para edición: si recibe [obraId] carga los
   datos existentes y cambia el título/botón a modo edición.

   Conexión al backend: reemplaza fetchClientes() y guardar() por tus
   llamadas reales (GET/POST/PUT /Obras).
   ========================================================================= */

@Component({
  selector: 'app-obra-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EntityFormComponent],
  templateUrl: './obra-form.component.html',
  styleUrls: ['./obra-form.component.scss'],
})
export class ObraFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);

  @Input() obraId: number | null = null;

  form: FormGroup;
  loading = false;
  guardando = false;
  clientes: Cliente[] = [];

  readonly estados = [
    { id: 1, nombre: 'Solicitud recibida' },
    { id: 2, nombre: 'Levantamiento pendiente' },
    { id: 3, nombre: 'En fabricación' },
    { id: 4, nombre: 'Instalación programada' },
    { id: 5, nombre: 'Instalado' },
    { id: 6, nombre: 'Garantía' },
    { id: 7, nombre: 'Finalizado' },
  ];

  constructor() {
    this.form = this.fb.group({
      idCliente: [null, [Validators.required]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      direccion: [''],
      ancho: [null],
      alto: [null],
      profundidad: [null],
      observaciones: [''],
    });
  }

  ngOnInit(): void {
    this.fetchClientes();

    if (this.obraId) {
      this.loading = true;
      this.fetchObra(this.obraId).then((obra) => {
        this.form.patchValue(obra);
        this.loading = false;
      });
    }
  }

  get esEdicion(): boolean {
    return this.obraId !== null;
  }

  private fetchClientes(): void {
    this.api.get<Cliente[]>('/Clientes').subscribe({
      next: (data) => {
        this.clientes = Array.isArray(data) && data.length ? data : this.clientesMock();
      },
      error: () => {
        this.clientes = this.clientesMock();
      },
    });
  }

  private clientesMock(): Cliente[] {
    // TODO: eliminar cuando backend /Clientes responda
    return [
      { idCliente: 1, nombre: 'Carlos Utrilla', activo: true },
      { idCliente: 2, nombre: 'María Gómez', activo: true },
      { idCliente: 3, nombre: 'Constructora Altamira', activo: true },
    ];
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.guardando = true;
    const payload = this.form.getRawValue();

    try {
      // TODO: sustituir por POST/PUT /Obras real
      await new Promise(resolve => setTimeout(resolve, 400));
      console.log('Obra guardada', payload);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    console.log('Cancelado');
  }

  private async fetchObra(id: number): Promise<any> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          idCliente: 1,
          nombre: 'Portón corredizo 4x3',
          direccion: 'Col. Rey Xolotl, Tonalá, Jal.',
          ancho: 4,
          alto: 3,
          profundidad: 0,
          observaciones: 'Levantamiento pendiente de agendar.',
        });
      }, 400);
    });
  }
}