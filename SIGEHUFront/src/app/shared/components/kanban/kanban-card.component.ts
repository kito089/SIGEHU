import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanCardData, KanbanBadge } from './kanban-board.component';

@Component({
  selector: 'app-kanban-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kanban-card.component.html',
  styleUrl: './kanban-card.component.scss'
})
export class KanbanCardComponent {
  card = input.required<KanbanCardData>();

  getBadgeClass(type: KanbanBadge['type']): string {
    return `card-badge card-badge--${type}`;
  }
}