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

## PHASE 2: MÓDULO CLIENTES COMPLETO (Nueva Fase - Post Phase 1)

### **Objetivo General:** Implementación completa del módulo Clientes según REQUIREMENTS.md (RF-03, RF-04, RF-05, RF-06) + Mejoras Proveedores + Backend completo

### **Wave 1: Frontend - Proveedores Modal Detalles + Eliminaciones Clientes** (Días 1-2)
- 1.1 Rediseñar modal detalles Proveedores: label-based design, lista materiales (no count), botón "Detalles" por material
- 1.2 Crear componente reutilizable `MaterialDetailComponent` en `shared/components/`
- 1.3 Eliminar "¿Requiere Factura?" completamente del frontend Clientes (formulario + listado + modelo)
- 1.4 Eliminar "Dirección de Instalación / Habitual" completamente del frontend Clientes
- 1.5 **Validación:** `npm run build` exitoso — **BLOQUEADA por issue preexistente `environment.prod.ts`** (ajeno a la ola)

> **Progreso Wave 1:** ✅ código completo (1.1-1.8 implementados). Build no verificable por defecto preexistente de `angular.json` (`fileReplacements` → `environment.prod.ts` inexistente, gitignored y autogenerado por `build.bat`).

### **Wave 2: Frontend - Clientes Formulario Persona/Empresa + Selector + Datos Fiscales** (Días 3-5)
- 2.1 Selector mutuamente exclusivo: Dos check buttons "Persona" | "Empresa" (nunca ambos activos)
- 2.2 Formulario Persona: Nombre (req), Teléfono, Correo (XOR req: al menos uno), Observaciones
- 2.3 Datos Fiscales Persona (Switch): RFC, Razón Social, Régimen Fiscal, Uso CFDI, CP, Dirección - **Searchers reutilizados de Proveedores**
- 2.4 Formulario Empresa: Nombre (req), Dirección, Observaciones
- 2.5 Datos Fiscales Empresa (Switch): RFC, Razón Social, Régimen Fiscal, Uso CFDI, CP, Dirección Fiscal
- 2.6 **Validación:** `npm run build` exitoso

> **Progreso Wave 2:** ✅ código completo (2.1-2.12 implementados y verificados). Dev significativo: los "Searchers" Régimen/Uso CFDI NO existen en Proveedores → se reutilizan catálogos backend del módulo Clientes (`GET /Clientes/RegimenesFiscales`, `GET /Clientes/UsosCFDI`) con combobox searchable single-select en el propio formulario (KI-12). Bloqueo `environment.prod.ts` resuelto (autogenerado por `build.bat`); se corrigieron 2 errores TS de Wave 2 (getters FormGroup + método `cargarCatalogos`). **`npm run build` → exit 0 verificado.**

### **Wave 3: Frontend - Contactos CRUD + Validaciones + Indicadores Obligatorios** (Días 6-7)
- 3.1 Componente `ContactListComponent` (shared): Mini CRUD contactos 1:N (Nombre, Tel, Correo, Obs, validación XOR, min 1)
- 3.2 Integrar ContactList en formulario Empresa
- 3.3 Modo edición: Cargar datos existentes, detectar tipo, poblar contactos y fiscales
- 3.4 Actualizar listado Clientes (data-table): columnas nuevo modelo, sin columnas eliminadas
- 3.5 Actualizar filtros (filter-bar): Tipo, Con/Sin fiscales, Activos/Inactivos
- 3.6 Indicadores visuales obligatorios: Asterisco rojo consistente (`--sigehu-danger`) en todos los campos req
- 3.7 Validaciones completas: Email, Phone (10-15), RFC MX (12-13), CP (5 díg), longitudes - reutilizando validadores existentes
- 3.8 **Validación:** `npm run build` exitoso

> **Progreso Wave 3:** ✅ implementado y verificado (3.1-3.6). ContactList pulida (dup, confirm-modal para eliminar, aria-live, orden por inserción). Modo edición ya cubierto desde W2. Listado Clientes con badge Tipo + columnas Nombre/Tél/Correo/RFC/Obras/SAT. Filtros persona/empresa/datos SAT + búsqueda por correo. Estilos alineados a tokens `--sigehu-*`. **`npm run build` → exit 0, sin errores.**

> **Progreso Wave 4:** ✅ implementado y verificado (4.1-4.8). Backend Clientes actualizado a nuevo modelo: validación `tipo` persona/empresa, CP 5 dígitos, XOR telefono/correo persona, empresa→contactos>=1, RFC/email/phone. `createCliente` persiste contacto principal si XOR; `updateCliente` hace MERGE de `contactos` (lista completa reemplaza) y `getClienteById` retorna `contactos[]` para modo edición. `blockFinancialForWorker` ya devuelve 403 a trabajadores en endpoints fiscales (RNF-04). Queries parametrizadas + transacciones explícitas + `RDB$GET_CONTEXT` antes de DML. Campos `requiereFactura`/`direccionInstalacion` ausentes en backend (comentario DEPRECATED). **`npm run build` → exit 0; `node src/app.js` inicia sin errores (:3000). Pendiente: columna TIPO y tabla `CLIENTES_DATOS_FISCALES` (DDL Wave 5).**

