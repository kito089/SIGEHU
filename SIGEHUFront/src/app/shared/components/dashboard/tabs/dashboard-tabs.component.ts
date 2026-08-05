import { Component, input, output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export type DashboardTab = 'kanban' | 'calendar' | 'assigned';

@Component({
  selector: 'app-dashboard-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-tabs.component.html',
  styleUrl: './dashboard-tabs.component.scss'
})
export class DashboardTabsComponent {
  private sanitizer = inject(DomSanitizer);

  activeTab = input.required<DashboardTab>();
  tabChange = output<DashboardTab>();

  readonly tabs: { key: DashboardTab; label: string; icon: string }[] = [
    { key: 'kanban', label: 'Kanban', icon: 'kanban' },
    { key: 'calendar', label: 'Calendario', icon: 'calendar' },
    { key: 'assigned', label: 'Trabajos asignados', icon: 'assigned' },
  ];

  getIconSvg(name: string): string {
    const icons: Record<string, string> = {
      kanban: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
      calendar: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      assigned: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    };
    return icons[name] || '';
  }

  getSafeIconSvg(name: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.getIconSvg(name));
  }

  tabClass(key: DashboardTab): string {
    return this.activeTab() === key ? 'tab-btn active' : 'tab-btn';
  }

  onTabClick(tab: DashboardTab): void {
    this.tabChange.emit(tab);
  }
}