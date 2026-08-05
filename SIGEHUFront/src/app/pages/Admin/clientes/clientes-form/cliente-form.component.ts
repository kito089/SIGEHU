import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { EntityFormComponent } from '../../../../shared/components/entity-form/entity-form.component';
// import { Router, ActivatedRoute } from '@angular/router';
// import { ClientesService } from '../../services/clientes.service';

/* =========================================================================
   SIGEHU — Agregar / Editar Cliente (componente Angular standalone)

   Sirve tanto para alta como para edición: si recibe [clienteId] carga los
   datos existentes y cambia el título/botón a modo edición.

   Conexión al backend: reemplaza fetchCliente() y guardar() por tus
   llamadas reales (GET/POST/PUT /api/clientes).
   ========================================================================= */

@Component({
  selector: 'app-cliente-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EntityFormComponent],
  templateUrl: './cliente-form.component.html',
  styleUrls: ['./cliente-form.component.css'],
})
export class ClienteFormComponent implements OnInit {
  private fb = inject(FormBuilder);


  // Si viene con id (por @Input o por parámetro de ruta), es edición.
  @Input() clienteId: number | null = null;

  form: FormGroup;
  loading = false;
  guardando = false;

  regimenesFiscales = [
    { value: '601', label: '601 · General de Ley Personas Morales' },
    { value: '603', label: '603 · Personas Morales con Fines no Lucrativos' },
    { value: '605', label: '605 · Sueldos y Salarios' },
    { value: '612', label: '612 · Personas Físicas con Actividades Empresariales' },
    { value: '621', label: '621 · Incorporación Fiscal' },
    { value: '626', label: '626 · Régimen Simplificado de Confianza (RESICO)' },
  ];

  usosCfdi = [
    { value: 'G01', label: 'G01 · Adquisición de mercancías' },
    { value: 'G03', label: 'G03 · Gastos en general' },
    { value: 'I08', label: 'I08 · Otra maquinaria y equipo' },
    { value: 'P01', label: 'P01 · Por definir' },
  ];

  constructor() {
    this.form = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      telefono: ['', [Validators.required, Validators.pattern(/^\d{10}$/)]],
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
    // Si tu ruta usa /clientes/editar/:id en vez de @Input, descomenta:
    // this.clienteId = Number(this.route.snapshot.paramMap.get('id')) || null;

    if (this.clienteId) {
      this.loading = true;
      this.fetchCliente(this.clienteId).then(cliente => {
        this.form.patchValue(cliente);
        cliente.contactos.forEach((c: { nombre: string; telefono: string }) => this.agregarContacto(c.nombre, c.telefono));
        if (cliente.datosFiscales) this.onToggleDatosFiscales(true);
        this.loading = false;
      });
    } else {
      // Al menos un contacto vacío por defecto para no arrancar en cero.
      this.agregarContacto();
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

  agregarContacto(nombre = '', telefono = ''): void {
    this.contactos.push(
      this.fb.group({
        nombre: [nombre, Validators.required],
        telefono: [telefono, [Validators.required, Validators.pattern(/^\d{10}$/)]],
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
      return;
    }

    this.guardando = true;
    const payload = this.form.getRawValue();

    try {
      await this.guardar(payload);
      // this.router.navigate(['/clientes']);
      console.log('Cliente guardado', payload);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    // this.router.navigate(['/clientes']);
    console.log('Cancelado');
  }

  // ---------------------------------------------------------------------
  // Mocks — reemplázalos por tus llamadas reales al backend.
  // ---------------------------------------------------------------------

  private async fetchCliente(id: number): Promise<any> {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({
          nombre: 'Carlos Utrilla',
          telefono: '3312345678',
          correo: 'carlos.utrilla@correo.com',
          direccion: 'Colonia Rey Xolotl, Tonalá, Jal.',
          observaciones: 'Cliente frecuente, prefiere contacto por WhatsApp.',
          requiereFactura: true,
          datosFiscales: true,
          fiscal: {
            rfc: 'UTCA850101AB1',
            razonSocialFiscal: 'Carlos Eduardo Utrilla Canal',
            regimenFiscal: '612',
            usoCfdi: 'G03',
            codigoPostalFiscal: '45400',
            direccionFiscal: 'Colonia Rey Xolotl, Tonalá, Jalisco',
          },
          contactos: [{ nombre: 'Carlos Utrilla', telefono: '3312345678' }],
        });
      }, 400);
    });
  }

  private async guardar(payload: unknown): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500));
  }
}