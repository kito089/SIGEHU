# ROADMAP: SIGEHUFront Refactorización y Estandarización

## Visión General: Estado Actual vs. Estado Deseado

| Aspecto | Estado Actual | Estado Deseado |
|---------|--------------|----------------|
| **Layout Principal** | Solo `<ion-router-outlet>` en app.component.html | Layout completo: Sidebar (240px) + Topbar (80px) + Content Area según `LAYOUT_ANALISIS.md` |
| **Design System** | Cada componente define sus propias CSS custom properties con valores inconsistentes | Sistema unificado de variables CSS globales en `src/theme/variables.scss` basado en paleta oficial (#0F172A, #1E293B, #3B82F6, #94A3B8, #F8FAFC, #334155, #10B981, #F59E0B, #A855F7, #EF4444) |
| **Dashboard** | HTML/CSS/JS vanilla embebido en componente Angular; no usa shared components | Compuesto 100% por shared components: `kpi-card`, `kanban-board/column/card`, tabs, omnibox |
| **Componentes Compartidos** | 13 componentes en `shared/components/` + duplicados en `core/components/` | Biblioteca consolidada, sin duplicados, componentes reutilizables extraídos de páginas |
| **Estructura de Directorios** | Modelos duplicados (`app/models/` + `core/models/`), toast duplicado, carpetas con nombres inconsistentes (`ClientesFrom`, `provedores`) | Estructura limpia: `core/` solo para guards/interceptors/services/models, `shared/` para UI components, `pages/` para features |
| **Rutas y Auth** | Guards implementados, rutas definidas | Verificación completa contra `REQUIREMENTS.md` (RF-31, RF-33, RF-34) - sin crear rutas nuevas |
| **Compilación** | Build funcional | Build exitoso sin errores/warnings tras todos los cambios |

---

## Estrategia de Refactorización: "Bottom-Up Determinista"

1. **Fundación primero** (CSS variables, directorios, duplicados) → base sólida
2. **Layout segundo** (Sidebar, Topbar, Layout wrapper) → estructura que usan todas las páginas
3. **Dashboard tercero** (KPIs, Tabs, Kanban) → valida el layout y los shared components
4. **Páginas restantes** → migración incremental a shared components
5. **Validación final** → Build + verificación de rutas

---

## Definición de Olas (Waves) Estratégicas

### **Wave 1: Fundación - Estandarización de Directorios y CSS Global** (Días 1-2)
**Objetivo:** Eliminar duplicados, unificar modelos, establecer Design System global
- 1.1 Mover `core/components/toast-container` → `shared/components/toast-container` (eliminar duplicado)
- 1.2 Consolidar modelos: eliminar `app/models/`, usar solo `core/models/`
- 1.3 Renombrar carpetas con typos: `ClientesFrom` → `clientes-form`, `provedores` → `proveedores`
- 1.4 Crear `src/theme/variables.scss` con **todas** las variables CSS de `LAYOUT_ANALISIS.md` y `DASHBOARD_ANALISIS.md`
- 1.5 Actualizar `global.scss` para importar variables y reset base
- 1.6 **Validación:** `npm run build` exitoso

### **Wave 2: Layout Principal - Sidebar + Topbar + Content Wrapper** (Días 3-4)
**Objetivo:** Implementar layout completo según `LAYOUT_ANALISIS.md`
- 2.1 Crear `shared/components/layout/sidebar/` con navegación (Dashboard, Proyectos, Presupuestos, Inventario, Producción, Clientes, Configuración)
- 2.2 Crear `shared/components/layout/topbar/` con título, buscador (omnibox), notificaciones, botón "Nueva obra", avatar usuario
- 2.3 Crear `shared/components/layout/main-layout/` wrapper que compone sidebar + topbar + `<router-outlet>`
- 2.4 Actualizar `app.component.html` para usar `<app-main-layout>`
- 2.5 Integrar `omnibox` component en Topbar
- 2.6 **Validación:** `npm run build` + verificación visual en browser

### **Wave 3: Dashboard - KPIs + Tabs + Kanban** (Días 5-7)
**Objetivo:** Reconstruir dashboard usando shared components según `DASHBOARD_ANALISIS.md`
- 3.1 Refactorizar `kpi-card` para coincidir exactamente con specs (2 tarjetas: "Total Obras Activas" 40-45%, "Finalizadas Mes" con badges)
- 3.2 Crear `shared/components/dashboard/tabs/` component (Kanban | Calendario | Trabajos asignados)
- 3.3 Refactorizar `kanban-board/column/card` para match exacto: 5 columnas con puntos de color, cards con ID, cliente, título, badges, footer (fecha + avatar)
- 3.4 Actualizar `pages/Admin/dashboard/` para usar **exclusivamente** shared components (sin CSS inline)
- 3.5 Integrar `activity-feed` en dashboard (RF-33)
- 3.6 **Validación:** `npm run build` + match visual pixel-perfect con `DASHBOARD_ANALISIS.md`

### **Wave 4: Login y Páginas Admin - Migración a Shared Components** (Días 8-10)
**Objetivo:** Estilizar login según design system; migrar páginas Admin a shared components
- 4.1 Refactorizar `login.component` para usar variables CSS globales + shared `input`, `button`
- 4.2 Extraer componentes repetidos de `pages/Admin/` hacia `shared/components/`:
  - Tabla de listado genérica (clientes, trabajadores, proveedores, órdenes)
  - Formulario genérico (crear/editar cliente, trabajador, proveedor)
  - Filtros y búsqueda
  - Modal de confirmación (ya existe `confirm-modal`)
- 4.3 Actualizar páginas Admin para usar componentes extraídos
- 4.4 **Validación:** `npm run build` + verificación de todas las rutas Admin

### **Wave 5: Páginas MovilCampo + Verificación Final** (Días 11-12)
**Objetivo:** Aplicar design system a móvil; validación completa
- 5.1 Aplicar variables CSS globales a `pages/MovilCampo/` (levantamientos, ruta, garantías)
- 5.2 Verificar que rutas existentes cumplen `REQUIREMENTS.md` (RF-01, RF-02, RF-11, RF-12, RF-19, RF-20, RF-24, RF-25, RF-31, RF-34, RF-35, RF-36)
- 5.3 **NO crear rutas nuevas** - solo verificar y organizar existentes
- 5.4 Build final de producción: `npm run build --configuration=production`
- 5.5 Lint: `npm run lint` sin errores

---

## Criterios de Éxito (Definition of Done)

| Criterio | Métrica de Verificación |
|----------|------------------------|
| **Design System Unificado** | 0 variables CSS duplicadas; todos los componentes usan `var(--sigehu-*)` de `theme/variables.scss` |
| **Layout Implementado** | Sidebar fija 240px, Topbar 80px, Content full-bleed; navegación funcional en todas las rutas Admin |
| **Dashboard Pixel-Perfect** | Match visual con `DASHBOARD_ANALISIS.md`: 2 KPIs, 3 tabs, 5 columnas Kanban, cards con estructura exacta |
| **Sin Duplicados** | 0 archivos duplicados; `core/` solo guards/interceptors/services/models; `shared/` solo UI components |
| **Build Limpio** | `npm run build --configuration=production` exit code 0, 0 warnings, bundle size dentro de budgets |
| **Lint Limpio** | `npm run lint` exit code 0 |
| **Rutas Verificadas** | Checklist de `REQUIREMENTS.md` marcadas para rutas existentes; sin rutas nuevas creadas |
| **Compilación Offline** | Build funciona sin conexión a internet (cache de node_modules) |

---

## Dependencias Entre Olas

```
Wave 1 (Fundación)
    ↓ (requiere variables CSS y estructura limpia)
Wave 2 (Layout)
    ↓ (requiere layout wrapper funcional)
Wave 3 (Dashboard)
    ↓ (requiere shared components validados en dashboard)
Wave 4 (Admin Pages)
    ↓ (requiere shared components maduros)
Wave 5 (MovilCampo + Validación Final)
```

**Regla de Oro:** Una ola no inicia hasta que la anterior compila exitosamente (`npm run build` exit code 0).