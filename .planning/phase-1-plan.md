# PHASE-1-PLAN: SIGEHUFront Refactorización - Plan de Ejecución Subatómico

> **Para Agentes Ejecutores:** Este plan contiene instrucciones **subatómicas** - cada tarea es tan específica que no requiere interpretación. Ejecuta en orden estricto. Si una tarea falla (build error), **DETENTE** y resuelve antes de continuar.

---

## CONVENCIONES DE EJECUCIÓN

| Símbolo | Significado |
|---------|-------------|
| `📝 EDIT` | Modificar archivo existente |
| `📄 CREATE` | Crear archivo nuevo |
| `📂 MOVE` | Mover archivo/carpeta |
| `🗑 DELETE` | Eliminar archivo/carpeta |
| `✅ VERIFY` | Ejecutar `npm run build` y confirmar exit code 0 |
| `🔍 SEARCH` | Buscar patrón en codebase |

**Regla de Oro:** Después de cada tarea marcada con `✅ VERIFY`, ejecutar `npm run build`. Si falla → **NO CONTINUAR**. Fixear el error primero.

---

## WAVE 1: FUNDACIÓN - DIRECTORIOS Y CSS GLOBAL (Tareas 1.1 - 1.9)

### 1.1 📂 MOVE: Consolidar Toast Container
**Objetivo:** Eliminar duplicado `core/components/toast-container/`, mantener `shared/components/toast/`

| Paso | Acción Exacta |
|------|---------------|
| 1.1.1 | Verificar que `shared/components/toast/toast-container.component.ts` existe y exporta `ToastContainerComponent` |
| 1.1.2 | Abrir `src/app/app.component.ts` → buscar import de `ToastContainerComponent` |
| 1.1.3 | Cambiar import de `./core/components/toast-container/toast-container.component` → `./shared/components/toast/toast-container.component` |
| 1.1.4 | Abrir `src/app/app.component.html` → confirmar `<app-toast-container></app-toast-container>` sigue funcionando |
| 1.1.5 | **ELIMINAR** carpeta completa: `src/app/core/components/toast-container/` |
| 1.6 | ✅ VERreferencias rotas: `grep -r "core/components/toast-container" src/` → debe retornar 0 resultados |
| 1.1.7 | ✅ **VERIFY:** `npm run build` |

---

### 1.2 📂 MOVE + 📝 EDIT: Consolidar Modelos
**Objetivo:** Eliminar `src/app/models/`, usar solo `src/app/core/models/`

| Paso | Acción Exacta |
|------|---------------|
| 1.2.1 | Comparar archivos en `src/app/models/` vs `src/app/core/models/` - son idénticos (cliente.model.ts, obra.model.ts, trabajador.model.ts, user.model.ts) |
| 1.2.2 | `grep -r "from '../models/" src/app/pages/` → listar todos los imports relativos a `app/models/` |
| 1.2.3 | Para cada archivo listado: cambiar import `../models/xxx` → `../../core/models/xxx` (ajustar `../` según profundidad) |
| 1.2.4 | `grep -r "from './models/" src/app/pages/` → cambiar a `../../core/models/` |
| 1.2.5 | `grep -r "@app/models" src/` → si usa path alias, actualizar `tsconfig.json` paths |
| 1.2.6 | **ELIMINAR** carpeta completa: `src/app/models/` |
| 1.2.7 | ✅ **VERIFY:** `npm run build` |

---

### 1.3 📂 MOVE: Renombrar Carpetas con Typos (ClientesFrom → clientes-form)

| Paso | Acción Exacta |
|------|---------------|
| 1.3.1 | Renombrar carpeta: `src/app/pages/Admin/clientes/ClientesFrom` → `clientes-form` |
| 1.3.2 | Renombrar archivos dentro: `clientesfrom.component.*` → `cliente-form.component.*` (3 archivos) |
| 1.3.3 | Abrir `src/app/pages/Admin/clientes/cliente-form.component.ts` → cambiar `selector: 'app-clientesfrom'` → `selector: 'app-cliente-form'` y `class ClientesFromComponent` → `class ClienteFormComponent` |
| 1.3.4 | Abrir `src/app/app.routes.ts` → línea 15: cambiar import path `./pages/Admin/clientes/ClientesFrom/clientesfrom.component` → `./pages/Admin/clientes/cliente-form/cliente-form.component` y export `ClientesFromComponent` → `ClienteFormComponent` |
| 1.3.5 | `grep -r "ClientesFrom" src/` → actualizar cualquier referencia restante |
| 1.3.6 | ✅ **VERIFY:** `npm run build` |

---

### 1.4 📂 MOVE: Renombrar Carpetas con Typos (provedores → proveedores)

| Paso | Acción Exacta |
|------|---------------|
| 1.4.1 | Renombrar carpeta: `src/app/pages/Admin/provedores` → `proveedores` |
| 1.4.2 | Renombrar subcarpeta: `src/app/pages/Admin/proveedores/provedornew` → `proveedor-new` |
| 1.4.3 | Renombrar archivos: `provedornew.component.*` → `proveedor-new.component.*` (3 archivos) |
| 1.4.4 | Abrir `src/app/pages/Admin/proveedores/proveedor-new/proveedor-new.component.ts` → cambiar class `ProvedorNewComponent` → `ProveedorNewComponent` (mantener nombre class, solo fix typo en selector si existe) |
| 1.4.5 | Abrir `src/app/pages/Admin/proveedores/proveedores.component.ts` → verificar imports internos |
| 1.4.6 | Abrir `src/app/app.routes.ts` → líneas 17-18: cambiar paths `provedores` → `proveedores`, `provedornew` → `proveedor-new` |
| 1.4.7 | `grep -r "provedores" src/` → actualizar referencias restantes (imports, routing) |
| 1.4.8 | ✅ **VERIFY:** `npm run build` |

---

### 1.5 📂 MOVE: Renombrar Carpetas con Typos (trabajadornew → trabajador-new)

| Paso | Acción Exacta |
|------|---------------|
| 1.5.1 | Renombrar carpeta: `src/app/pages/Admin/trabajadores/trabajadornew` → `trabajador-new` |
| 1.5.2 | Renombrar archivos: `trabajadornew.component.*` → `trabajador-new.component.*` (3 archivos) |
| 1.5.3 | Abrir `src/app/pages/Admin/trabajadores/trabajador-new/trabajador-new.component.ts` → verificar class name |
| 1.5.4 | Abrir `src/app/app.routes.ts` → línea 16: cambiar path `trabajadores/trabajadornew/trabajadornew.component` → `trabajadores/trabajador-new/trabajador-new.component` |
| 1.5.5 | `grep -r "trabajadornew" src/` → actualizar referencias |
| 1.5.6 | ✅ **VERIFY:** `npm run build` |

---

### 1.6 📄 CREATE: `src/theme/variables.scss` - Design System Completo

**Archivo nuevo completo. Copiar EXACTAMENTE este contenido:**

