import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ActivityItem {
  id: number;
  action: string;
  entity: string;
  detail?: string;
  user: string;
  time: string;
  type?: string;
}

@Component({
  selector: 'app-activity-feed',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activity-feed.component.html',
  styleUrl: './activity-feed.component.scss'
})
export class ActivityFeedComponent {
  activities = input.required<ActivityItem[]>();

  iniciales(nombre: string): string {
    return nombre.substring(0, 2).toUpperCase();
  }

  avatarColor(nombre: string): string {
    let hash = 0;
    for (let i = 0; i < nombre.length; i++) { hash = nombre.charCodeAt(i) + ((hash << 5) - hash); }
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 50%, 45%)`;
  }

  trackById(_: number, item: ActivityItem): number {
    return item.id;
  }
}