import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { MobileHeaderComponent } from '../mobile-header/mobile-header.component';
import { MobileBottomNavComponent } from '../mobile-bottom-nav/mobile-bottom-nav.component';

import { filter } from 'rxjs/operators';

interface PageConfig {
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, MobileHeaderComponent, MobileBottomNavComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss'
})
export class MainLayoutComponent {
  private router = inject(Router);

  // Estado reactivo
  currentRoute = signal('/admin/dashboard');

  // Configuración de títulos por ruta
  private readonly pageConfigs: Record<string, PageConfig> = {
    '/admin/dashboard': { title: 'Dashboard de Obras', subtitle: 'Julio 2026 · Herrería Utrilla' },
    '/admin/obras': { title: 'Obras / Proyectos', subtitle: 'Gestión del ciclo de vida de obras' },
    '/admin/obras/nueva': { title: 'Nueva Obra', subtitle: 'Alta de obra' },
    '/admin/obras/editar': { title: 'Editar Obra', subtitle: 'Modificar obra' },
    '/admin/trabajadores': { title: 'Trabajadores', subtitle: 'Gestión de personal y permisos' },
    '/admin/trabajadores/nuevo': { title: 'Nuevo Trabajador', subtitle: 'Registro de personal' },
    '/admin/clientes': { title: 'Clientes', subtitle: 'Gestión de clientes y contactos' },
    '/admin/clientes/form': { title: 'Nuevo Cliente', subtitle: 'Registro de cliente' },
    '/admin/clientes/editar': { title: 'Editar Cliente', subtitle: 'Modificar datos de cliente' },
    '/admin/proveedores': { title: 'Proveedores', subtitle: 'Catálogo de proveedores' },
    '/admin/proveedores/nuevo': { title: 'Nuevo Proveedor', subtitle: 'Registro de proveedor' },
    '/admin/calendario': { title: 'Calendario Operativo', subtitle: 'Programación de actividades' },
    '/admin/calendario/agendar': { title: 'Agendar Actividad', subtitle: 'Nueva cita programada' },
    '/admin/materiales': { title: 'Materiales / Herramientas', subtitle: 'Catálogo de insumos, materiales y suministros' },
    '/admin/materiales/nuevo': { title: 'Nuevo Material', subtitle: 'Alta de material o herramienta' },
    '/admin/materiales/editar': { title: 'Editar Material', subtitle: 'Modificar material o herramienta' },
    '/admin/kits': { title: 'Kits de Instalación', subtitle: 'Paquetes de herramientas y materiales por obra' },
    '/admin/reportes': { title: 'Reportes', subtitle: 'Consultas generales e indicadores del negocio' },
    '/admin/catalogo': { title: 'Materiales / Herramientas', subtitle: 'Catálogo de insumos, materiales y suministros' },
    '/admin/fabricacion': { title: 'Control de Fabricación', subtitle: 'Órdenes de trabajo en taller' },
    '/admin/garantias': { title: 'Garantías', subtitle: 'Seguimiento post-venta' },
    '/admin/orden': { title: 'Órdenes de Compra', subtitle: 'Gestión de compras y logística' },
    '/admin/ruta': { title: 'Hoja de Ruta', subtitle: 'Planificación de instalaciones' },
    '/admin/analitico': { title: 'Panel Analítico', subtitle: 'Métricas y reportes' },
  };

  constructor() {
    // Sincronizar ruta actual con router
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute.set(event.urlAfterRedirects);
    });
  }

  get pageConfig(): PageConfig {
    const route = this.currentRoute();
    // Match exacto o por prefijo
    const exact = this.pageConfigs[route];
    if (exact) return exact;

    // Match por prefijo (para rutas dinámicas como /admin/clientes/editar/123)
    for (const [path, config] of Object.entries(this.pageConfigs)) {
      if (route.startsWith(path)) return config;
    }

    return { title: 'SIGEHU', subtitle: 'Herrería Utrilla' };
  }

  onNewWork(): void {
    this.router.navigate(['/admin/obras/nueva']);
  }
}