```scss
// =============================================================================
// SIGEHU DESIGN SYSTEM - Variables CSS Globales
// Basado en: docs/LAYOUT_ANALISIS.md y docs/DASHBOARD_ANALISIS.md
// =============================================================================

:root {
  // -----------------------------------------------------------------------------
  // COLORES BASE - LAYOUT_ANALISIS.md Paleta
  // -----------------------------------------------------------------------------
  --sigehu-sidebar-bg: #0F172A;           // Sidebar fondo principal
  --sigehu-topbar-bg: #1E293B;            // Topbar + Content fondo
  --sigehu-content-bg: #1E293B;           // Área contenido principal
  --sigehu-active-bg: #1E3A8A;            // Item activo fondo
  --sigehu-active-text: #3B82F6;          // Item activo texto/icono
  --sigehu-text-primary: #F8FAFC;         // Títulos, texto destacado
  --sigehu-text-secondary: #94A3B8;       // Subtítulos, placeholders, items inactivos
  --sigehu-text-tertiary: #64748B;        // Texto terciario, metadata
  --sigehu-primary-btn-bg: #3B82F6;       // Botón primario fondo
  --sigehu-primary-btn-text: #FFFFFF;     // Botón primario texto
  --sigehu-search-bg: #0F172A;            // Buscador fondo
  --sigehu-border-divider: #334155;       // Bordes, divisores, inputs
  --sigehu-notification-dot: #EF4444;     // Indicador notificación
  --sigehu-avatar-bg: #3B82F6;            // Avatar fondo

  // -----------------------------------------------------------------------------
  // COLORES DASHBOARD - DASHBOARD_ANALISIS.md Paleta
  // -----------------------------------------------------------------------------
  --sigehu-dashboard-bg: #1E293B;         // Fondo dashboard
  --sigehu-card-bg: #0F172A;              // Fondo tarjeta Kanban
  --sigehu-card-border: #334155;          // Bordes tarjetas
  --sigehu-kpi-border: #334155;           // Borde tarjetas KPI

  // Estados Kanban - Puntos de color
  --sigehu-estado-solicitud: #94A3B8;     // Gris - Solicitud Recibida
  --sigehu-estado-levantamiento: #F59E0B; // Amarillo - Levantamiento
  --sigehu-estado-fabricacion: #3B82F6;   // Azul - En Fabricación
  --sigehu-estado-instalacion: #A855F7;   // Morado - Instalación Programada
  --sigehu-estado-instalado: #10B981;     // Verde - Instalado
  --sigehu-estado-garantias: #EF4444;     // Rojo - Garantías

  // Badges y etiquetas
  --sigehu-badge-pending-bg: #1E3A8A;     // Badge "+3 este mes" fondo
  --sigehu-badge-pending-text: #60A5FA;   // Badge "+3 este mes" texto
  --sigehu-badge-success-bg: #064E3B;     // Badge verde fondo
  --sigehu-badge-success-text: #10B981;   // Badge verde texto
  --sigehu-badge-warning-bg: #452703;     // Badge amarillo/pendiente fondo
  --sigehu-badge-warning-text: #F59E0B;   // Badge amarillo texto
  --sigehu-badge-danger-bg: #450A0A;      // Badge rojo/alta fondo
  --sigehu-badge-danger-text: #EF4444;    // Badge rojo texto

  // -----------------------------------------------------------------------------
  // SEMÁNTICOS (alias para uso en componentes)
  // -----------------------------------------------------------------------------
  --sigehu-accent: #3B82F6;
  --sigehu-accent-soft: rgba(59, 130, 246, 0.12);
  --sigehu-success: #10B981;
  --sigehu-success-soft: rgba(16, 185, 129, 0.14);
  --sigehu-warning: #F59E0B;
  --sigehu-warning-soft: rgba(245, 158, 11, 0.14);
  --sigehu-danger: #EF4444;
  --sigehu-danger-soft: rgba(239, 68, 68, 0.14);

  // -----------------------------------------------------------------------------
  // TIPOGRAFÍA
  // -----------------------------------------------------------------------------
  --sigehu-font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  --sigehu-font-size-xs: 10px;      // Etiquetas módulos, badges
  --sigehu-font-size-sm: 11px;      // IDs tareas, nombres usuario
  --sigehu-font-size-base: 12px;    // Subtítulos, fechas, badges
  --sigehu-font-size-md: 14px;      // Títulos tarjetas, columnas, métricas
  --sigehu-font-size-lg: 16px;      // Textos principales
  --sigehu-font-size-xl: 18px;      // Logo sidebar
  --sigehu-font-size-2xl: 24px;     // Título página, números KPI
  --sigehu-font-size-3xl: 32px;     // Números métricas grandes

  --sigehu-font-weight-regular: 400;
  --sigehu-font-weight-medium: 500;
  --sigehu-font-weight-semibold: 600;
  --sigehu-font-weight-bold: 700;

  --sigehu-line-height: 1.5;
  --sigehu-letter-spacing-wide: 0.05em;  // Etiquetas mayúsculas

  // -----------------------------------------------------------------------------
  // ESPACIADO (base 4px/8px)
  // -----------------------------------------------------------------------------
  --sigehu-space-1: 4px;
  --sigehu-space-2: 8px;
  --sigehu-space-3: 12px;
  --sigehu-space-4: 16px;
  --sigehu-space-5: 20px;
  --sigehu-space-6: 24px;
  --sigehu-space-8: 32px;
  --sigehu-space-10: 40px;

  // -----------------------------------------------------------------------------
  // BORDES Y RADIOS
  // -----------------------------------------------------------------------------
  --sigehu-radius-sm: 6px;
  --sigehu-radius-md: 8px;      // Botones, inputs, items menú
  --sigehu-radius-lg: 12px;     // Tarjetas KPI
  --sigehu-radius-xl: 14px;     // Contenedores grandes
  --sigehu-radius-pill: 999px;  // Badges pill
  --sigehu-border-width: 1px;
  --sigehu-border-color: var(--sigehu-border-divider);

  // -----------------------------------------------------------------------------
  // SOMBRAS (Flat design - sin sombras pronunciadas)
  // -----------------------------------------------------------------------------
  --sigehu-shadow-none: none;
  --sigehu-shadow-subtle: 0 1px 2px rgba(0, 0, 0, 0.1);

  // -----------------------------------------------------------------------------
  // LAYOUT DIMENSIONES
  // -----------------------------------------------------------------------------
  --sigehu-sidebar-width: 240px;
  --sigehu-sidebar-width-collapsed: 64px;
  --sigehu-topbar-height: 80px;
  --sigehu-kanban-column-width: 300px;
  --sigehu-kanban-gap: 16px;

  // -----------------------------------------------------------------------------
  // Z-INDEX
  // -----------------------------------------------------------------------------
  --sigehu-z-dropdown: 100;
  --sigehu-z-modal: 200;
  --sigehu-z-toast: 300;
  --sigehu-z-tooltip: 400;
}

// =============================================================================
// RESET GLOBAL BASE
// =============================================================================
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  font-size: 14px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--sigehu-font-family);
  font-size: var(--sigehu-font-size-md);
  line-height: var(--sigehu-line-height);
  color: var(--sigehu-text-primary);
  background-color: var(--sigehu-content-bg);
  min-height: 100vh;
}

// Scrollbar personalizado (dark mode)
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: var(--sigehu-sidebar-bg);
}
::-webkit-scrollbar-thumb {
  background: var(--sigehu-border-divider);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--sigehu-text-tertiary);
}

// Focus visible para accesibilidad
:focus-visible {
  outline: 2px solid var(--sigehu-accent);
  outline-offset: 2px;
}

// Selection
::selection {
  background: var(--sigehu-accent-soft);
  color: var(--sigehu-accent);
}
```

**Acción:** Crear archivo `src/theme/variables.scss` con el contenido arriba.

---

### 1.7 📝 EDIT: Actualizar `src/global.scss`

**Reemplazar COMPLETAMENTE el contenido de `src/global.scss` con:**

```scss
/*
 * App Global CSS - SIGEHU
 * Importa Ionic core + Design System variables
 */

// Core CSS required for Ionic components
@import "@ionic/angular/css/core.css";
@import "@ionic/angular/css/normalize.css";
@import "@ionic/angular/css/structure.css";
@import "@ionic/angular/css/typography.css";
@import "@ionic/angular/css/display.css";

// Optional CSS utils
@import "@ionic/angular/css/padding.css";
@import "@ionic/angular/css/float-elements.css";
@import "@ionic/angular/css/text-alignment.css";
@import "@ionic/angular/css/text-transformation.css";
@import "@ionic/angular/css/flex-utils.css";

// SIGEHU Design System Variables (DEBE ir antes que dark palette)
@import './theme/variables.scss';

/**
 * Ionic Dark Mode - Usar system para respetar preferencia OS
 * Nuestro design system ya define colores dark mode en :root
 */
@import '@ionic/angular/css/palettes/dark.system.css';

// Override Ionic CSS variables para usar nuestro design system
:root {
  // Mapear variables Ionic a nuestro design system
  --ion-background-color: var(--sigehu-content-bg);
  --ion-background-color-rgb: 30, 41, 59;
  --ion-text-color: var(--sigehu-text-primary);
  --ion-text-color-rgb: 248, 250, 252;
  --ion-primary: var(--sigehu-accent);
  --ion-primary-rgb: 59, 130, 246;
  --ion-primary-contrast: #FFFFFF;
  --ion-primary-contrast-rgb: 255, 255, 255;
  --ion-primary-shade: #2563EB;
  --ion-primary-tint: #60A5FA;
  --ion-secondary: var(--sigehu-text-tertiary);
  --ion-success: var(--sigehu-success);
  --ion-warning: var(--sigehu-warning);
  --ion-danger: var(--sigehu-danger);
  --ion-light: #F8FAFC;
  --ion-medium: #94A3B8;
  --ion-dark: #0F172A;
  --ion-border-color: var(--sigehu-border-divider);

  // Componentes Ionic
  --ion-item-background: transparent;
  --ion-input-background: var(--sigehu-search-bg);
  --ion-input-border-color: var(--sigehu-border-divider);
  --ion-input-border-color-focused: var(--sigehu-accent);
  --ion-button-border-radius: var(--sigehu-radius-md);
}
```

---

### 1.8 📝 EDIT: Verificar `angular.json` styles array

**Acción:** Abrir `angular.json` → línea 38 y 112 → confirmar que dice:
```json
"styles": ["src/global.scss", "src/theme/variables.scss"],
```
**Nota:** El orden importa: `global.scss` PRIMERO (importa variables al inicio), `variables.scss` segundo (disponible globalmente). Si ya está correcto → **NO CAMBIAR**.

---

### 1.9 ✅ VERIFY WAVE 1: Build Completo

```bash
npm run build
```
**Criterio de éxito:** Exit code 0, 0 errores TypeScript, 0 warnings de build.

**Si falla:** Leer error → fixear archivo indicado → re-ejecutar. **NO PASAR A WAVE 2 HASTA VERDE.**

---

## WAVE 2: LAYOUT PRINCIPAL - SIDEBAR + TOPBAR + MAINLAYOUT (Tareas 2.1 - 2.7)

### 2.1 📄 CREATE: `shared/components/layout/sidebar/`

**Crear 3 archivos:**

#### 2.1.1 `sidebar.component.ts`
```typescript
import { Component, computed, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

export interface NavItem {
  icon: string;      // SVG inline o nombre icono
  label: string;
  route: string;
  badge?: number;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  // Inputs
  activeRoute = input.required<string>();
  userName = input('Carlos Utrilla');
  userRole = input('Administrador');
  userInitials = input('CU');

  // Configuración navegación fija según LAYOUT_ANALISIS.md
  readonly navItems: NavItem[] = [
    { icon: 'dashboard', label: 'Dashboard', route: '/admin/dashboard' },
    { icon: 'projects', label: 'Proyectos', route: '/admin/proyectos' },
    { icon: 'budget', label: 'Presupuestos', route: '/admin/presupuestos' },
    { icon: 'inventory', label: 'Inventario', route: '/admin/inventario' },
    { icon: 'production', label: 'Producción', route: '/admin/produccion' },
    { icon: 'clients', label: 'Clientes', route: '/admin/clientes' },
  ];

  readonly settingsItem: NavItem = { icon: 'settings', label: 'Configuración', route: '/admin/configuracion' };

  isActive(route: string): boolean {
    return this.activeRoute().startsWith(route);
  }

  // SVG icons inline - copiar de LAYOUT_ANALISIS.md specs (outline, 20x20, stroke 1.5)
  getIconSvg(name: string): string {
    const icons: Record<string, string> = {
      dashboard: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
      projects: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
      budget: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      inventory: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
      production: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>',
      clients: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      settings: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    };
    return icons[name] || '';
  }
}
```