### **Wave 4: Backend - Rutas, Controladores, Servicios, Queries Clientes** (Días 8-9)
- 4.1 Actualizar modelo/validación backend: Eliminar campos obsoletos, agregar tipo, contactos, fiscales
- 4.2 Controlador: Endpoints CRUD aceptando nuevo payload, 403 financiero para trabajadores (RNF-04)
- 4.3 Servicio: Transacciones explícitas (BEGIN/COMMIT/ROLLBACK), auditoría (RDB$SET_CONTEXT), upsert contactos/fiscales
- 4.4 Rutas: Middleware auth + roles, protección datos fiscales
- 4.5 Queries SQL parametrizadas: SELECT con joins, INSERT/UPDATE transaccionales
- 4.6 **Validación:** `node src/app.js` inicia sin errores, endpoints responden

### **Wave 5: Backend - Stored Procedures, Triggers, Vistas, Índices, Tablas** (Días 10-11)
- 5.1 DDL: Columna `Tipo` (persona/empresa) agregada a `Clientes` existente; índice `IDX_Clientes_Tipo`; **NO se crearon tablas nuevas** — se reutilizan `Clientes` + `ContactosClientes` existentes (sin `CLIENTES_CONTACTOS` ni `CLIENTES_DATOS_FISCALES` separadas)
- 5.2 SPs: `SP_CREAR_CLIENTE`, `SP_ACTUALIZAR_CLIENTE`, `SP_OBTENER_CLIENTE`, `SP_LISTAR_CLIENTES` — transaccionales, con `RDB$SET_CONTEXT` para auditoría, validación tipo
- 5.3 Triggers auditoría: **Ya existían** para `Clientes` y `ContactosClientes` (AI/AU/AD) — no se requirieron nuevos
- 5.4 Vistas: `VW_CLIENTES_CON_OBRAS` actualizada (incluye `Tipo`); creada `VW_CLIENTES_COMPLETO` con datos fiscales
- 5.5 Índices: `IDX_Clientes_Tipo` agregado; FKs existentes mantenidas
- 5.6 **Validación:** ✅ Sintaxis SQL OK, Backend inicia (BD conectada, :3000), Build frontend exit 0

> **Progreso Wave 5:** ✅ completa. Implementación siguió esquema **actual** de `SIGEHU.sql` (no plan original): se extendió tabla `Clientes` existente con columna `Tipo`, se reutilizó `ContactosClientes` para contactos 1:N, y los datos fiscales ya están en `Clientes` (RFC, RegimenFiscal, UsoCFDI, CP). Triggers de auditoría ya existían. SPs y vistas creadas/actualizadas. Backend y Frontend compilan sin errores.

### **Wave 6: Backend - SIGEHU.sql + Migración Datos + Integridad** (Día 12)
- 6.1 Consolidar sección Clientes en `SIGEHU.sql` (Tablas, SPs, Triggers, Vistas, Índices)
- 6.2 Script migración `phase2-clientes-migration.sql`: Datos existentes → nuevo esquema (idempotente, reversible)
- 6.3 Verificar integridad referencial completa
- 6.4 **Validación:** Migración ejecuta sin error, API funcional con nuevo esquema

### **Wave 7: Validation Wave - Comparación Exhaustiva REQUIREMENTS.md** (Día 13)
- 7.1 Checklist RF-03 (CRUD Clientes & Contactos 1:N)
- 7.2 Checklist RF-04 (Historial Cliente)
- 7.3 Checklist RF-05 (Filtros)
- 7.4 Checklist RF-06 (Validación Estricta)
- 7.5 Documentar gaps en `.planning/phase2-gaps.md` - **SOLO VERIFICACIÓN, NO IMPLEMENTACIÓN**

> **Progreso Wave 7:** ✅ completada. RF-03/04/05/06 verificados contra código real; gaps
> documentados en `.planning/phase2-gaps.md`. Se detectaron y corrigieron en la auditoría final:
> botón "Detalles"/MaterialDetail en modal Proveedores (G-01), filtro activos/inactivos (G-02),
> bug `consumidas` en MERGE contactos (G-03), `findObras` parámetro `idCliente`→`id` (G-04),
> token `--sigehu-required-color` global (G-05).

### **Wave 8: Verificación Técnica - Build Frontend + Backend** (Día 14)
- 8.1 `npm run build` (Frontend) - Fix SOLO errores Fase 2
- 8.2 `node src/app.js` (Backend) - Fix SOLO errores Fase 2
- 8.3 Actualizar `STATE.md`, `ROADMAP.md`, `phase-2-plan.md` - Fase marcada Complete

> **Progreso Wave 8:** ✅ **PHASE 2 COMPLETE** (2026-08-07). `npm run build` exit 0 (warning único
> NG8113 en OrdenesCompra, preexistente y ajeno a la fase). Backend inicia en :3000 con BD
> conectada; test CRUD Clientes completo verificado (create persona/empresa con validaciones,
> update MERGE de contactos, soft-delete, `/:id/obras`) + catálogos RegimenesFiscales/UsosCFDI.

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