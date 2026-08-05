import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface FilterOption {
  value: string;
  label: string;
}

@Component({
  selector: 'app-filter-bar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './filter-bar.component.html',
  styleUrl: './filter-bar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FilterBarComponent {
  @Input() searchPlaceholder = 'Buscar…';
  @Input() searchTerm = '';
  @Input() options: FilterOption[] = [];
  @Input() filterValue = '';

  @Output() searchTermChange = new EventEmitter<string>();
  @Output() filterValueChange = new EventEmitter<string>();

  onSearch(value: string): void {
    this.searchTermChange.emit(value);
  }

  onFilter(value: string): void {
    this.filterValueChange.emit(value);
  }
}