#### 2.1.2 `sidebar.component.html`
```html
<aside class="sidebar" [class.collapsed]="false">
  <!-- Logo Section -->
  <div class="sidebar-logo">
    <div class="logo-icon" aria-hidden="true">
      <!-- 3 capas superpuestas #3B82F6 según LAYOUT_ANALISIS.md -->
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="3" fill="#3B82F6" opacity="0.3"/>
        <rect x="5" y="5" width="14" height="14" rx="2" fill="#3B82F6" opacity="0.6"/>
        <rect x="8" y="8" width="8" height="8" rx="1" fill="#3B82F6"/>
      </svg>
    </div>
    <div class="logo-text">
      <h1 class="logo-title">SIGEHU</h1>
      <p class="logo-subtitle">Herrería Utrilla</p>
    </div>
  </div>

  <!-- Navigation Section -->
  <nav class="sidebar-nav" aria-label="Navegación principal">
    <div class="nav-section">
      <h2 class="nav-section-title">MÓDULOS</h2>
      <ul class="nav-list" role="list">
        @for (item of navItems; track item.route) {
          <li class="nav-item">
            <a
              [routerLink]="item.route"
              routerLinkActive="active"
              [routerLinkActiveOptions]="{ exact: item.route === '/admin/dashboard' }"
              class="nav-link"
              [class.active]="isActive(item.route)"
              (click)="onNavClick()"
            >
              <span class="nav-icon" [innerHTML]="getIconSvg(getIconName(item.icon))" aria-hidden="true"></span>
              <span class="nav-label">{{ item.label }}</span>
              @if (item.badge) {
                <span class="nav-badge">{{ item.badge }}</span>
              }
            </a>
          </li>
        }
      </ul>
    </div>

    <!-- Settings at bottom -->
    <div class="nav-section nav-section-bottom">
      <ul class="nav-list" role="list">
        <li class="nav-item">
          <a
            [routerLink]="settingsItem.route"
            routerLinkActive="active"
            class="nav-link"
            [class.active]="isActive(settingsItem.route)"
          >
            <span class="nav-icon" [innerHTML]="getIconSvg('settings')" aria-hidden="true"></span>
            <span class="nav-label">{{ settingsItem.label }}</span>
          </a>
        </li>
      </ul>
    </div>
  </nav>

  <!-- User Footer -->
  <div class="sidebar-footer">
    <div class="user-info">
      <div class="user-avatar" [style.background-color]="'var(--sigehu-avatar-bg)'">
        {{ userInitials() }}
      </div>
      <div class="user-details">
        <p class="user-name">{{ userName() }}</p>
        <p class="user-role">{{ userRole() }}</p>
      </div>
    </div>
  </div>
</aside>
```

#### 2.1.3 `sidebar.component.scss`
```scss
.sidebar {
  width: var(--sigehu-sidebar-width);
  height: 100vh;
  background: var(--sigehu-sidebar-bg);
  border-right: none;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  z-index: 100;
  overflow-y: auto;
  font-family: var(--sigehu-font-family);
}

/* Logo Section */
.sidebar-logo {
  padding: var(--sigehu-space-6) var(--sigehu-space-4) var(--sigehu-space-6);
  border-bottom: 1px solid var(--sigehu-border-divider);
}

.logo-icon {
  width: 24px;
  height: 24px;
  margin-bottom: var(--sigehu-space-3);
}

.logo-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.logo-title {
  margin: 0;
  font-size: var(--sigehu-font-size-xl);
  font-weight: var(--sigehu-font-weight-bold);
  color: var(--sigehu-text-primary);
  line-height: 1.2;
}

.logo-subtitle {
  margin: 0;
  font-size: var(--sigehu-font-size-xs);
  color: var(--sigehu-text-secondary);
  font-weight: var(--sigehu-font-weight-regular);
}

/* Navigation */
.sidebar-nav {
  flex: 1;
  padding: var(--sigehu-space-4);
  overflow-y: auto;
}

.nav-section {
  margin-bottom: var(--sigehu-space-6);
}

.nav-section-bottom {
  margin-top: auto;
  padding-top: var(--sigehu-space-6);
  border-top: 1px solid var(--sigehu-border-divider);
}

.nav-section-title {
  margin: 0 0 var(--sigehu-space-3) var(--sigehu-space-4);
  font-size: var(--sigehu-font-size-xs);
  font-weight: var(--sigehu-font-weight-bold);
  text-transform: uppercase;
  letter-spacing: var(--sigehu-letter-spacing-wide);
  color: var(--sigehu-text-tertiary);
}

.nav-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sigehu-space-2);
}

.nav-item {
  margin: 0;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: var(--sigehu-space-3);
  padding: var(--sigehu-space-2) var(--sigehu-space-4);
  border-radius: var(--sigehu-radius-md);
  color: var(--sigehu-text-secondary);
  text-decoration: none;
  font-size: var(--sigehu-font-size-md);
  font-weight: var(--sigehu-font-weight-regular);
  transition: background-color 0.15s ease, color 0.15s ease;
  min-height: 44px;
}

.nav-link:hover {
  background: var(--sigehu-active-bg);
  color: var(--sigehu-active-text);
}

.nav-link.active {
  background: var(--sigehu-active-bg);
  color: var(--sigehu-active-text);
  font-weight: var(--sigehu-font-weight-medium);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: currentColor;
}

.nav-icon svg {
  width: 100%;
  height: 100%;
}

.nav-label {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-badge {
  background: var(--sigehu-accent);
  color: var(--sigehu-primary-btn-text);
  font-size: var(--sigehu-font-size-xs);
  font-weight: var(--sigehu-font-weight-bold);
  padding: 1px 6px;
  border-radius: var(--sigehu-radius-pill);
  min-width: 18px;
  text-align: center;
}

/* User Footer */
.sidebar-footer {
  padding: var(--sigehu-space-4);
  border-top: 1px solid var(--sigehu-border-divider);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--sigehu-space-3);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-size: var(--sigehu-font-size-xs);
  font-weight: var(--sigehu-font-weight-bold);
  flex-shrink: 0;
}

.user-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  margin: 0;
  font-size: var(--sigehu-font-size-sm);
  font-weight: var(--sigehu-font-weight-medium);
  color: var(--sigehu-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  margin: 0;
  font-size: var(--sigehu-font-size-xs);
  color: var(--sigehu-text-tertiary);
  font-weight: var(--sigehu-font-weight-regular);
}

/* Scrollbar */
.sidebar-nav::-webkit-scrollbar {
  width: 6px;
}
.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}
.sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--sigehu-border-divider);
  border-radius: 3px;
}
```

---

### 2.2 📄 CREATE: `shared/components/layout/topbar/`

#### 2.2.1 `topbar.component.ts`
```typescript
import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OmniboxComponent } from '../omnibox/omnibox.component'; // Ajustar path según barrel

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
```

#### 2.2.2 `topbar.component.html`
```html
<header class="topbar" role="banner">
  <div class="topbar-left">
    <h1 class="page-title">{{ pageTitle() }}</h1>
    @if (pageSubtitle()) {
      <p class="page-subtitle">{{ pageSubtitle() }}</p>
    }
  </div>

  <div class="topbar-right">
    <!-- Buscador Global (Omnibox) - RF-31 -->
    <app-omnibox
      placeholder="Buscar obras, clientes, proveedores..."
      [keyboardShortcut]="'⌘K'"
      (search)="onSearchChange($event)"
      class="topbar-search"
    ></app-omnibox>

    <!-- Notificaciones -->
    <button
      class="icon-btn notification-btn"
      (click)="onNotification()"
      aria-label="Notificaciones"
      type="button"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      @if (notificationCount() > 0) {
        <span class="notification-dot" aria-label="{{ notificationCount() }} notificaciones"></span>
      }
    </button>

    <!-- Botón Nueva Obra -->
    <button
      class="btn btn-primary new-work-btn"
      (click)="onNewWork()"
      type="button"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>Nueva obra</span>
    </button>

    <!-- Avatar Usuario -->
    <div class="user-menu" (click)="onProfile()">
      <div class="user-avatar" [style.background-color]="'var(--sigehu-avatar-bg)'">
        {{ userInitials() }}
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="chevron-down" aria-hidden="true">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </div>
  </div>
</header>
```

#### 2.2.3 `topbar.component.scss`
```scss
.topbar {
  height: var(--sigehu-topbar-height);
  background: var(--sigehu-topbar-bg);
  border-bottom: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--sigehu-space-6);
  position: sticky;
  top: 0;
  z-index: 50;
  font-family: var(--sigehu-font-family);
  margin-left: var(--sigehu-sidebar-width);
  width: calc(100% - var(--sigehu-sidebar-width));
  box-sizing: border-box;
}

.topbar-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  min-width: 0;
}

.page-title {
  margin: 0;
  font-size: var(--sigehu-font-size-2xl);
  font-weight: var(--sigehu-font-weight-bold);
  color: var(--sigehu-text-primary);
  letter-spacing: 0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-subtitle {
  margin: 0;
  font-size: var(--sigehu-font-size-md);
  font-weight: var(--sigehu-font-weight-regular);
  color: var(--sigehu-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--sigehu-space-4);
  flex-shrink: 0;
}

/* Buscador */
.topbar-search {
  width: 320px;
  max-width: 40vw;
}

:host ::ng-deep .topbar-search .omnibox-input {
  background: var(--sigehu-search-bg);
  border: var(--sigehu-border-width) solid var(--sigehu-border-divider);
  border-radius: var(--sigehu-radius-md);
  color: var(--sigehu-text-primary);
  padding: var(--sigehu-space-2) var(--sigehu-space-3) var(--sigehu-space-2) var(--sigehu-space-5);
  font-size: var(--sigehu-font-size-md);
  width: 100%;
  height: 40px;
}

:host ::ng-deep .topbar-search .omnibox-input::placeholder {
  color: var(--sigehu-text-secondary);
}

:host ::ng-deep .topbar-search .omnibox-input:focus {
  border-color: var(--sigehu-accent);
  outline: none;
}

:host ::ng-deep .topbar-search .omnibox-icon {
  color: var(--sigehu-text-tertiary);
}

:host ::ng-deep .topbar-search .omnibox-shortcut {
  background: var(--sigehu-search-bg);
  border: var(--sigehu-border-width) solid var(--sigehu-border-divider);
  border-radius: var(--sigehu-radius-sm);
  font-size: var(--sigehu-font-size-xs);
  color: var(--sigehu-text-tertiary);
  padding: 2px 6px;
  margin-left: var(--sigehu-space-2);
}

/* Icon Button */
.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  border-radius: var(--sigehu-radius-md);
  color: var(--sigehu-text-secondary);
  cursor: pointer;
  position: relative;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.icon-btn:hover {
  background: var(--sigehu-active-bg);
  color: var(--sigehu-active-text);
}

.icon-btn svg {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.notification-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sigehu-notification-dot);
  border: 2px solid var(--sigehu-topbar-bg);
}

/* Botón Primario */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sigehu-space-2);
  padding: var(--sigehu-space-2) var(--sigehu-space-4);
  border-radius: var(--sigehu-radius-md);
  font-size: var(--sigehu-font-size-md);
  font-weight: var(--sigehu-font-weight-medium);
  border: none;
  cursor: pointer;
  transition: filter 0.15s ease, opacity 0.15s ease;
  white-space: nowrap;
  height: 40px;
}

.btn-primary {
  background: var(--sigehu-primary-btn-bg);
  color: var(--sigehu-primary-btn-text);
}

.btn-primary:hover {
  filter: brightness(1.1);
}

.btn-primary:active {
  filter: brightness(0.95);
}

.btn-primary svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* User Menu */
.user-menu {
  display: flex;
  align-items: center;
  gap: var(--sigehu-space-2);
  cursor: pointer;
  padding: var(--sigehu-space-1) var(--sigehu-space-2);
  border-radius: var(--sigehu-radius-md);
  transition: background-color 0.15s ease;
}

.user-menu:hover {
  background: var(--sigehu-active-bg);
}

.user-menu .user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-size: var(--sigehu-font-size-xs);
  font-weight: var(--sigehu-font-weight-bold);
  flex-shrink: 0;
}

.user-menu .chevron-down {
  color: var(--sigehu-text-tertiary);
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 1024px) {
  .topbar {
    margin-left: 0;
    width: 100%;
    padding: 0 var(--sigehu-space-4);
  }

  .topbar-search {
    display: none; // En móvil se usa omnibox full-screen
  }

  .page-title {
    font-size: var(--sigehu-font-size-xl);
  }
}
```

