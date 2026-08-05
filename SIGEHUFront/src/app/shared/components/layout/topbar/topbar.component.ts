import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OmniboxComponent } from '../../omnibox/omnibox.component';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, OmniboxComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss'
})
export class TopbarComponent {
  // Inputs
  pageTitle = input.required<string>();
  pageSubtitle = input<string>('');
  userInitials = input('CU');
  notificationCount = input(0);

  // Outputs
  newWorkClick = output<void>();
  notificationClick = output<void>();
  profileClick = output<void>();

  // Estado local
  searchQuery = signal('');

  onNewWork(): void {
    this.newWorkClick.emit();
  }

  onNotification(): void {
    this.notificationClick.emit();
  }

  onProfile(): void {
    this.profileClick.emit();
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }
}