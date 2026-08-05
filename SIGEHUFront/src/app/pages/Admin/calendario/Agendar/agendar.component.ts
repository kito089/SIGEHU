import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
// import { Router } from '@angular/router';
// import { ObrasService } from '../../services/obras.service';
// import { TrabajadoresService } from '../../services/trabajadores.service';

/* =========================================================================
   SIGEHU — Agendar Actividad (componente Angular standalone)

   Crea un evento del Calendario Operativo: una visita de levantamiento,
   un bloque de fabricación o una instalación programada.

   Puede recibir una fecha ya elegida (p. ej. si el usuario da clic en un
   día del calendario) a través de [fechaInicial].

   Conexión al backend: reemplaza fetchObras(), fetchTrabajadores() y
   guardar() por tus llamadas reales.
   ========================================================================= */

type TipoEvento = 'levantamiento' | 'fabricacion' | 'instalacion';

interface ObraOpcion {
  id: number;
  obra: string;
  cliente: string;
}

interface TrabajadorOpcion {
  id: number;
  nombre: string;
}

@Component({
  selector: 'app-agendar-actividad',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './agendar.component.html',
  styleUrls: ['./agendar.component.css'],
})
export class AgendarComponent implements OnInit {
  private fb = inject(FormBuilder);


  @Input() fechaInicial: string | null = null;

  form: FormGroup;
  loading = false;
  guardando = false;

  tipos: { value: TipoEvento; label: string }[] = [
    { value: 'levantamiento', label: 'Levantamiento' },
    { value: 'fabricacion',   label: 'En Fabricación' },
    { value: 'instalacion',   label: 'Instalación Programada' },
  ];

  obras: ObraOpcion[] = [];
  trabajadores: TrabajadorOpcion[] = [];

  constructor() {
    this.form = this.fb.group({
      tipo: ['levantamiento', [Validators.required]],
      obraId: ['', [Validators.required]],
      fecha: [this.fechaInicial ?? '', [Validators.required]],
      hora: ['', [Validators.required]],
      responsableId: ['', [Validators.required]],
      notas: [''],
    });
  }

  ngOnInit(): void {
    this.loading = true;
    Promise.all([this.fetchObras(), this.fetchTrabajadores()]).then(([obras, trabajadores]) => {
      this.obras = obras;
      this.trabajadores = trabajadores;
      this.loading = false;
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
      // this.router.navigate(['/calendario']);
      console.log('Actividad agendada', payload);
    } finally {
      this.guardando = false;
    }
  }

  cancelar(): void {
    // this.router.navigate(['/calendario']);
    console.log('Cancelado');
  }

  // ---------------------------------------------------------------------
  // Mocks — reemplázalos por tus llamadas reales al backend.
  // ---------------------------------------------------------------------

  private async fetchObras(): Promise<ObraOpcion[]> {
    return [
      { id: 1, obra: 'Barandales Terraza Norte', cliente: 'Motel Sol Clarión' },
      { id: 2, obra: 'Reja Enrollable Local', cliente: 'Farmacia del Valle' },
      { id: 3, obra: 'Protecciones Ventana Mod. P12', cliente: 'Inmobiliaria Viste' },
      { id: 4, obra: 'Estructura Domo Patio', cliente: 'Sofía Hernández' },
      { id: 5, obra: 'Portón Automatizado Principal', cliente: 'Isra. García Torres' },
      { id: 6, obra: 'Cancel Principal Baño', cliente: 'Residencial Alvento' },
    ];
  }

  private async fetchTrabajadores(): Promise<TrabajadorOpcion[]> {
    return [
      { id: 1, nombre: 'Ing. Beltrán' },
      { id: 2, nombre: 'J. López' },
      { id: 3, nombre: 'Medina S.' },
      { id: 4, nombre: 'N. Bárcenas' },
    ];
  }

  private async guardar(payload: unknown): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 500));
  }
}