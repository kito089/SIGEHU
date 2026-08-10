import { Component, computed, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../../../services/auth.service';
import { SidebarIconRegistry } from './sidebar-icon-registry.service';
import { LogoutButtonComponent } from '../../logout-button/logout-button.component';

export interface NavItem {
  icon: string;      // SVG inline o nombre icono
  label: string;
  route: string;
  badge?: number;
}

export interface NavGroup {
  icon: string;
  label: string;
  children: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutButtonComponent],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private sanitizer = inject(DomSanitizer);
  private auth = inject(AuthService);
  private icons = inject(SidebarIconRegistry);

  // Inputs
  activeRoute = input.required<string>();

  // Usuario autenticado (se obtiene dinámicamente de la sesión, sin datos estáticos).
  private readonly usuario = computed(() => this.auth.getUser());

  readonly userName = computed(() => this.usuario()?.nombre ?? 'Usuario');
  readonly userRole = computed(() => (this.usuario()?.rol === 'Trabajador' ? 'Trabajador' : 'Administrador'));
  readonly userInitials = computed(() => this.initials(this.usuario()?.nombre));

  private initials(nombre?: string): string {
    if (!nombre) return 'U';
    const partes = nombre.trim().split(/\s+/).filter(Boolean);
    const a = partes[0]?.charAt(0) ?? '';
    const b = partes.length > 1 ? partes[partes.length - 1].charAt(0) : '';
    return (a + b).toUpperCase() || 'U';
  }

  // Configuración navegación principal según reestructuración del sidebar.
  // Nivel principal: Dashboard, Clientes, Catálogos (acordeón), Ordenes de Compra, Reportes.
  readonly primaryItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/admin/dashboard' },
    { icon: 'clients', label: 'Clientes', route: '/admin/clientes' },
  ];

  readonly catalogGroup: NavGroup = {
    icon: 'catalogs',
    label: 'Catálogos',
    children: [
      { icon: 'workers', label: 'Trabajadores', route: '/admin/trabajadores' },
      { icon: 'materials', label: 'Materiales / Herramientas', route: '/admin/materiales' },
      { icon: 'kits', label: 'Kits', route: '/admin/kits' },
      { icon: 'providers', label: 'Proveedores', route: '/admin/proveedores' },
    ],
  };

  readonly secondaryItems: NavItem[] = [
    { icon: 'orders', label: 'Ordenes de Compra', route: '/admin/orden' },
    { icon: 'reports', label: 'Reportes', route: '/admin/reportes' },
  ];

  // Estado del acordeón "Catálogos".
  readonly catalogOpen = signal<boolean>(false);

  toggleCatalog(): void {
    this.catalogOpen.update(v => !v);
  }

  getIconName(icon: string): string {
    return icon;
  }

  onNavClick(): void {
    // No-op; navegación manejada por routerLink
  }

  isActive(route: string): boolean {
    return this.activeRoute().startsWith(route);
  }

  // Indica si alguna ruta hija del grupo Catálogos está activa (para auto-expandir).
  isCatalogActive(): boolean {
    return this.catalogGroup.children.some(c => this.isActive(c.route));
  }

  // SVG icons inline - copiar de LAYOUT_ANALISIS.md specs (outline, 20x20, stroke 1.5)
  // Registro centralizado en SidebarIconRegistry (offline, sin dependencias externas).
  getIconSvg(name: string): string {
    return this.icons.get(name);
  }

  getSafeIconSvg(name: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.getIconSvg(name));
  }
}