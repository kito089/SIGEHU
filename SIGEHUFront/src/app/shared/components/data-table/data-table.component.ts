import { Component, Input, ContentChild, TemplateRef, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DataTableAlign = 'left' | 'right' | 'center';

export interface DataTableColumn {
  key: string;
  label: string;
  align?: DataTableAlign;
  width?: string;
}

@Component({
  selector: 'app-data-table',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './data-table.component.html',
  styleUrl: './data-table.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DataTableComponent {
  @Input() columns: DataTableColumn[] = [];
  @Input() data: unknown[] = [];
  @Input() loading = false;
  @Input() emptyMessage = 'No se encontraron resultados.';
  @Input() rowKey = 'id';

  @ContentChild('cell') cellTemplate?: TemplateRef<unknown>;
  @ContentChild('actions') actionsTemplate?: TemplateRef<unknown>;

  @Output() rowClick = new EventEmitter<unknown>();

  get colspan(): number {
    return this.columns.length + (this.actionsTemplate ? 1 : 0);
  }

  cellContext(row: unknown, col: DataTableColumn): Record<string, unknown> {
    return { $implicit: row, column: col };
  }

  actionsContext(row: unknown): Record<string, unknown> {
    return { $implicit: row };
  }

  cellValue(row: unknown, key: string): unknown {
    return (row as Record<string, unknown>)?.[key];
  }

  onRowClick(row: unknown): void {
    this.rowClick.emit(row);
  }
}
