import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

/* =========================================================================
   SIGEHU — Hoja de Ruta e Instalación (app móvil de campo)
   Requerimientos: RF-19 (Programación de Instalación), RF-20 (Doble
   Validación de Instalación), RF-23 (Checklist de Kit para Ruta).
   Sin datos financieros visibles.
   ========================================================================= */

interface ItemChecklist {
  nombre: string;
  verificado: boolean;
}

@Component({
  selector: 'app-ruta',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule],
  templateUrl: './ruta.component.html',
  styleUrls: ['./ruta.component.scss'],
})
export class RutaComponent {
  entrega = {
    cliente: 'María Elena Gómez',
    telefono: '449-123-4567',
    direccion: 'Av. de la Cruz #405, Col. Rey Xolotl',
  };

  checklist: ItemChecklist[] = [
    { nombre: 'Planta de soldar portátil', verificado: false },
    { nombre: 'Paquete de electrodos 6013', verificado: false },
    { nombre: 'Rotomartillo y brocas para concreto', verificado: false },
    { nombre: 'Careta y equipo de protección', verificado: false },
  ];

  confirmando = false;

  get porcentajeVerificado(): number {
    const total = this.checklist.length;
    if (total === 0) return 0;
    const ok = this.checklist.filter((i) => i.verificado).length;
    return Math.round((ok / total) * 100);
  }

  confirmarEntrega(): void {
    this.confirmando = true;
    // TODO (RF-20): marcar obra como entregada con evidencias fotográficas
    // y pasar a validación del propietario.
    setTimeout(() => {
      this.confirmando = false;
      console.log('Entrega confirmada, pendiente de validación', this.porcentajeVerificado);
    }, 400);
  }

  volver(): void {
    console.log('Volver al listado');
  }
}