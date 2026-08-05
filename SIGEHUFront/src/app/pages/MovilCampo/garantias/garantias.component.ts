import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

/* =========================================================================
   SIGEHU — Garantías y Postventa (app móvil de campo)
   Requerimientos: RF-24 (Apertura de Reporte), RF-25 (Seguimiento de
   sub-estados). El trabajador solo ve problema, dirección y teléfono.
   ========================================================================= */

@Component({
  selector: 'app-garantias-campo',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './garantias.component.html',
  styleUrls: ['./garantias.component.scss'],
})
export class GarantiasCampoComponent {
  obra = 'OB-0014 · Portón Corredizo';
  fechaReporte = '';

  tecnicos = [
    { id: 1, nombre: 'Saúl Rodríguez (Soldador)' },
    { id: 2, nombre: 'Juan Martínez (Instalador)' },
  ];

  tickets = [
    { id: 'GAR-008', descripcion: 'Falla en ajuste de chapa principal', estado: 'En atención', tecnico: 'Saúl Rodríguez' },
    { id: 'GAR-005', descripcion: 'Revisión de bisagras de la puerta', estado: 'Reportada', tecnico: 'Juan Martínez' },
  ];

  guardarTicket(): void {
    // TODO (RF-24): abrir reporte desde obra Instalado, evidencias y
    // transición oficial de la obra a estado "Garantía".
    console.log('Guardar ticket de garantía');
  }

  volver(): void {
    console.log('Volver al listado');
  }
}