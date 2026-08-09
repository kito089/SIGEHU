import { Component, computed, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { AuthService } from '../../../../services/auth.service';

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
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  private sanitizer = inject(DomSanitizer);
  private auth = inject(AuthService);

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
  getIconSvg(name: string): string {
    const icons: Record<string, string> = {
      dashboard: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
      clients: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      workers: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="3"/><path d="M4 20v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/><path d="M4 20h16"/><path d="M8 11l1.5 1.5L12 9"/><circle cx="19" cy="6" r="1.8"/><path d="M17.5 4.5l3 3"/></svg>',
      catalogs: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h6a2 2 0 0 1 2 2v14a1.5 1.5 0 0 0-1.5-1.5H4z"/><path d="M20 4h-6a2 2 0 0 0-2 2v14a1.5 1.5 0 0 1 1.5-1.5H20z"/><path d="M12 6v14"/></svg>',
      materials: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      kits: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="m16 16 2 2 4-4"/><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M9 13h6"/></svg>',
      providers: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7Z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
      orders: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l-1 14H7z"/><path d="M9 7a3 3 0 0 1 6 0"/><path d="M6 11h12"/><path d="M7 15h10"/></svg>',
      reports: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>',
      chevron: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>',
    };
    return icons[name] || '';
  }

  getSafeIconSvg(name: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.getIconSvg(name));
  }
}