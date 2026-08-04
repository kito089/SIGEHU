import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Worker {
  id: number;
  initials: string;
  name: string;
  phone: string;
  assignedWorks: string[]; // Soporta varias obras asignadas
}

@Component({
  selector: 'app-trabajadores',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trabajadores.component.html',
  styleUrls: ['./trabajadores.component.css']
})
export class TrabajadoresComponent {
  workersList: Worker[] = [
    {
      id: 1,
      initials: 'JM',
      name: 'Juan Martínez',
      phone: '951-112-0346',
      assignedWorks: ['Portón Gómez', 'Cancel Alvento']
    },
    {
      id: 2,
      initials: 'SR',
      name: 'Saúl Rodríguez',
      phone: '221-890-2211',
      assignedWorks: ['Ninguna (Ruta Completa)']
    }
  ];

  updateWorkerData(worker: Worker): void {
    console.log('Actualizando datos del trabajador:', worker);
    // Abrir modal o navegar a formulario de edición de datos
  }
}