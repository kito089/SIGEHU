import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export type ViewType = 'board' | 'calendar' | 'user-jobs';

interface WorkCard {
  id: number;
  title: string;
  subtitle: string;
  statusTag?: string; // Ej: 'Pendiente', 'Realizado', 'Reportada', 'En atención', 'Resuelta'
  tagClass?: string;  // Para asignar la clase CSS correspondiente al color
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent {
  // Control de vista activa (estilo GitHub)
  currentView: ViewType = 'board';

  // Datos simulados para las columnas modificadas
  levantamientoCards: WorkCard[] = [
    { id: 1, title: 'Hotel Sol Clarón', subtitle: 'Barandales Terraza Norte', statusTag: 'Pendiente', tagClass: 'tag-warning' }
  ];

  garantiaCards: WorkCard[] = [
    { id: 2, title: 'Restaurante El Asador', subtitle: 'Ajuste Chapa Portón Cocina', statusTag: 'Reportada', tagClass: 'tag-danger' }
  ];

  changeView(view: ViewType): void {
    this.currentView = view;
  }
}