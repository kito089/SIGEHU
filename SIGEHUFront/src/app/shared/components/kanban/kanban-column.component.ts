import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanCardComponent } from './kanban-card.component';
import { KanbanColumnData, KanbanCardData } from './kanban-board.component';

@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [CommonModule, KanbanCardComponent],
  templateUrl: './kanban-column.component.html',
  styleUrl: './kanban-column.component.scss'
})
export class KanbanColumnComponent {
  column = input.required<KanbanColumnData>();
  cardClick = output<KanbanCardData>();
  addCardClick = output<string>();

  onCardClick(card: KanbanCardData): void {
    this.cardClick.emit(card);
  }

  onAddCard(): void {
    this.addCardClick.emit(this.column().id);
  }
}