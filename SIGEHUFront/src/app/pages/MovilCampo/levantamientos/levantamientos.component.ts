import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';

/* =========================================================================
   SIGEHU — Levantamiento de Medidas (app móvil de campo)
   Requerimientos: RF-11 (Orden de Levantamiento), RF-12 (Captura de Medidas
   y Observaciones). Aislamiento total de precios en móvil.
   ========================================================================= */

@Component({
  selector: 'app-levantamientos',
  standalone: true,
  imports: [CommonModule, IonicModule, ReactiveFormsModule],
  templateUrl: './levantamientos.component.html',
  styleUrls: ['./levantamientos.component.scss'],
})
export class LevantamientosComponent {
  private fb = inject(FormBuilder);

  informacionObra = {
    cliente: 'María Elena Gómez',
    obra: 'Portón Corredizo Residencial',
    ubicacion: 'Av. de la Cruz #405',
    telefono: '33 1200 3040',
  };

  form: FormGroup;
  guardando = false;

  constructor() {
    this.form = this.fb.group({
      alto: ['', [Validators.required, Validators.min(0)]],
      ancho: ['', [Validators.required, Validators.min(0)]],
      profundidad: ['', [Validators.min(0)]],
      observaciones: [''],
    });
  }

  submitLevantamiento(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando = true;
    // TODO (RF-13): marcar como "Levantamiento Pendiente de Validación"
    // y encolar en cola offline (RF-35).
    setTimeout(() => {
      this.guardando = false;
      console.log('Levantamiento guardado (cola offline)', this.form.value);
    }, 400);
  }

  volver(): void {
    console.log('Volver al listado');
  }
}