---

### 2.3 📄 CREATE: `shared/components/layout/main-layout/`

#### 2.3.1 `main-layout.component.ts`
```typescript
import { Component, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';
import { filter } from 'rxjs/operators';

interface PageConfig {
  title: string;
  subtitle: string;
}

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent],
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
    '/admin/trabajadores': { title: 'Trabajadores', subtitle: 'Gestión de personal y permisos' },
    '/admin/trabajadores/nuevo': { title: 'Nuevo Trabajador', subtitle: 'Registro de personal' },
    '/admin/clientes': { title: 'Clientes', subtitle: 'Gestión de clientes y contactos' },
    '/admin/clientes/form': { title: 'Nuevo Cliente', subtitle: 'Registro de cliente' },
    '/admin/clientes/editar': { title: 'Editar Cliente', subtitle: 'Modificar datos de cliente' },
    '/admin/proveedores': { title: 'Proveedores', subtitle: 'Catálogo de proveedores' },
    '/admin/proveedores/nuevo': { title: 'Nuevo Proveedor', subtitle: 'Registro de proveedor' },
    '/admin/calendario': { title: 'Calendario Operativo', subtitle: 'Programación de actividades' },
    '/admin/calendario/agendar': { title: 'Agendar Actividad', subtitle: 'Nueva cita programada' },
    '/admin/catalogo': { title: 'Catálogo de Insumos', subtitle: 'Materiales y suministros' },
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

  onNotification(): void {
    // TODO: Abrir panel notificaciones
    console.log('Notifications clicked');
  }

  onProfile(): void {
    // TODO: Abrir dropdown perfil
    console.log('Profile clicked');
  }
}
```

#### 2.3.2 `main-layout.component.html`
```html
<div class="main-layout">
  <!-- Sidebar -->
  <app-sidebar
    [activeRoute]="currentRoute()"
    [userName]="'Carlos Utrilla'"
    [userRole]="'Administrador'"
    [userInitials]="'CU'"
  ></app-sidebar>

  <!-- Content Wrapper -->
  <div class="content-wrapper">
    <!-- Topbar -->
    <app-topbar
      [pageTitle]="pageConfig.title"
      [pageSubtitle]="pageConfig.subtitle"
      [userInitials]="'CU'"
      [notificationCount]="0"
      (newWorkClick)="onNewWork()"
      (notificationClick)="onNotification()"
      (profileClick)="onProfile()"
    ></app-topbar>

    <!-- Main Content -->
    <main class="main-content" role="main">
      <router-outlet></router-outlet>
    </main>
  </div>

  <!-- Toast Container (global) -->
  <app-toast-container></app-toast-container>
</div>
```

#### 2.3.3 `main-layout.component.scss`
```scss
.main-layout {
  min-height: 100vh;
  display: flex;
  background: var(--sigehu-content-bg);
  font-family: var(--sigehu-font-family);
}

.content-wrapper {
  flex: 1;
  margin-left: var(--sigehu-sidebar-width);
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--sigehu-content-bg);
}

.main-content {
  flex: 1;
  padding: var(--sigehu-space-6) var(--sigehu-space-8);
  min-height: calc(100vh - var(--sigehu-topbar-height));
  overflow-y: auto;

  // Container max-width para contenido centrado
  > * {
    max-width: 1400px;
    margin: 0 auto;
    width: 100%;
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .content-wrapper {
    margin-left: 0;
  }

  .main-content {
    padding: var(--sigehu-space-4) var(--sigehu-space-4);
  }
}

/* Animación suave para router-outlet */
.main-content :host-context(.main-content) {
  animation: fadeIn 0.2s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}
```

---

### 2.4 📝 EDIT: Integrar Omnibox en Topbar

**Verificar que `shared/components/omnibox/omnibox.component.ts` existe y tiene:**
- `@Input() placeholder: string`
- `@Input() keyboardShortcut: string`
- `@Output() search = new EventEmitter<string>()`
- Template con input + icono lupa + shortcut

**Si NO existe o incompleto:** Crear/actualizar `shared/components/omnibox/` con implementación completa (ver specs en LAYOUT_ANALISIS.md líneas 90-97).

**Acción requerida:**
1. Abrir `shared/components/omnibox/omnibox.component.ts` → verificar exports
2. Abrir `shared/components/omnibox/omnibox.component.html` → verificar estructura
3. Abrir `shared/components/omnibox/omnibox.component.scss` → usar variables `--sigehu-*`
4. Exportar en barrel file si existe `shared/components/index.ts`

---

### 2.5 📝 EDIT: Actualizar `app.component.html`

**Reemplazar COMPLETAMENTE contenido:**

```html
<app-main-layout></app-main-layout>
```

---

### 2.6 📝 EDIT: Actualizar `app.component.ts` (remover import ToastContainer si estaba)

**Verificar que `app.component.ts` NO importe `ToastContainerComponent`** (ahora está en MainLayout).

---

### 2.7 ✅ VERIFY WAVE 2: Build + Verificación Visual

```bash
npm run build
```

**Criterios de éxito:**
1. Exit code 0
2. Navegar a `http://localhost:4200/admin/dashboard` → Ver sidebar fija 240px, topbar 80px, contenido con padding
3. Navegar entre rutas Admin → Topbar actualiza título/subtítulo correctamente
4. Sidebar items tienen hover/active states correctos
5. Buscador (omnibox) visible en topbar
6. Botón "Nueva obra" visible
7. Avatar usuario visible en topbar y sidebar

**Si falla:** Fixear → re-build. **NO PASAR A WAVE 3 HASTA VERDE.**

---

## WAVE 3: DASHBOARD - KPIs + TABS + KANBAN (Tareas 3.1 - 3.9)

### 3.1 📝 EDIT: Refactorizar `shared/components/kpi-card/`

#### 3.1.1 `kpi-card.component.ts` - Actualizar para 2 variantes
```typescript
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type KpiVariant = 'primary' | 'secondary';

@Component({
  selector: 'app-kpi-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kpi-card.component.html',
  styleUrl: './kpi-card.component.scss'
})
export class KpiCardComponent {
  // Inputs requeridos
  value = input.required<string | number>();
  label = input.required<string>();
  iconSvg = input.required<string>();
  iconBgColor = input.required<string>();
  iconColor = input.required<string>();

  // Variante: 'primary' (ancha 40-45%) o 'secondary' (normal)
  variant = input<KpiVariant>('secondary');

  // Badge opcional
  badgeText = input<string>('');
  badgeColor = input<'success' | 'warning' | 'info'>('info');

  get badgeClass(): string {
    return `kpi-badge--${this.badgeColor()}`;
  }

  get containerClass(): string {
    return `kpi-card kpi-card--${this.variant()}`;
  }
}
```

#### 3.1.2 `kpi-card.component.html`
```html
<div class="{{ containerClass }}">
  <div class="kpi-card__icon" [style.background-color]="iconBgColor()" [style.color]="iconColor()" [innerHTML]="iconSvg()" aria-hidden="true"></div>
  <div class="kpi-card__content">
    <p class="kpi-card__value">{{ value() }}</p>
    <p class="kpi-card__label">{{ label() }}</p>
  </div>
  @if (badgeText()) {
    <span class="kpi-badge {{ badgeClass }}">{{ badgeText() }}</span>
  }
</div>
```

#### 3.1.3 `kpi-card.component.scss` - Estilos exactos DASHBOARD_ANALISIS.md
```scss
.kpi-card {
  background: var(--sigehu-dashboard-bg);
  border: var(--sigehu-border-width) solid var(--sigehu-kpi-border);
  border-radius: var(--sigehu-radius-lg);
  padding: var(--sigehu-space-6);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sigehu-space-4);
  min-width: 220px;
  position: relative;
  overflow: hidden;
  flex: 1;
}

.kpi-card--primary {
  max-width: 45%;
  flex: 0 0 45%;
}

.kpi-card--secondary {
  max-width: 320px;
  flex: 1;
}

.kpi-card__icon {
  width: 48px;
  height: 48px;
  border-radius: var(--sigehu-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.kpi-card__icon svg {
  width: 24px;
  height: 24px;
}

.kpi-card__content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.kpi-card__value {
  margin: 0 0 var(--sigehu-space-1);
  font-size: var(--sigehu-font-size-3xl);
  font-weight: var(--sigehu-font-weight-bold);
  color: var(--sigehu-text-primary);
  line-height: 1.1;
  letter-spacing: -0.02em;
}

.kpi-card__label {
  margin: 0;
  font-size: var(--sigehu-font-size-md);
  color: var(--sigehu-text-secondary);
  font-weight: var(--sigehu-font-weight-regular);
}

.kpi-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--sigehu-font-size-xs);
  font-weight: var(--sigehu-font-weight-bold);
  padding: var(--sigehu-space-1) var(--sigehu-space-3);
  border-radius: var(--sigehu-radius-pill);
  white-space: nowrap;
  align-self: flex-start;
  margin-top: auto;
}

.kpi-badge--info {
  background: var(--sigehu-badge-pending-bg);
  color: var(--sigehu-badge-pending-text);
}

.kpi-badge--success {
  background: var(--sigehu-badge-success-bg);
  color: var(--sigehu-badge-success-text);
}

.kpi-badge--warning {
  background: var(--sigehu-badge-warning-bg);
  color: var(--sigehu-badge-warning-text);
}

/* Icono flecha para badge success */
.kpi-badge--success::before {
  content: '';
  display: inline-block;
  width: 8px;
  height: 8px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%2310B981' stroke-width='2'%3E%3Cpolyline points='18 15 12 9 6 15'/%3E%3C/svg%3E");
  background-size: contain;
  margin-right: 2px;
}

/* Responsive */
@media (max-width: 768px) {
  .kpi-card--primary {
    max-width: 100%;
    flex: 1;
  }
}
```

