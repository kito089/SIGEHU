import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

export type SkeletonType =
  | 'table-row' | 'table-header' | 'table'
  | 'card' | 'kanban-card' | 'metric-card'
  | 'avatar' | 'text-line' | 'text-block' | 'detail'
  | 'circle' | 'rect';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skeleton.component.html',
  styleUrls: ['./skeleton.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SkeletonComponent {
  @Input() type: SkeletonType = 'text-line';
  @Input() lines = 3;
  @Input() width?: string;
  @Input() height?: string;
}