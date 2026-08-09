import { Component, input, inject, signal, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { OmniboxComponent } from '../../omnibox/omnibox.component';
import { SidebarIconRegistry } from '../sidebar/sidebar-icon-registry.service';

interface MobileNavItem {
  icon: string;
  label: string;
  route?: string;
  action?: 'catalogs' | 'search';
}

/* =========================================================================
   SIGEHU — Bottom Navigation móvil (reemplaza el Sidebar en móvil).
   - Solo iconos (sin etiquetas visibles).
   - Catálogos abre submenú (no navega).
   - Lupa abre el mismo Omnibox existente (no duplica lógica de búsqueda).
   - Reutiliza SidebarIconRegistry (offline) y RouterModule (navegación).
   ========================================================================= */

@Component({
  selector: 'app-mobile-bottom-nav',
  standalone: true,
  imports: [CommonModule, RouterModule, OmniboxComponent],
  templateUrl: './mobile-bottom-nav.component.html',
  styleUrl: './mobile-bottom-nav.component.scss'
})
export class MobileBottomNavComponent {
  private sanitizer = inject(DomSanitizer);
  private icons = inject(SidebarIconRegistry);
  private router = inject(Router);

  activeRoute = input.required<string>();

  mainItems: MobileNavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/admin/dashboard' },
    { icon: 'clients', label: 'Clientes', route: '/admin/clientes' },
    { icon: 'catalogs', label: 'Catálogos', action: 'catalogs' },
    { icon: 'orders', label: 'Ordenes de Compra', route: '/admin/orden' },
    { icon: 'reports', label: 'Reportes', route: '/admin/reportes' },
    { icon: 'search', label: 'Buscar', action: 'search' },
  ];

  catalogChildren = [
    { icon: 'workers', label: 'Trabajadores', route: '/admin/trabajadores' },
    { icon: 'materials', label: 'Materiales', route: '/admin/materiales' },
    { icon: 'kits', label: 'Kits', route: '/admin/kits' },
    { icon: 'providers', label: 'Proveedores', route: '/admin/proveedores' },
  ];

  catalogOpen = signal(false);
  searchOpen = signal(false);

  @ViewChild('wrapper') wrapper?: ElementRef<HTMLElement>;

  icon(name: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.icons.get(name));
  }

  isActive(route: string): boolean {
    return this.activeRoute().startsWith(route);
  }

  isCatalogActive(): boolean {
    return this.catalogChildren.some(c => this.isActive(c.route));
  }

  onItemClick(item: MobileNavItem): void {
    if (item.action === 'catalogs') {
      this.toggleCatalog();
      return;
    }
    if (item.action === 'search') {
      this.toggleSearch();
      return;
    }
    if (item.route) {
      this.closeAll();
      this.router.navigate([item.route]);
    }
  }

  toggleCatalog(): void {
    const willOpen = !this.catalogOpen();
    if (willOpen) this.searchOpen.set(false);
    this.catalogOpen.set(willOpen);
  }

  toggleSearch(): void {
    const willOpen = !this.searchOpen();
    if (willOpen) this.catalogOpen.set(false);
    this.searchOpen.set(willOpen);
  }

  closeAll(): void {
    this.catalogOpen.set(false);
    this.searchOpen.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    if (!this.catalogOpen() && !this.searchOpen()) return;
    const target = event.target as HTMLElement | null;
    if (target && this.wrapper?.nativeElement.contains(target)) return;
    this.closeAll();
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(): void {
    this.closeAll();
  }
}