---

### 3.2 📄 CREATE: `shared/components/dashboard/tabs/`

#### 3.2.1 `dashboard-tabs.component.ts`
```typescript
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';

export type DashboardTab = 'kanban' | 'calendar' | 'assigned';

@Component({
  selector: 'app-dashboard-tabs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-tabs.component.html',
  styleUrl: './dashboard-tabs.component.scss'
})
export class DashboardTabsComponent {
  activeTab = input.required<DashboardTab>();
  tabChange = output<DashboardTab>();

  readonly tabs: { key: DashboardTab; label: string; icon: string }[] = [
    { key: 'kanban', label: 'Kanban', icon: 'kanban' },
    { key: 'calendar', label: 'Calendario', icon: 'calendar' },
    { key: 'assigned', label: 'Trabajos asignados', icon: 'assigned' },
  ];

  onTabClick(tab: DashboardTab): void {
    this.tabChange.emit(tab);
  }
}
```

#### 3.2.2 `dashboard-tabs.component.html`
```html
<nav class="dashboard-tabs" role="tablist" aria-label="Vistas del dashboard">
  @for (tab of tabs; track tab.key) {
    <button
      role="tab"
      [attr.aria-selected]="activeTab() === tab.key"
      [class]="tabClass(tab.key)"
      (click)="onTabClick(tab.key)"
      class="tab-btn"
    >
      <span class="tab-icon" [innerHTML]="getIconSvg(tab.icon)" aria-hidden="true"></span>
      <span class="tab-label">{{ tab.label }}</span>
    </button>
  }
</nav>
```

#### 3.2.3 `dashboard-tabs.component.scss`
```scss
.dashboard-tabs {
  display: flex;
  align-items: center;
  gap: var(--sigehu-space-2);
  margin-bottom: var(--sigehu-space-6);
  padding-bottom: var(--sigehu-space-3);
  border-bottom: var(--sigehu-border-width) solid var(--sigehu-border-divider);
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--sigehu-space-2);
  padding: var(--sigehu-space-2) var(--sigehu-space-4);
  border: none;
  background: transparent;
  border-radius: var(--sigehu-radius-md);
  font-size: var(--sigehu-font-size-md);
  font-weight: var(--sigehu-font-weight-medium);
  color: var(--sigehu-text-secondary);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  white-space: nowrap;
}

.tab-btn:hover {
  background: var(--sigehu-active-bg);
  color: var(--sigehu-active-text);
}

.tab-btn.active {
  background: var(--sigehu-border-divider);
  color: var(--sigehu-text-primary);
}

.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: currentColor;
}

.tab-icon svg {
  width: 100%;
  height: 100%;
}

/* SVG Icons */
.tab-btn[aria-selected="true"] .tab-icon::before {
  // Kanban active: cuadrícula blanca
  content: '';
  width: 16px;
  height: 16px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23FFFFFF' stroke-width='2'%3E%3Crect x='3' y='3' width='7' height='7' rx='1'/%3E%3Crect x='14' y='3' width='7' height='7' rx='1'/%3E%3Crect x='3' y='14' width='7' height='7' rx='1'/%3E%3Crect x='14' y='14' width='7' height='7' rx='1'/%3E%3C/svg%3E");
  background-size: contain;
}

.tab-btn:not([aria-selected="true"]) .tab-icon::before {
  // Inactive: outline icons
}
```

---

### 3.3 📝 EDIT: Refactorizar `shared/components/kanban/kanban-board.component.ts`

```typescript
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanColumnComponent } from '../kanban-column/kanban-column.component';

export interface KanbanColumnData {
  id: string;
  title: string;
  color: string; // hex color para el punto indicador
  cards: KanbanCardData[];
}

export interface KanbanCardData {
  id: string | number;
  code: string; // ej. "C1"
  client: string;
  title: string;
  badges: KanbanBadge[];
  date: string;
  avatarInitials: string;
  avatarColor: string;
  assigneeName: string;
}

export interface KanbanBadge {
  text: string;
  type: 'pending' | 'done' | 'high' | 'reported' | 'in_progress' | 'resolved';
}

@Component({
  selector: 'app-kanban-board',
  standalone: true,
  imports: [CommonModule, KanbanColumnComponent],
  templateUrl: './kanban-board.component.html',
  styleUrl: './kanban-board.component.scss'
})
export class KanbanBoardComponent {
  columns = input.required<KanbanColumnData[]>();
  cardClick = output<KanbanCardData>();
  addCardClick = output<string>(); // columnId

  onCardClick(card: KanbanCardData): void {
    this.cardClick.emit(card);
  }

  onAddCard(columnId: string): void {
    this.addCardClick.emit(columnId);
  }
}
```

#### `kanban-board.component.html`
```html
<div class="kanban-board" role="region" aria-label="Tablero Kanban">
  @for (column of columns(); track column.id) {
    <app-kanban-column
      [column]="column"
      (cardClick)="onCardClick($event)"
      (addCardClick)="onAddCard($event)"
    ></app-kanban-column>
  }
</div>
```

#### `kanban-board.component.scss`
```scss
.kanban-board {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: var(--sigehu-kanban-column-width);
  gap: var(--sigehu-kanban-gap);
  align-items: start;
  overflow-x: auto;
  padding-bottom: var(--sigehu-space-4);
  margin: calc(var(--sigehu-space-4) * -1) calc(var(--sigehu-space-8) * -1);
  padding: 0 var(--sigehu-space-8) var(--sigehu-space-4);

  // Scrollbar
  &::-webkit-scrollbar {
    height: 8px;
  }
  &::-webkit-scrollbar-track {
    background: var(--sigehu-content-bg);
  }
  &::-webkit-scrollbar-thumb {
    background: var(--sigehu-border-divider);
    border-radius: 4px;
  }
}
```

---

### 3.4 📝 EDIT: Refactorizar `shared/components/kanban/kanban-column.component.ts`

```typescript
import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanCardComponent } from '../kanban-card/kanban-card.component';
import { KanbanColumnData, KanbanCardData } from '../kanban-board/kanban-board.component';

@Component({
  selector: 'app-kanban-column',
  standalone: true,
  imports: [CommonModule, KanbanCardComponent],
  templateUrl: './kanban-column.component.html',
  styleUrl: './kanban-column.component.scss'
})
export class KanbanColumnComponent {
  column = input.required<KanbanColumnData>();
  cardClick = output<KanbanCardData>();
  addCardClick = output<string>();

  onCardClick(card: KanbanCardData): void {
    this.cardClick.emit(card);
  }

  onAddCard(): void {
    this.addCardClick.emit(this.column().id);
  }
}
```

#### `kanban-column.component.html`
```html
<div class="kanban-column" [attr.data-estado]="column().id">
  <header class="column-header">
    <h3 class="column-title">
      <span class="column-dot" [style.background-color]="column().color" aria-hidden="true"></span>
      {{ column().title }}
    </h3>
    <div class="column-actions">
      <span class="column-count">{{ column().cards.length }}</span>
      <button class="column-add-btn" (click)="onAddCard()" type="button" aria-label="Añadir tarea">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <line x1="12" y1="5" x2="12" y2="19"/>
          <line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
      </button>
    </div>
  </header>

  <div class="column-cards" role="list">
    @if (column().cards.length === 0) {
      <div class="empty-column" role="status">
        Sin tareas
      </div>
    } @else {
      @for (card of column().cards; track card.id) {
        <app-kanban-card
          [card]="card"
          (click)="onCardClick(card)"
          role="listitem"
          tabindex="0"
        ></app-kanban-card>
      }
    }
  </div>

  <button class="add-task-btn" (click)="onAddCard()" type="button">
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
    + Agregar tarea
  </button>
</div>
```

