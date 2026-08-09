import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanColumnComponent } from './kanban-column.component';

export interface KanbanColumnData {
  id: string;
  title: string;
  color: string; // hex color para el punto indicador
  cards: KanbanCardData[];
}

export interface KanbanCardData {
  id: string | number;
  code: string; // ej. "C1"
  client: string;
  title: string;
  badges: KanbanBadge[];
  date: string;
  avatarInitials: string;
  avatarColor: string;
  assigneeName: string;
}

export interface KanbanBadge {
  text: string;
  type: 'pending' | 'done' | 'high' | 'reported' | 'in_progress' | 'resolved';
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, KanbanColumnComponent],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss'
})
export class KanbanBoardComponent {
  columns = input.required<KanbanColumnData[]>();
  cardClick = output<KanbanCardData>();

  onCardClick(card: KanbanCardData): void {
    this.cardClick.emit(card);
  }
}