#### `kanban-column.component.scss`
```scss
.kanban-column {
  background: var(--sigehu-dashboard-bg);
  border: var(--sigehu-border-width) solid var(--sigehu-border-divider);
  border-radius: var(--sigehu-radius-md);
  padding: var(--sigehu-space-3);
  min-height: 200px;
  display: flex;
  flex-direction: column;
  gap: var(--sigehu-space-3);
  width: var(--sigehu-kanban-column-width);
  flex-shrink: 0;
}

.column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--sigehu-space-1) var(--sigehu-space-2) var(--sigehu-space-3);
  border-bottom: var(--sigehu-border-width) solid var(--sigehu-border-divider);
}

.column-title {
  display: flex;
  align-items: center;
  gap: var(--sigehu-space-2);
  margin: 0;
  font-size: var(--sigehu-font-size-md);
  font-weight: var(--sigehu-font-weight-bold);
  color: var(--sigehu-text-primary);
  text-transform: capitalize;
}

.column-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.column-actions {
  display: flex;
  align-items: center;
  gap: var(--sigehu-space-2);
}

.column-count {
  background: var(--sigehu-card-bg);
  color: var(--sigehu-text-tertiary);
  font-size: var(--sigehu-font-size-xs);
  font-weight: var(--sigehu-font-weight-bold);
  padding: 2px 8px;
  border-radius: var(--sigehu-radius-pill);
  border: var(--sigehu-border-width) solid var(--sigehu-border-divider);
  min-width: 24px;
  text-align: center;
}

.column-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: transparent;
  border: none;
  border-radius: var(--sigehu-radius-sm);
  color: var(--sigehu-text-tertiary);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.column-add-btn:hover {
  background: var(--sigehu-active-bg);
  color: var(--sigehu-active-text);
}

.column-cards {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--sigehu-space-3);
  min-height: 100px;
  overflow-y: auto;
  padding-right: var(--sigehu-space-1);
}

.empty-column {
  color: var(--sigehu-text-tertiary);
  font-size: var(--sigehu-font-size-sm);
  text-align: center;
  padding: var(--sigehu-space-4) var(--sigehu-space-2);
  border: var(--sigehu-border-width) dashed var(--sigehu-border-divider);
  border-radius: var(--sigehu-radius-md);
}

.add-task-btn {
  display: flex;
  align-items: center;
  gap: var(--sigehu-space-2);
  width: 100%;
  padding: var(--sigehu-space-2);
  background: transparent;
  border: none;
  border-radius: var(--sigehu-radius-md);
  font-size: var(--sigehu-font-size-sm);
  font-weight: var(--sigehu-font-weight-medium);
  color: var(--sigehu-text-tertiary);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
  margin-top: auto;
}

.add-task-btn:hover {
  background: var(--sigehu-active-bg);
  color: var(--sigehu-active-text);
}

.add-task-btn svg {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
}

/* Columna Garantías - colores especiales */
.kanban-column[data-estado="garantias"] .column-count,
.kanban-column[data-estado="garantias"] .column-title {
  color: var(--sigehu-estado-garantias);
}
```

---

### 3.5 📝 EDIT: Refactorizar `shared/components/kanban/kanban-card.component.ts`

```typescript
import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KanbanCardData, KanbanBadge } from '../kanban-board/kanban-board.component';

@Component({
  selector: 'app-kanban-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './kanban-card.component.html',
  styleUrl: './kanban-card.component.scss'
})
export class KanbanCardComponent {
  card = input.required<KanbanCardData>();

  getBadgeClass(type: KanbanBadge['type']): string {
    return `card-badge card-badge--${type}`;
  }
}
```

#### `kanban-card.component.html`
```html
<article class="kanban-card" tabindex="0" role="button" aria-label="Ver detalles de {{ card().title }}">
  <div class="card-header">
    <span class="card-id">{{ card().code }}</span>
    @if (card().badges.length > 0) {
      <div class="card-badges-top">
        @for (badge of card().badges; track badge.text) {
          <span class="{{ getBadgeClass(badge.type) }}">{{ badge.text }}</span>
        }
      </div>
    }
  </div>

  <p class="card-client">{{ card().client }}</p>
  <h4 class="card-title">{{ card().title }}</h4>

  @if (card().badges.length > 0) {
    <div class="card-badges-bottom">
      @for (badge of card().badges; track badge.text) {
        <span class="{{ getBadgeClass(badge.type) }}">{{ badge.text }}</span>
      }
    </div>
  }

  <footer class="card-footer">
    <div class="card-date">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
      {{ card().date }}
    </div>
    <div class="card-assignee">
      <div class="assignee-avatar" [style.background-color]="card().avatarColor">
        {{ card().avatarInitials }}
      </div>
      <span class="assignee-name">{{ card().assigneeName }}</span>
    </div>
  </footer>
</article>
```

#### `kanban-card.component.scss`
```scss
.kanban-card {
  background: var(--sigehu-card-bg);
  border: var(--sigehu-border-width) solid var(--sigehu-card-border);
  border-radius: var(--sigehu-radius-md);
  padding: var(--sigehu-space-4);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease;
  display: flex;
  flex-direction: column;
  gap: var(--sigehu-space-2);
}

.kanban-card:hover {
  background: var(--sigehu-dashboard-bg);
  border-color: var(--sigehu-accent);
  transform: translateY(-1px);
}

.kanban-card:focus-visible {
  outline: 2px solid var(--sigehu-accent);
  outline-offset: 2px;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sigehu-space-2);
}

.card-id {
  font-size: var(--sigehu-font-size-xs);
  color: var(--sigehu-text-tertiary);
  font-weight: var(--sigehu-font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  flex-shrink: 0;
  margin-top: 1px;
}

.card-badges-top,
.card-badges-bottom {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sigehu-space-2);
}

.card-client {
  margin: 0;
  font-size: var(--sigehu-font-size-xs);
  color: var(--sigehu-text-secondary);
  font-weight: var(--sigehu-font-weight-regular);
  text-transform: capitalize;
}

.card-title {
  margin: 0;
  font-size: var(--sigehu-font-size-md);
  font-weight: var(--sigehu-font-weight-bold);
  color: var(--sigehu-text-primary);
  line-height: 1.3;
}

/* Badges */
.card-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: var(--sigehu-font-size-xs);
  font-weight: var(--sigehu-font-weight-bold);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 2px 8px;
  border-radius: var(--sigehu-radius-pill);
  border: var(--sigehu-border-width) solid transparent;
}

.card-badge--pending {
  background: var(--sigehu-badge-warning-bg);
  color: var(--sigehu-badge-warning-text);
  border-color: #854D0E; // amarillo oscuro
}

.card-badge--done,
.card-badge--resolved {
  background: var(--sigehu-badge-success-bg);
  color: var(--sigehu-badge-success-text);
  border-color: #065F46; // verde oscuro
}

.card-badge--in_progress {
  background: var(--sigehu-badge-warning-bg);
  color: var(--sigehu-badge-warning-text);
  border-color: #854D0E;
}

.card-badge--reported {
  background: var(--sigehu-badge-danger-bg);
  color: var(--sigehu-badge-danger-text);
  border-color: #7F1D1D; // rojo oscuro
}

.card-badge--high {
  background: var(--sigehu-badge-danger-bg);
  color: var(--sigehu-badge-danger-text);
  border-color: #7F1D1D;
  // Flecha hacia arriba
  &::after {
    content: '';
    display: inline-block;
    width: 8px;
    height: 8px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 24 24' fill='none' stroke='%23EF4444' stroke-width='2'%3E%3Cpolyline points='18 15 12 9 6 15'/%3E%3C/svg%3E");
    background-size: contain;
    margin-left: 3px;
  }
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--sigehu-space-2);
  padding-top: var(--sigehu-space-3);
  border-top: var(--sigehu-border-width) solid var(--sigehu-card-border);
}

.card-date {
  display: flex;
  align-items: center;
  gap: var(--sigehu-space-1);
  font-size: var(--sigehu-font-size-xs);
  color: var(--sigehu-text-tertiary);
  font-weight: var(--sigehu-font-weight-medium);
}

.card-date svg {
  color: var(--sigehu-text-tertiary);
  opacity: 0.7;
  flex-shrink: 0;
}

.card-assignee {
  display: flex;
  align-items: center;
  gap: var(--sigehu-space-2);
}

.assignee-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-size: var(--sigehu-font-size-xs);
  font-weight: var(--sigehu-font-weight-bold);
  flex-shrink: 0;
}

.assignee-name {
  font-size: var(--sigehu-font-size-xs);
  color: var(--sigehu-text-secondary);
  font-weight: var(--sigehu-font-weight-regular);
}
```

---

### 3.6 📝 EDIT: Actualizar `pages/Admin/dashboard/dashboard.component.ts`

**Reemplazar COMPLETAMENTE el contenido:**

```typescript
import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KpiCardComponent } from '../../../shared/components/kpi-card/kpi-card.component';
import { DashboardTabsComponent, DashboardTab } from '../../../shared/components/dashboard/tabs/dashboard-tabs.component';
import { KanbanBoardComponent, KanbanColumnData, KanbanCardData } from '../../../shared/components/kanban/kanban-board/kanban-board.component';
import { ActivityFeedComponent } from '../../../shared/components/activity-feed/activity-feed.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    KpiCardComponent,
    DashboardTabsComponent,
    KanbanBoardComponent,
    ActivityFeedComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  // Estado UI
  activeTab = signal<DashboardTab>('kanban');

  // Datos mock - TODO: Conectar a servicio real
  readonly kpiData = signal([
    {
      value: 12,
      label: 'Total de Obras Activas',
      iconSvg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
      iconBgColor: '#1E3A8A',
      iconColor: '#3B82F6',
      variant: 'primary' as const,
      badgeText: '+3 este mes',
      badgeColor: 'info' as const,
    },
    {
      value: 3,
      label: 'Finalizadas este Mes',
      iconSvg: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 6 9 17 4 12"/></svg>',
      iconBgColor: '#064E3B',
      iconColor: '#10B981',
      variant: 'secondary' as const,
      badgeText: '↑ 25% vs jun',
      badgeColor: 'success' as const,
    }
  ]);

  readonly kanbanColumns = signal<KanbanColumnData[]>([
    {
      id: 'solicitud',
      title: 'Solicitud Recibida',
      color: '#94A3B8',
      cards: [
        { id: 1, code: 'C1', client: 'Residencial Alvento', title: 'Cancel Principal Baño', badges: [], date: '28 Jul 2024', avatarInitials: 'CU', avatarColor: '#7C3AED', assigneeName: 'C. Utrilla' },
        { id: 2, code: 'C2', client: 'Carlos Mendoza', title: 'Puerta de Herrería Tipo Forja', badges: [], date: '25 Jul 2024', avatarInitials: 'JM', avatarColor: '#2563EB', assigneeName: 'J. Medina' },
      ]
    },
    {
      id: 'levantamiento',
      title: 'Levantamiento',
      color: '#F59E0B',
      cards: [
        { id: 3, code: 'C3', client: 'Motel Sol Clarión', title: 'Barandales Terraza Norte', badges: [{ text: 'Pendiente', type: 'pending' }], date: '20 Jul 2024', avatarInitials: 'IB', avatarColor: '#F59E0B', assigneeName: 'I. Beltrán' },
        { id: 9, code: 'C9', client: 'Farmacia del Valle', title: 'Reja Enrollable Local', badges: [{ text: 'Realizado', type: 'done' }], date: '18 Jul 2024', avatarInitials: 'IB', avatarColor: '#F59E0B', assigneeName: 'I. Beltrán' },
      ]
    },
    {
      id: 'fabricacion',
      title: 'En Fabricación',
      color: '#3B82F6',
      cards: [
        { id: 4, code: 'C4', client: 'Inmobiliaria Viste', title: 'Protecciones Ventana Mod. P12', badges: [], date: '22 Jul 2024', avatarInitials: 'MJ', avatarColor: '#3B82F6', assigneeName: 'M. J. López' },
        { id: 5, code: 'C5', client: 'Sofía Hernández', title: 'Estructura Domo Patio', badges: [{ text: 'Alta', type: 'high' }], date: '15 Jul 2024', avatarInitials: 'MS', avatarColor: '#3B82F6', assigneeName: 'M. S.' },
      ]
    },
    {
      id: 'instalacion',
      title: 'Instalación Programada',
      color: '#A855F7',
      cards: [
        { id: 6, code: 'C6', client: 'Isra. García Torres', title: 'Portón Automatizado Principal', badges: [], date: '18 Jul 2024', avatarInitials: 'NB', avatarColor: '#A855F7', assigneeName: 'N. Bárcenas' },
      ]
    },
    {
      id: 'instalado',
      title: 'Instalado',
      color: '#10B981',
      cards: [
        { id: 7, code: 'C7', client: 'Gregorio Amezcuano', title: 'Reja Perimetral Sección A', badges: [], date: '12 Jul 2024', avatarInitials: 'EB', avatarColor: '#10B981', assigneeName: 'Equipo Bárcenas' },
      ]
    },
    {
      id: 'garantias',
      title: 'Garantías',
      color: '#EF4444',
      cards: [
        { id: 8, code: 'C8', client: 'Restaurante El Asador', title: 'Ajuste Chapa Portón Cocina', badges: [{ text: 'Reportada', type: 'reported' }], date: '16 Jul 2024', avatarInitials: 'CU', avatarColor: '#EF4444', assigneeName: 'Sin asignar' },
        { id: 10, code: 'C10', client: 'Carlos Mendoza', title: 'Fuga en Bisagra Portón', badges: [{ text: 'En atención', type: 'in_progress' }], date: '11 Jul 2024', avatarInitials: 'JL', avatarColor: '#EF4444', assigneeName: 'J. López' },
        { id: 11, code: 'C11', client: 'Motel Sol Clarión', title: 'Ajuste Barandal Escalera', badges: [{ text: 'Resuelta', type: 'resolved' }], date: '3 Jul 2024', avatarInitials: 'IB', avatarColor: '#EF4444', assigneeName: 'I. Beltrán' },
      ]
    },
  ]);

  // Activity Feed data (RF-33)
  readonly activityFeed = signal([
    { id: 1, action: 'Cambió estado', entity: 'Obra C-12', detail: 'Solicitud → Levantamiento', user: 'Carlos Utrilla', time: 'Hace 5 min', type: 'state_change' },
    { id: 2, action: 'Subió fotos', entity: 'Obra C-08', detail: '3 fotos de instalación', user: 'N. Bárcenas', time: 'Hace 12 min', type: 'photos' },
    { id: 3, action: 'Creó obra', entity: 'Obra C-15', detail: 'Cliente: Constructora Altamira', user: 'Carlos Utrilla', time: 'Hace 1 hora', type: 'create' },
    { id: 4, action: 'Completó levantamiento', entity: 'Obra C-03', detail: 'Pendiente validación', user: 'I. Beltrán', time: 'Hace 2 horas', type: 'validation_pending' },
    { id: 5, action: 'Registró anticipo', entity: 'Obra C-07', detail: '$15,000 MXN - Transferencia', user: 'Carlos Utrilla', time: 'Hace 3 horas', type: 'payment' },
  ]);

  onTabChange(tab: DashboardTab): void {
    this.activeTab.set(tab);
  }

  onCardClick(card: KanbanCardData): void {
    // TODO: Abrir modal detalle
    console.log('Card clicked:', card);
  }

  onAddCard(columnId: string): void {
    // TODO: Abrir modal crear tarea
    console.log('Add card to:', columnId);
  }
}
```

---

### 3.7 📄 CREATE: `pages/Admin/dashboard/dashboard.component.html`

```html
<!-- KPIs Row -->
<section class="dashboard-kpis" aria-label="Indicadores clave">
  @for (kpi of kpiData(); track kpi.label) {
    <app-kpi-card
      [value]="kpi.value"
      [label]="kpi.label"
      [iconSvg]="kpi.iconSvg"
      [iconBgColor]="kpi.iconBgColor"
      [iconColor]="kpi.iconColor"
      [variant]="kpi.variant"
      [badgeText]="kpi.badgeText"
      [badgeColor]="kpi.badgeColor"
    ></app-kpi-card>
  }
</section>

<!-- Tabs -->
<app-dashboard-tabs
  [activeTab]="activeTab()"
  (tabChange)="onTabChange($event)"
></app-dashboard-tabs>

<!-- Tab Panels -->
@switch (activeTab()) {
  @case ('kanban') {
    <section class="dashboard-panel" aria-labelledby="kanban-heading">
      <app-kanban-board
        [columns]="kanbanColumns()"
        (cardClick)="onCardClick($event)"
        (addCardClick)="onAddCard($event)"
      ></app-kanban-board>
    </section>
  }
  @case ('calendar') {
    <section class="dashboard-panel" aria-labelledby="calendar-heading">
      <app-calendar></app-calendar>
    </section>
  }
  @case ('assigned') {
    <section class="dashboard-panel" aria-labelledby="assigned-heading">
      <div class="assigned-placeholder">
        <app-empty-state
          title="Trabajos asignados"
          description="Vista de trabajos agrupados por responsable"
          icon="assigned"
        ></app-empty-state>
      </div>
    </section>
  }
}

<!-- Activity Feed (RF-33) -->
<section class="dashboard-activity" aria-label="Actividad reciente">
  <app-activity-feed [activities]="activityFeed()"></app-activity-feed>
</section>
```

---

### 3.8 📄 CREATE: `pages/Admin/dashboard/dashboard.component.scss`

```scss
.dashboard-kpis {
  display: flex;
  gap: var(--sigehu-space-4);
  margin-bottom: var(--sigehu-space-8);
  flex-wrap: wrap;
}

.dashboard-panel {
  margin-bottom: var(--sigehu-space-8);
}

.assigned-placeholder {
  padding: var(--sigehu-space-10) var(--sigehu-space-6);
}

.dashboard-activity {
  margin-top: var(--sigehu-space-8);
  padding-top: var(--sigehu-space-6);
  border-top: var(--sigehu-border-width) solid var(--sigehu-border-divider);
}

/* Responsive */
@media (max-width: 1024px) {
  .dashboard-kpis {
    flex-direction: column;
  }

  .kpi-card--primary {
    max-width: 100%;
  }
}
```

---

### 3.9 🗑 DELETE: `pages/Admin/dashboard/dashboard.component.css`

**Eliminar archivo:** `src/app/pages/Admin/dashboard/dashboard.component.css` (ya no se usa, estilos movidos a shared components).

---

### 3.10 ✅ VERIFY WAVE 3: Build + Verificación Visual Pixel-Perfect

```bash
npm run build
```

**Criterios de éxito estrictos:**
1. Exit code 0
2. Dashboard muestra 2 KPIs: primera ancha (40-45%), segunda normal
3. KPI 1: icono edificio azul (#3B82F6) en caja #1E3A8A, número 12 blanco 32px, badge "+3 este mes" azul
4. KPI 2: icono check verde (#10B981) en caja #064E3B, número 3 blanco, badge "↑ 25% vs jun" verde con flecha
5. 3 Tabs: Kanban (activo, fondo #334155), Calendario, Trabajos asignados (inactivos transparentes)
6. Kanban: 5 columnas con puntos de color exactos (gris, amarillo, azul, morado, verde)
7. Column headers: título + contador + botón "+"
8. Cards: fondo #0F172A, borde #334155, radius 8px, padding 16px
9. Card structure: ID gris arriba izquierda, cliente gris, título blanco bold, badges pill, footer fecha + avatar
10. Activity feed visible abajo
11. NO errores consola, NO estilos rotos

**Si falla:** Fixear → re-build. **NO PASAR A WAVE 4 HASTA VERDE.**

---

## WAVE 4: LOGIN Y PÁGINAS ADMIN - MIGRACIÓN A SHARED (Tareas 4.1 - 4.9)

### 4.1 📝 EDIT: Refactorizar `pages/login/login.component.ts`

```typescript
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { InputComponent } from '../shared/components/input/input.component';
import { ButtonComponent } from '../shared/components/button/button.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, InputComponent, ButtonComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  form: FormGroup;
  showPassword = signal(false);
  loading = signal(false);
  errorMessage = signal('');
  showForgotMessage = signal(false);

  constructor(private fb: FormBuilder, private router: Router) {
    this.form = this.fb.group({
      usuario: ['', [Validators.required]],
      contrasena: ['', [Validators.required]],
      recordarSesion: [false]
    });
  }

  get usuarioCtrl() { return this.form.get('usuario'); }
  get contrasenaCtrl() { return this.form.get('contrasena'); }

  togglePassword(): void {
    this.showPassword.update(v => !v);
  }

  onForgotPassword(): void {
    this.showForgotMessage.set(true);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMessage.set('');

    try {
      // TODO: Conectar AuthService real
      await new Promise(r => setTimeout(r, 1000));
      this.router.navigate(['/admin/dashboard']);
    } catch (e) {
      this.errorMessage.set('Usuario o contraseña incorrectos');
    } finally {
      this.loading.set(false);
    }
  }
}
```

### 4.2 📝 EDIT: `pages/login/login.component.html` - Usar shared components

```html
<div class="login-page">
  <div class="login-card">

    <div class="brand">
      <div class="brand-icon">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M8 2v4M16 2v4M6 10h12l-1 8a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2l-1-8Z"/>
        </svg>
      </div>
      <h1>SIGEHU</h1>
      <p>Sistema Integral de Gestión · Herrería Utrilla</p>
    </div>

    <form [formGroup]="form" (ngSubmit)="onSubmit()" novalidate>

      <app-input
        label="Usuario"
        placeholder="Ej. carlos.utrilla"
        formControlName="usuario"
        [error]="usuarioCtrl?.touched && usuarioCtrl?.invalid ? 'Ingresa tu usuario' : ''"
        autocomplete="username"
        autocapitalize="none"
        [icon]="'user'"
      ></app-input>

      <app-input
        label="Contraseña"
        placeholder="••••••••"
        formControlName="contrasena"
        [type]="showPassword() ? 'text' : 'password'"
        [error]="contrasenaCtrl?.touched && contrasenaCtrl?.invalid ? 'Ingresa tu contraseña' : ''"
        autocomplete="current-password"
        [icon]="'lock'"
        [showToggle]="true"
        [toggled]="showPassword()"
        (toggleClick)="togglePassword()"
      ></app-input>

      <div class="row-between">
        <label class="checkbox">
          <input type="checkbox" formControlName="recordarSesion">
          Recordar sesión
        </label>
        <button type="button" class="link-btn" (click)="onForgotPassword()">
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <div class="forgot-message" *ngIf="showForgotMessage">
        Comunícate con el administrador para cambiar tu contraseña.
      </div>

      <div class="error-message" *ngIf="errorMessage()">
        {{ errorMessage() }}
      </div>

      <app-button
        type="submit"
        variant="primary"
        [disabled]="loading()"
        [loading]="loading()"
        class="submit-btn"
      >
        <span *ngIf="!loading()">Ingresar al Sistema</span>
        <span *ngIf="loading()">Verificando…</span>
      </app-button>

    </form>

    <div class="footer-note">
      Panel de Acceso Único · Administrador y Trabajadores<br>
      Herrería Utrilla © 2026
    </div>

  </div>
</div>
```

### 4.3 📝 EDIT: `pages/login/login.component.scss` - Solo variables globales

```scss
:host {
  display: block;
  min-height: 100vh;
  background: var(--sigehu-content-bg);
  font-family: var(--sigehu-font-family);
}

* { box-sizing: border-box; }

.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--sigehu-space-6);
}

.login-card {
  width: 100%;
  max-width: 360px;
  background: var(--sigehu-topbar-bg); // #1E293B
  border: var(--sigehu-border-width) solid var(--sigehu-border-divider);
  border-radius: var(--sigehu-radius-xl);
  padding: var(--sigehu-space-8) var(--sigehu-space-6);
}

.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  margin-bottom: var(--sigehu-space-6);
}

.brand-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--sigehu-radius-md);
  background: var(--sigehu-accent-soft);
  border: 1.5px solid var(--sigehu-accent);
  color: var(--sigehu-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: var(--sigehu-space-3);
}

.brand h1 {
  margin: 0 0 var(--sigehu-space-1);
  font-size: var(--sigehu-font-size-xl);
  font-weight: var(--sigehu-font-weight-bold);
  letter-spacing: 0.04em;
  color: var(--sigehu-text-primary);
}

.brand p {
  margin: 0;
  font-size: var(--sigehu-font-size-sm);
  color: var(--sigehu-text-secondary);
}

.row-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--sigehu-space-5);
  flex-wrap: wrap;
  gap: var(--sigehu-space-2);
}

.checkbox {
  display: flex;
  align-items: center;
  gap: var(--sigehu-space-2);
  font-size: var(--sigehu-font-size-sm);
  color: var(--sigehu-text-secondary);
  cursor: pointer;
}

.checkbox input {
  width: 14px;
  height: 14px;
  accent-color: var(--sigehu-accent);
}

.link-btn {
  background: none;
  border: none;
  padding: 0;
  font-size: var(--sigehu-font-size-sm);
  font-weight: var(--sigehu-font-weight-medium);
  color: var(--sigehu-accent);
  cursor: pointer;
}

.link-btn:hover { text-decoration: underline; }

.forgot-message {
  background: var(--sigehu-accent-soft);
  border: var(--sigehu-border-width) solid var(--sigehu-accent);
  color: var(--sigehu-accent);
  font-size: var(--sigehu-font-size-sm);
  border-radius: var(--sigehu-radius-md);
  padding: var(--sigehu-space-2) var(--sigehu-space-3);
  margin-bottom: var(--sigehu-space-4);
  line-height: 1.4;
}

.error-message {
  background: var(--sigehu-danger-soft);
  border: var(--sigehu-border-width) solid var(--sigehu-danger);
  color: var(--sigehu-danger);
  font-size: var(--sigehu-font-size-sm);
  border-radius: var(--sigehu-radius-md);
  padding: var(--sigehu-space-2) var(--sigehu-space-3);
  margin-bottom: var(--sigehu-space-4);
  line-height: 1.4;
}

.footer-note {
  margin-top: var(--sigehu-space-5);
  padding-top: var(--sigehu-space-4);
  border-top: var(--sigehu-border-width) solid var(--sigehu-border-divider);
  text-align: center;
  font-size: var(--sigehu-font-size-xs);
  line-height: 1.6;
  color: var(--sigehu-text-tertiary);
}

@media (max-width: 420px) {
  .login-card { padding: var(--sigehu-space-6) var(--sigehu-space-4); }
}
```

### 4.4 🗑 DELETE: `pages/login/login.component.css` (archivo viejo)

---

### 4.5 📄 CREATE: Extraer `shared/components/data-table/`

**Crear componente genérico de tabla reutilizable para listados (clientes, trabajadores, proveedores, etc.)**

Archivos: `data-table.component.ts/html/scss` con inputs: `columns`, `data`, `actions`, `loading`, `emptyMessage`, `pagination`.

---

### 4.6 📄 CREATE: Extraer `shared/components/entity-form/`

**Crear formulario genérico para crear/editar entidades (cliente, trabajador, proveedor).**

Archivos: `entity-form.component.ts/html/scss` con inputs: `fields` (config), `initialData`, `submit`, `cancel`.

---

### 4.7 📄 CREATE: Extraer `shared/components/filter-bar/`

**Crear barra de filtros/búsqueda reutilizable.**

---

### 4.8 📝 EDIT: Actualizar páginas Admin para usar componentes extraídos

Para cada página en `pages/Admin/`:
- `clientes.component` → usar `data-table` + `entity-form`
- `trabajadores.component` → usar `data-table` + `entity-form`
- `proveedores.component` → usar `data-table` + `entity-form`
- `calendario`, `fabricacion`, `garantias`, `orden`, `ruta`, `catalogo`, `analitico` → aplicar variables CSS globales, remover CSS inline

---

### 4.9 ✅ VERIFY WAVE 4: Build + Verificación Rutas Admin

```bash
npm run build
```

**Criterios:** Exit code 0, todas las rutas Admin cargan, login usa shared components, sin estilos rotos.

---

## WAVE 5: MOVILCAMPO + VERIFICACIÓN FINAL (Tareas 5.1 - 5.8)

### 5.1 📝 EDIT: `pages/MovilCampo/levantamientos/` - Aplicar variables globales

### 5.2 📝 EDIT: `pages/MovilCampo/ruta/` - Aplicar variables globales

### 5.3 📝 EDIT: `pages/MovilCampo/garantias/` - Aplicar variables globales

### 5.4 📝 EDIT: Eliminar `pages/MovilCampo/.ts` (archivo basura)

```bash
rm "src/app/pages/MovilCampo/.ts"
```

### 5.5 🔍 VERIFY: Checklist REQUIREMENTS.md

Ejecutar verificación manual de cada RF para rutas existentes:

| RF | Descripción | Ruta | Estado |
|----|-------------|------|--------|
| RF-01 | Kanban Obras | `/admin/dashboard` | [ ] |
| RF-02 | Calendario | `/admin/calendario` | [ ] |
| RF-11 | Orden Levantamiento | `/movil/levantamientos` | [ ] |
| RF-12 | Captura Medidas | `/movil/levantamientos` | [ ] |
| RF-19 | Programación Instalación | `/admin/ruta` | [ ] |
| RF-20 | Validación Instalación | `/movil/ruta` | [ ] |
| RF-24 | Apertura Garantía | `/admin/garantias`, `/movil/garantias` | [ ] |
| RF-25 | Seguimiento Garantía | `/movil/garantias` | [ ] |
| RF-31 | Omnibox | Topbar (todas) | [ ] |
| RF-34 | Auth JWT | Login + Guards | [ ] |
| RF-35 | Offline Sync | Service existe | [ ] |
| RF-36 | Acceso Propietario Móvil | Guards + detection | [ ] |

**REGLA:** Solo marcar [x] si la ruta EXISTE y FUNCIONA. NO CREAR RUTAS NUEVAS.

### 5.6 ✅ VERIFY: Build Producción

```bash
npm run build --configuration=production
```

### 5.7 ✅ VERIFY: Lint

```bash
npm run lint
```

### 5.8 🎉 PHASE COMPLETE

**Criterios finales:**
- [ ] `npm run build --configuration=production` → exit code 0
- [ ] `npm run lint` → exit code 0
- [ ] 0 warnings en build
- [ ] Bundle size dentro de budgets (initial < 2MB warning, 5MB error)
- [ ] Todas las rutas existentes navegables
- [ ] Dashboard pixel-perfect vs DASHBOARD_ANALISIS.md
- [ ] Layout completo vs LAYOUT_ANALISIS.md
- [ ] 0 archivos duplicados
- [ ] 0 typos en nombres de carpetas
- [ ] 100% componentes usan variables `--sigehu-*`

---

## REGLAS DE EJECUCIÓN PARA AGENTES

1. **UNA TAREA A LA VEZ** - Completar 1.1, verificar, luego 1.2, etc.
2. **BUILD DESPUÉS DE CADA ✅ VERIFY** - Si falla, NO continuar
3. **NO INVENTAR** - Seguir instrucciones literalmente
4. **SI DUDAS** - Preguntar antes de asumir
5. **COMMIT ATÓMICO** - Cada tarea completada = commit con mensaje `feat(wave-X.Y): descripción`

---

## COMANDOS DE REFERENCIA

```bash
# Build desarrollo
npm run build

# Build producción
npm run build --configuration=production

# Lint
npm run lint

# Test
npm run test

# Servir
npm run start
```

---

**FIN DEL PLAN - EJECUTAR EN ORDEN ESTRICTO**