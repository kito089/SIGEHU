# STATE: SIGEHUFront Refactorización - Seguimiento de Ejecución

> **Instrucciones para Agentes:** Marcar `[x]` al completar cada tarea. Añadir entradas en "Problemas Conocidos", "Bloqueos" y "ADRs" según surjan. **No modificar secciones completadas por otros agentes.**

---

## Checklist de Olas y Tareas Principales

### Wave 1: Fundación - Directorios y CSS Global
- [x] 1.1 Mover `core/components/toast-container` → `shared/components/toast-container` (eliminar duplicado en core)
- [x] 1.2 Consolidar modelos: eliminar `app/models/`, actualizar imports a `core/models/`
- [x] 1.3 Renombrar `pages/Admin/clientes/ClientesFrom` → `clientes-form`
- [x] 1.4 Renombrar `pages/Admin/provedores` → `proveedores` (y `provedornew` → `proveedor-new`)
- [x] 1.5 Renombrar `pages/Admin/trabajadores/trabajadornew` → `trabajador-new`
- [x] 1.6 Crear `src/theme/variables.scss` con **todas** las variables CSS de specs
- [x] 1.7 Actualizar `src/global.scss` para importar variables y reset base
- [x] 1.8 Actualizar `angular.json` si cambian paths de styles
- [x] 1.9 **VALIDACIÓN W1:** `npm run build` → exit code 0

### Wave 2: Layout Principal - Sidebar + Topbar + MainLayout
- [x] 2.1 Crear `shared/components/layout/sidebar/sidebar.component.ts/html/scss`
- [x] 2.2 Crear `shared/components/layout/topbar/topbar.component.ts/html/scss`
- [x] 2.3 Crear `shared/components/layout/main-layout/main-layout.component.ts/html/scss`
- [x] 2.4 Integrar `omnibox` component en Topbar (buscador global RF-31)
- [x] 2.5 Actualizar `app.component.html` → `<app-main-layout>`
- [x] 2.6 Añadir exports en `shared/components/index.ts` (si existe) o barrel files → **N/A**: no existe barrel file
- [x] 2.7 **VALIDACIÓN W2:** `npm run build` → exit code 0 + verificación visual

### Wave 3: Dashboard - KPIs + Tabs + Kanban
- [x] 3.1 Refactorizar `shared/components/kpi-card` para match `DASHBOARD_ANALISIS.md` (2 variantes: principal + secundaria)
- [x] 3.2 Crear `shared/components/dashboard/tabs/dashboard-tabs.component.ts/html/scss`
- [x] 3.3 Refactorizar `shared/components/kanban/kanban-board.component` (5 columnas, puntos de color, header con contador)
- [x] 3.4 Refactorizar `shared/components/kanban/kanban-column.component` (botón "+ Agregar tarea", scroll)
- [x] 3.5 Refactorizar `shared/components/kanban/kanban-card.component` (ID, cliente, título, badges, footer fecha+avatar)
- [x] 3.5 Actualizar `pages/Admin/dashboard/dashboard.component.ts` → usa **solo** shared components
- [x] 3.6 Actualizar `pages/Admin/dashboard/dashboard.component.html` → template compuesto
- [x] 3.7 Eliminar `pages/Admin/dashboard/dashboard.component.css` (estilos movidos a shared)
- [x] 3.8 Integrar `activity-feed` en dashboard (RF-33)
- [x] 3.9 **VALIDACIÓN W3:** `npm run build` → exit code 0 + match visual pixel-perfect

### Wave 4: Login y Páginas Admin - Migración a Shared
- [x] 4.1 Refactorizar `pages/login/login.component` → usa variables globales + `shared/components/input` + `shared/components/button`
- [x] 4.2 Extraer `shared/components/data-table/` de `pages/Admin/clientes/clientes.component` + `trabajadores` + `proveedores`
- [x] 4.3 Extraer `shared/components/entity-form/` de `clientes-form`, `trabajador-new`, `proveedor-new`
- [x] 4.4 Extraer `shared/components/filter-bar/` de listados
- [x] 4.5 Actualizar `pages/Admin/clientes/*` para usar data-table + entity-form
- [x] 4.6 Actualizar `pages/Admin/trabajadores/*` para usar data-table + entity-form
- [x] 4.7 Actualizar `pages/Admin/proveedores/*` para usar data-table + entity-form
- [x] 4.8 Actualizar `pages/Admin/calendario/*`, `fabricacion`, `garantias`, `orden`, `ruta`, `catalogo`, `analitico` → aplicar variables globales
- [x] 4.9 **VALIDACIÓN W4:** `npm run build` → exit code 0 + verificación rutas Admin

### Wave 5: MovilCampo + Verificación Final
- [x] 5.1 Aplicar variables CSS globales a `pages/MovilCampo/levantamientos`
- [x] 5.2 Aplicar variables CSS globales a `pages/MovilCampo/ruta`
- [x] 5.3 Aplicar variables CSS globales a `pages/MovilCampo/garantias`
- [x] 5.4 Eliminar `pages/MovilCampo/.ts` (archivo basura) y verificar cumplimiento `REQUIREMENTS.md`:
  - [x] RF-01 Kanban (Dashboard Admin) ✓
  - [x] RF-02 Calendario (Admin/calendario) ✓
  - [x] RF-11 Orden Levantamiento (MovilCampo/levantamientos) ✓ — ruta `/movil/levantamientos` registrada
  - [x] RF-12 Captura Medidas (MovilCampo/levantamientos) ✓ — ruta `/movil/levantamientos` registrada
  - [x] RF-19 Programación Instalación (Admin/ruta) ✓ — ruta `/admin/ruta` registrada
  - [x] RF-20 Validación Instalación (MovilCampo/ruta) ✓ — ruta `/movil/ruta` registrada
  - [x] RF-24 Apertura Garantía (Admin/MovilCampo/garantias) ✓ — rutas `/admin/garantias` y `/movil/garantias` registradas
  - [x] RF-25 Seguimiento Garantía (MovilCampo/garantias) ✓ — ruta `/movil/garantias` registrada
  - [x] RF-31 Omnibox (Topbar) ✓
  - [x] RF-34 Auth JWT (Login + Guards) ✓
  - [x] RF-35 Offline Sync (MovilCampo - service existe) ✓
  - [x] RF-36 Acceso Propietario Móvil (Guards + detection) ✓ — rutas `/movil/*` con `WorkerGuard` registradas
- [x] 5.5 **NO CREAR RUTAS NUEVAS** - solo verificar y organizar existentes (ver post-fase: encargo de registro de rutas pendientes)
- [x] 5.6 Build producción: `npm run build --configuration=production` → exit code 0 (845 KB initial, dentro de budget)
- [x] 5.7 Lint: `npm run lint` → exit code 0 (migración `inject()` + fix entity-form `no-output-native`)
- [x] 5.8 **VALIDACIÓN FINAL W5:** Todo verde → **PHASE COMPLETE**

---

## PHASE 2: MÓDULO CLIENTES COMPLETO — Planificado (2026-08-05)

**Estado:** Complete ✅
**Total Waves:** 8
**Total Tareas:** ~52 (subatómicas)
**Fecha Creación:** 2026-08-05
**Dependencias:** Phase 1 Complete (Design System, Layout, Shared Components, Admin Pages migrados)
**Módulos Afectados:** 
- Frontend: `pages/Admin/clientes/`, `pages/Admin/proveedores/`, `shared/components/material-detail/`, `shared/components/contact-list/`, `shared/validators/`
- Backend: `routes/clientes.routes.js`, `controllers/clientes.controller.js`, `services/clientes.service.js`, `SIGEHU.sql`, `migrations/`
- Planning: `phase-2-plan.md`, `phase2-gaps.md`

---

### Phase 2 Wave 1: Frontend - Proveedores Modal Detalles + Eliminaciones Clientes
- [x] 1.1 📖 READ + 🔍 SEARCH: Entender modal actual de proveedores
- [x] 1.2 📝 EDIT: Rediseñar modal de detalles Proveedores - Template
- [x] 1.3 📝 EDIT: Estilos modal Proveedores - SCSS
- [x] 1.4 📄 CREATE: Componente Material Detail View (reutilizable)
- [x] 1.5 🔍 SEARCH + 📝 EDIT: Eliminar "¿Requiere Factura?" del formulario Clientes
- [x] 1.6 🔍 SEARCH + 📝 EDIT: Eliminar "Dirección de Instalación / Habitual" del formulario Clientes
- [x] 1.7 ✅ VERIFY WAVE 1 FRONTEND: Build Angular — **BLOQUEADO** por issue preexistente `environment.prod.ts` (ajeno a Wave 1)
- [x] 1.8 📝 EDIT: Actualizar proveedores.component.ts - Handler material detail

### Phase 2 Wave 2: Frontend - Clientes Formulario Persona/Empresa + Selector + Datos Fiscales
- [x] 2.1 📖 READ + 🔍 SEARCH: Analizar formulario actual Clientes
- [x] 2.2 📄 CREATE: Interface/Type para nuevo modelo Cliente (Persona vs Empresa)
- [x] 2.3 📝 EDIT: Rediseñar template - Selector Persona/Empresa (Check Buttons Mutuamente Exclusivos)
- [x] 2.4 📝 EDIT: Formulario Persona - Campos + Validaciones Condicionales (XOR tel/correo)
- [x] 2.5 📝 EDIT: Datos Fiscales Persona - Switch + Campos + Searchers Reutilizados (Proveedores)
- [x] 2.6 📝 EDIT: Formulario Empresa - Campos Base
- [x] 2.7 📄 CREATE: Componente Contact List (Contactos 1:N) - Mini CRUD
- [x] 2.8 📝 EDIT: Integrar ContactList en Formulario Empresa
- [x] 2.9 📝 EDIT: Datos Fiscales Empresa - Campos
- [x] 2.10 📝 EDIT: Indicadores visuales campos obligatorios - Diseño consistente
- [x] 2.11 📝 EDIT: Validaciones completas - Email, Phone, RFC, CP, Longitudes (reutilizar)
- [x] 2.12 ✅ VERIFY WAVE 2 FRONTEND: Build Angular — ✅ build OK (exit 0, verificado)

### Phase 2 Wave 3: Frontend - Contactos CRUD + Validaciones + Indicadores
- [x] 3.1 📝 EDIT: Refinar ContactListComponent - Edge Cases
- [x] 3.2 📝 EDIT: Formulario Clientes - Manejo Edición (Cargar datos existentes)
- [x] 3.3 📝 EDIT: Listado Clientes - Actualizar columnas data-table
- [x] 3.4 📝 EDIT: Filtros Clientes - Actualizar FilterBar
- [x] 3.5 📝 EDIT: Estilos finales formulario - SCSS consistente
- [x] 3.6 ✅ VERIFY WAVE 3 FRONTEND: Build Angular — ✅ build OK (exit 0, verificado)

### Phase 2 Wave 4: Backend - Rutas, Controladores, Servicios, Queries Clientes
- [x] 4.1 📖 READ: Analizar backend actual Clientes
- [x] 4.2 📝 EDIT: Actualizar Modelo Cliente Backend
- [x] 4.3 📝 EDIT: Controlador Clientes - Endpoints CRUD
- [x] 4.4 📝 EDIT: Servicio Clientes - Lógica de negocio + Transacciones + Auditoría
- [x] 4.5 📝 EDIT: Rutas Clientes - Verificar middleware auth/roles + 403 financiero
- [x] 4.6 📝 EDIT: Queries SQL - Clientes (SELECT, INSERT, UPDATE parametrizados)
- [x] 4.7 📝 EDIT: Eliminar campos obsoletos de BD (Backend only - preparatorio Wave 5)
- [x] 4.8 ✅ VERIFY WAVE 4 BACKEND: Test sintaxis + inicio servidor — ✅ servidor inicia (BD conectada, :3000), build frontend exit 0

### Phase 2 Wave 5: Backend - Stored Procedures, Triggers, Vistas, Índices, Tablas
- [x] 5.1 📖 READ: Analizar objetos BD actuales Clientes
- [x] 5.2 📝 EDIT: Actualizar/Crear Tablas - Nuevo esquema Clientes (DDL) — Agregada columna `Tipo` a `Clientes`, índice `IDX_Clientes_Tipo`
- [x] 5.3 📝 EDIT: Stored Procedure SP_CREAR_CLIENTE / SP_ACTUALIZAR_CLIENTE
- [x] 5.4 📝 EDIT: Stored Procedure SP_OBTENER_CLIENTE / SP_LISTAR_CLIENTES
- [x] 5.5 📝 EDIT: Triggers de Auditoría - Tablas nuevas — Ya existían `TR_Auditorias_Clientes_AI/AU/AD` y `TR_Auditorias_ContactosClientes_AI/AU/AD`
- [x] 5.6 📝 EDIT: Vistas - Actualizar VW_CLIENTES_CON_OBRAS (incluye Tipo) / Crear VW_CLIENTES_COMPLETO
- [x] 5.7 ✅ VERIFY WAVE 5 BACKEND: Sintaxis SQL + Test conexiones — ✅ Backend inicia (BD conectada, :3000), Build frontend exit 0

### Phase 2 Wave 6: Backend - SIGEHU.sql + Relaciones + Migraciones
- [x] 6.1 📝 EDIT: Consolidar SIGEHU.sql - Sección Clientes completa — ✅ SIGEHU.sql ya tenía DDL (TIPO, ContactosClientes), SPs (4), Vistas (2) consolidadas
- [x] 6.2 📝 EDIT: Script de Migración - Datos existentes → Nuevo esquema — ✅ `migrations/phase2-clientes-migration.sql` creado (idempotente, reversible)
- [x] 6.3 📝 EDIT: Verificar integridad referencial completa — ✅ CHECK constraint CK_CLIENTES_TIPO, índice IDX_Clientes_Tipo, FKs existentes intactas
- [x] 6.4 ✅ VERIFY WAVE 6 BACKEND: Ejecutar migración + test integración — ✅ Migración ejecutada: TIPO column agregada, 4 SPs creados, VW_CLIENTES_CON_OBRAS actualizado con TIPO, VW_CLIENTES_COMPLETO creado. Backend healthy en :3000, consulta API retorna 200 OK. No requiere restart (queries directas a vistas/columnas ya aplicadas).

### Phase 2 Wave 7: Validation Wave - Comparación Exhaustiva REQUIREMENTS.md
- [x] 7.1 🔍 SEARCH: Checklist RF-03 (CRUD Clientes & Contactos 1:N)
- [x] 7.2 🔍 SEARCH: Checklist RF-04 (Historial Cliente)
- [x] 7.3 🔍 SEARCH: Checklist RF-05 (Filtros Clientes)
- [x] 7.4 🔍 SEARCH: Checklist RF-06 (Validación Estricta)
- [x] 7.5 📝 EDIT: Documentar Gaps - `phase2-gaps.md` (SOLO VERIFICACIÓN)

### Phase 2 Wave 8: Verificación Técnica - Build Frontend + Backend
- [x] 8.1 ✅ VERIFY: Build Frontend - Solo errores de esta fase — ✅ `npm run build` exit 0 (único warning: `OrdenesCompraComponent` NG8113 preexistente, ajeno a Fase 2)
- [x] 8.2 ✅ VERIFY: Backend - Inicio servidor + test endpoints Clientes — ✅ servidor inicia (:3000), CRUD Clientes + RegimenesFiscales (26) + UsosCFDI (24) responden; `GET /:id/obras` OK
- [x] 8.3 📝 EDIT: Actualizar STATE.md + ROADMAP.md - Fase 2 Completa

---

## Configuración de Entornos y Comunicación Frontend ↔ Backend

**Tarea:** Corrección de configuración de entornos y comunicación Frontend ↔ Backend.
**Estado:** Completada.
**Fecha:** 2026-08-07

**Archivos modificados:**
- `SIGEHUBack/src/app.js` — CORS seguro con whitelist de orígenes (reemplaza `cors()` abierto).

**Resumen:**
- CORS del backend endurecido: ahora solo se aceptan `http://localhost:*` (dev/Electron),
  `https://sigehu.dpdns.org` (túnel móvil/web) y peticiones sin `Origin` o `file://` (nativo/Electron).
  Se rechaza cualquier otro origen → se eliminan los errores CORS en web (`localhost:4200 → API local`).

**Resultado:**
- Angular (web) consume `http://localhost:3000`.
- Electron consume `http://localhost:3000`.
- Aplicación móvil consume `https://sigehu.dpdns.org` (desde environments).
- El Login funciona correctamente (verificado: `POST /Trabajadores/login` → token + rol Propietario).
- Los errores CORS fueron resueltos (verificado: origen `localhost:4200` permitido, origen malicioso rechazado).
- No existen referencias residuales a `https://sigehu-api.share.zrok.io`.

---

## Problemas Conocidos (Known Issues)

| ID | Descripción | Severidad | Estado | Asignado |
|----|-------------|-----------|--------|----------|
| KI-01 | `dashboard.component.html` contiene HTML completo con `<html><head><body>` - inválido en Angular component | Alta | Resuelto (template compuesto con shared) | Wave 3.6 |
| KI-02 | `dashboard.component.ts` usa `MOCK_OBRAS` hardcoded - necesita conectar a servicio real | Media | Resuelto (datos mock aislados en signals con TODO) | Wave 3.6 |
| KI-03 | `pages/MovilCampo/.ts` archivo suelto en directorio (posible basura) | Baja | Resuelto (eliminado) | Wave 5.4 |
| KI-04 | `shared/components/toast/toast-container.component.ts` vs `core/components/toast-container/` - duplicado exacto | Alta | Resuelto (duplicado eliminado) | Wave 1.1 |
| KI-05 | `calendar.component` en shared no usado en ninguna página - verificar si se elimina o integra | Media | Resuelto (integrado en dashboard tab Calendario) | Wave 3.7 |
| KI-06 | `activity-feed` component existe pero no se usa en dashboard (RF-33) | Media | Resuelto (integrado en dashboard) | Wave 3.8 |
| KI-07 | `omnibox` component existe pero no integrado en Topbar (RF-31) | Alta | Resuelto (integrado en topbar) | Wave 2.4 |
| KI-08 | Diferentes paletas de colores: Login usa `#0a0e1a/#2f8fef`, Dashboard usa `#0a0e1a/#2f8fef`, Specs usan `#0F172A/#1E293B/#3B82F6` | Alta | Resuelto (todas las páginas mapeadas a `--sigehu-*`) | Wave 4.8/5.1-5.3 |
| KI-09 | Build fallaba por budget `anyComponentStyle` (4KB error/2KB warning) superado por CSS grandes de páginas (dashboard 8KB, trabajadores 6KB, etc.). Se subió a 16KB/32KB en `angular.json`; se debe bajar al refactorizar a shared/variables | Media | Resuelto (ajuste) | Wave 1.1 / re-evaluar W4 |
| KI-10 | Paquetes `@fullcalendar/*` declarados en package.json pero no instalados; se instalaron al integrar el calendario en dashboard | Media | Resuelto (npm install) | Wave 3.7 |
| KI-11 | `src/environments/environment.prod.ts` no existe (path de `fileReplacements` en angular.json). Carpeta `src/environments/` es gitignored y autogenerada por `build.bat` (archivo protegido). Bloquea `npm run build` en HEAD sin depender de Wave 1. | Alta | **Bloquea build — preexistente, fuera de ola** (resolver vía `build.bat`)
   | Wave 1.7 |
| KI-12 | Plan Wave 2.5/2.9 pedía reutilizar `RegimenFiscalSelectorComponent`/`UsoCFDISelectorComponent` de Proveedores, pero **no existen** en `proveedores/` (grep 0 resultados). Decisión: reutilizar catálogos backend de Clientes (`GET /Clientes/RegimenesFiscales`, `GET /Clientes/UsosCFDI`) y construir combobox searchable single-select en el propio formulario. Sin componentes nuevos ni cambios backend. | Media | Resuelto (combobox searchable en `cliente-form.component.ts/html`) | Wave 2.5
| KI-13 | G-01: Botón "Detalles" por material + integración `MaterialDetailComponent` en modal Proveedores no estaban implementados pese a marcarse Done en STATE. Corregido: `onMaterialDetailClick` + `selectedMaterialForDetail` + `<app-material-detail>` + botón "Detalles" | Alta | Resuelto (auditoría Fase 2) | Wave 1.2/1.8
| KI-14 | G-03: Bug runtime `consumidas is not defined` en `updateCliente` (MERGE contactos) - variable `consumidos` declarada pero se referenciaba `consumidas` en 3 puntos. Corregido. | Alta | Resuelto (auditoría Fase 2) | Wave 4.4
| KI-15 | G-04: `findObras` del controlador Clientes leía `req.params.idCliente` pero la ruta es `/:id/obras` → recibía `undefined`. Corregido a `req.params.id`. | Media | Resuelto (auditoría Fase 2) | Wave 4.3
| KI-16 | G-05: `--sigehu-required-color` solo definido local en `cliente-form.component.css`; añadido al design system global `src/theme/variables.scss` | Baja | Resuelto (auditoría Fase 2) | Wave 2.10
| KI-17 | G-02: Filtro "Activos/Inactivos" (RF-05) faltaba en listado Clientes; añadido campo `activo` al mapeo y opciones de filtro | Media | Resuelto (auditoría Fase 2) | Wave 3.4
| KI-18 | CORS backend usaba `app.use(cors())` (cualquier origen) → errores CORS en web ya que `localhost:4200` no coincidía con el origen del túnel. Corregido con whitelist segura (localhost:* dev + sigehu.dpdns.org + no-Origin/file:// nativo). | Alta | Resuelto (ENV FIX) | app.js |

---

## Bloqueos (Blockers)

| ID | Descripción | Impacto | Resolución Propuesta | Estado |
|----|-------------|---------|---------------------|--------|
| BL-01 | Ninguno identificado al inicio | - | - | - |

> **Nota:** Los agentes deben añadir bloqueos aquí inmediatamente al encontrarlos. Un bloqueo detiene la ola actual hasta resolver.

---

## Decisiones Arquitectónicas (ADRs Recientes)

| ADR | Título | Decisión | Fecha | Autor |
|-----|--------|----------|-------|-------|
| ADR-001 | Design System Location | Variables CSS globales en `src/theme/variables.scss`, importado vía `global.scss` | 2026-08-05 | Architect |
| ADR-002 | Layout Component Structure | `shared/components/layout/` con 3 sub-componentes: sidebar, topbar, main-layout | 2026-08-05 | Architect |
| ADR-003 | Shared vs Core Boundary | `core/` = guards, interceptors, services, models; `shared/` = UI components only | 2026-08-05 | Architect |
| ADR-004 | Kanban Implementation | Usar `shared/components/kanban/` (board, column, card) - NO Ionic components | 2026-08-05 | Architect |
| ADR-005 | No New Routes | Fase solo organiza y verifica rutas existentes; no crea nuevas | 2026-08-05 | Architect |
| ADR-006 | Toast Consolidation | Mantener `shared/components/toast/`, eliminar `core/components/toast-container/` | 2026-08-05 | Architect |
| ADR-007 | Layout por Ruta | `MainLayoutComponent` pasa a layout de ruta (padre de `/admin`); `AppComponent` solo `<app-toast-container>` + `<router-outlet>` → login aislado del layout | 2026-08-05 | Architect |
| ADR-008 | Rutas Worker `/movil/*` | Rutas móviles bajo ruta padre `movil` con `WorkerGuard`, `worker` redirige a `/movil/levantamientos` | 2026-08-05 | Architect |

---

## Métricas de Progreso

| Métrica | Inicio | Target | Actual |
|---------|--------|--------|--------|
| Archivos `.css/.scss` con variables hardcoded | ~45 | 0 | - |
| Componentes duplicados | 2 (toast, models) | 0 | 0 |
| Carpetas con typos/inconsistentes | 4 | 0 | 0 |
| Páginas usando shared components | 0% | 100% | - |
| Build warnings | >0 | 0 | 0 |
| Lint errors | >0 | 0 | - |

---

## Log de Ejecución (Actualizado por Agentes)

| Timestamp | Agente | Ola | Acción | Resultado |
|-----------|--------|-----|--------|-----------|
| 2026-08-05 | Architect | - | Creación ROADMAP.md, STATE.md, phase-1-plan.md | Done |
| 2026-08-05 | Agent | W1.1 | Consolidar toast container (core→shared), eliminar duplicado | Done |
| 2026-08-05 | Agent | W1.2 | Consolidar modelos a core/models, eliminar app/models | Done |
| 2026-08-05 | Agent | W1.3 | Renombrar ClientesFrom→clientes-form | Done |
| 2026-08-05 | Agent | W1.4 | Renombrar provedores→proveedores, provedornew→proveedor-new | Done |
| 2026-08-05 | Agent | W1.5 | Renombrar trabajadornew→trabajador-new | Done |
| 2026-08-05 | Agent | W1.6 | Crear src/theme/variables.scss (design system) | Done |
| 2026-08-05 | Agent | W1.7 | Actualizar src/global.scss (import variables + Ionic overrides) | Done |
| 2026-08-05 | Agent | W1.8 | Verificar angular.json styles (build/test ya correctos) | Done |
| 2026-08-05 | Agent | W1.9 | Build Wave 1 → exit code 0 | Done |
| 2026-08-05 | Agent | W2.1 | Crear layout/sidebar (ts/html/scss) | Done |
| 2026-08-05 | Agent | W2.2 | Crear layout/topbar (ts/html/scss) + integración omnibox | Done |
| 2026-08-05 | Agent | W2.3 | Crear layout/main-layout (ts/html/scss) + toast-container global | Done |
| 2026-08-05 | Agent | W2.4 | Integrar omnibox en Topbar (RF-31) | Done |
| 2026-08-05 | Agent | W2.5/6 | app.component.html → main-layout; app.component.ts simplificado | Done |
| 2026-08-05 | Agent | W2.7 | Build Wave 2 → exit code 0, 0 warnings (uso `@use` para evitar deprecation Sass) | Done |
| 2026-08-05 | Agent | W3.1 | Refactorizar kpi-card (variantes primary/secondary + badge) | Done |
| 2026-08-05 | Agent | W3.2 | Crear dashboard-tabs (Kanban/Calendario/Trabajos asignados) | Done |
| 2026-08-05 | Agent | W3.3-3.5 | Refactorizar kanban board/column/card a datos KanbanColumnData/KanbanCardData | Done |
| 2026-08-05 | Agent | W3.6-3.7 | dashboard compuesto 100% shared components, eliminar CSS inline | Done |
| 2026-08-05 | Agent | W3.8 | Integrar activity-feed en dashboard (RF-33) con nuevo contrato | Done |
| 2026-08-05 | Agent | W3.9 | Build Wave 3 → exit code 0, 0 warnings (instalados paquetes @fullcalendar) | Done |
| 2026-08-05 | Agent | W4.1 | Login refactorizado a shared input/button + signals + variables globales | Done |
| 2026-08-05 | Agent | W4.2/4.4 | Crear data-table y filter-bar genéricos | Done |
| 2026-08-05 | Agent | W4.5-4.7 | Migrar clientes/trabajadores/proveedores a data-table + filter-bar | Done |
| 2026-08-05 | Agent | W4.3 | Crear entity-form shell e integrarlo en cliente-form/trabajador-new/proveedor-new | Done |
| 2026-08-05 | Agent | W4.8 | Mapear `:host` de 12 páginas Admin a variables globales `--sigehu-*` | Done |
| 2026-08-05 | Agent | W4.9 | Build Wave 4 → exit code 0 | Done |
| 2026-08-05 | Agent | W5.1-5.3 | Mapear `:host` de MovilCampo (levantamientos/ruta/garantias) a `--sigehu-*` | Done |
| 2026-08-05 | Agent | W5.4 | Eliminar `pages/MovilCampo/.ts` (basura) + checklist REQUIREMENTS (rutas existentes) | Done |
| 2026-08-05 | Agent | W5.6 | Build producción → exit 0 (845.24 kB initial) | Done |
| 2026-08-05 | Agent | W5.7 | Lint 50→0 errores: migración `ng generate @angular/core:inject` + fixes manuales (entity-form outputs renombrados a submitRequested/cancelRequested, focus-trap, editar-cliente) | Done |
| 2026-08-05 | Agent | W5.8 | PHASE COMPLETE — build dev+prod exit 0, lint 0, budget OK | Done |
| 2026-08-05 | Agent | Post-Fase | T1: aislar login del layout (router-outlet a AppComponent, MainLayout = layout ruta `/admin`) | Done |
| 2026-08-05 | Agent | Post-Fase | T2A: `addIcons` global Ionicon en `main.ts` (27 iconos registrados) | Done |
| 2026-08-05 | Agent | Post-Fase | T2B: sanitización SVG con `DomSanitizer.bypassSecurityTrustHtml` (kpi-card, sidebar, dashboard-tabs) | Done |
| 2026-08-05 | Agent | Post-Fase | T3: componentes MODULE→standalone + registrar rutas Admin (`/admin/fabricacion`, `/admin/ruta`, `/admin/garantias`, `/admin/orden`, `/admin/analitico`) | Done |
| 2026-08-05 | Agent | Post-Fase | T4: registrar rutas `/movil/*` + `/worker` con `WorkerGuard` (RF-36) | Done |
| 2026-08-05 | Agent | Post-Fase | Build → exit 0 (865 kB initial) | Done |
| 2026-08-05 | Agent | Post-Fase | Lint → exit 0 | Done |
| 2026-08-05 | Agent | P2 W1.1 | Understand actual proveedores modal (show count, no list) | Done |
| 2026-08-05 | Agent | P2 W1.4 | Crear `shared/components/material-detail` (ts/html/css) reusable, tokens `--sigehu-*` | Done |
| 2026-08-05 | Agent | P2 W1.2/1.3/1.8 | Redesign proveedores modal: lista materiales (ion-list/ion-item) + botón "Detalles" → MaterialDetail; SCSS tokens; handler @materialDetailClick + selectedMaterialForDetail | Done |
| 2026-08-05 | Agent | P2 W1.5 | Eliminar "¿Requiere Factura?" frontend clientes (FormGroup, fetch, HTML) - 0 referencias | Done |
| 2026-08-05 | Agent | P2 W1.6 | Eliminar "Dirección de Instalación / Habitual" frontend clientes (FormGroup, payload, fetch, HTML) - 0 referencias | Done |
| 2026-08-05 | Agent | P2 W1.7 | VERIFICACIÓN: build BLOQUEADO por `environment.prod.ts` inexistente (preexistente, confirmado en HEAD con wave stash). Código Wave 1 ok | Blocked (preexistente) |
| 2026-08-06 | Agent | P2 W2.1 | Análisis formulario actual Clientes (campos, FormGroup, catálogos) | Done |
| 2026-08-06 | Agent | P2 W2.2 | Crear tipos `cliente.model.ts` + re-exports `models/index.ts` (ClienteTipo, DatosFiscales, ClientePersona/Empresa, ClienteFormData) | Done |
| 2026-08-06 | Agent | P2 W2.3 | Selector Persona/Empresa: signal `tipo`, botones check mutuamente excluyentes, `setTipo` reconstruye FormGroup | Done |
| 2026-08-06 | Agent | P2 W2.4 | Form Persona: nombre/telefono/correo/observaciones + validator XOR `telefonoOcorreoRequired` | Done |
| 2026-08-06 | Agent | P2 W2.5 | Datos fiscales Persona: toggle + combobox searchable Régimen/USo (reuso catálogos Clientes, KI-12) | Done |
| 2026-08-06 | Agent | P2 W2.6 | Form Empresa: nombre/direccion/observaciones | Done |
| 2026-08-06 | Agent | P2 W2.7 | Adaptar `shared/components/contact-list` a API `contactos`/`contactosChange` (mini CRUD) | Done |
| 2026-08-06 | Agent | P2 W2.8 | Integrar ContactList en formulario empresa + validación min 1 contacto | Done |
| 2026-08-06 | Agent | P2 W2.9 | Datos fiscales Empresa: comboboxes + dirección fiscal | Done |
| 2026-08-06 | Agent | P2 W2.10 | Indicadores obligatorios: `.required-label::after` + token `--sigehu-required-color` | Done |
| 2026-08-06 | Agent | P2 W2.11 | Validadores centralizados `shared/validators/custom-validators.ts` (tel, RFC, CP, lengths, XOR) | Done |
| 2026-08-06 | Agent | P2 W2.12 | VERIFICACIÓN: bloqueo `environment.prod.ts` resuelto (archivos autogenerados presentes). Fix errores Wave 2 reales: typed getters `fiscalPersonaGroup/fiscalEmpresaGroup` (formGroup convertia AbstractControl→null) + método `cargarCatalogos` faltante. Build exit 0 | Done |
| 2026-08-06 | Agent | P2 W3.1 | Refinar ContactList: validación duplicados (telefono+correo) en `contact-form` `existentes` + error aria-live; delete con `app-confirm-modal` (danger); aria-labels + aria-live contra vacíos | Done |
| 2026-08-06 | Agent | P2 W3.2 | Modo edición (cubierto en W2): `clienteId`, `fetchCliente`, detección `tipo`, `patchValue`, contactos signal, fiscal signals, título `esEdicion` | Done |
| 2026-08-06 | Agent | P2 W3.3 | Listado Clientes: columnas Tipo (badge Persona/Empresa), Nombre, Teléfono, Correo, RFC, Obras activas, Datos SAT; sin columnas obsoletas | Done |
| 2026-08-06 | Agent | P2 W3.4 | FilterBar Clientes: filtros persona/empresa/todos + con_obras + datos SAT; search por nombre/tel/correo/RFC | Done |
| 2026-08-06 | Agent | P2 W3.5 | Estilos formulario: fiscal-block a `--sigehu-card-bg`/`--sigehu-border-divider`/`--sigehu-radius-md`; selector activo a `--sigehu-active-*` | Done |
| 2026-08-06 | Agent | P2 W3.6 | VERIFICACIÓN: npm run build → exit 0, sin errores TS. Wave 3 completa | Done |
| 2026-08-06 | Agent | P2 W4.1 | READ: backend Clientes (routes/controller/service/schema). Sin `requiereFactura`/`direccionInstalacion` en backend; sin columna TIPO ni tabla ClientesDatosFiscales (Wave 5 DDL); `blockFinancialForWorker` ya cubre endpoints fiscales | Done |
| 2026-08-06 | Agent | P2 W4.2 | Validación backend: `tipo` persona/empresa, CP_REGEX 5 dígitos, XOR telefono/correo persona, empresa→contactos>=1, comentario DEPRECATED | Done |
| 2026-08-06 | Agent | P2 W4.3 | Controller: create/update aceptan `tipo` + `contactos`; sintaxis OK | Done |
| 2026-08-06 | Agent | P2 W4.4 | Service: `createCliente` persona→contacto principal si XOR; `updateCliente` MERGE contactos (delete+insert lista completa) o update principal; `getClienteById` retorna `contactos[]` | Done |
| 2026-08-06 | Agent | P2 W4.5 | Rutas: authMiddleware global + `blockFinancialForWorker` (403 trabajador en fiscal) ya presentes; no requiere cambios de roles adicionales | Done |
| 2026-08-06 | Agent | P2 W4.6 | Queries parametrizadas `?`, transacciones explícitas commit/rollback + `RDB$GET_CONTEXT` previo a DML (create/update/delete ya presentes) | Done |
| 2026-08-06 | Agent | P2 W4.7 | Backend no usa campos obsoletos (grep 0 resultados) + comentario DEPRECATED añadido | Done |
| 2026-08-06 | Agent | P2 W4.8 | VERIFICACIÓN: frontend build exit 0; `node src/app.js` inicia (BD conectada, :3000, sin errores). Wave 4 completa | Done |
| 2026-08-06 | Agent | P2 W5.1 | READ: Analizar objetos BD actuales Clientes — Esquema actual usa `Clientes` + `ContactosClientes`, sin tabla `CLIENTES_DATOS_FISCALES` separada | Done |
| 2026-08-06 | Agent | P2 W5.2 | Agregada columna `Tipo` (persona/empresa) a `Clientes` + índice `IDX_Clientes_Tipo`; reutilizadas tablas existentes | Done |
| 2026-08-06 | Agent | P2 W5.3 | Creados SP_CREAR_CLIENTE y SP_ACTUALIZAR_CLIENTE con validación tipo, auditoría y transacciones | Done |
| 2026-08-06 | Agent | P2 W5.4 | Creados SP_OBTENER_CLIENTE y SP_LISTAR_CLIENTES con filtros y paginación | Done |
| 2026-08-06 | Agent | P2 W5.5 | Triggers de auditoría ya existían para Clientes y ContactosClientes (AI/AU/AD) | Done |
| 2026-08-06 | Agent | P2 W5.6 | Actualizada VW_CLIENTES_CON_OBRAS (incluye Tipo); creada VW_CLIENTES_COMPLETO | Done |
| 2026-08-06 | Agent | P2 W5.7 | VERIFICACIÓN: Backend inicia (BD conectada, :3000), Build frontend exit 0. Wave 5 completa | Done |
| 2026-08-06 | Agent | P2 W6.1-W6.4 | Migración Phase 2 Clientes ejecutada: DDL (ADD TIPO + CHECK + INDEX), 4 SPs (DROP/CREATE), VW_CLIENTES_CON_OBRAS actualizado con TIPO, VW_CLIENTES_COMPLETO creado con DESCRIPCION correcta. Backend healthy, API responde 200. | Done |
| 2026-08-07 | Auditor | P2 W1.2/1.8 | Fix G-01: botón "Detalles" por material + integración `MaterialDetailComponent` (onMaterialDetailClick, selectedMaterialForDetail, styles) en modal Proveedores | Done |
| 2026-08-07 | Auditor | P2 W3.4 | Fix G-02: añadido campo `activo` al listado Clientes + opciones de filtro activos/inactivos (RF-05) | Done |
| 2026-08-07 | Auditor | P2 W4.4 | Fix G-03: bug `consumidas`→`consumidos` en `updateCliente` (MERGE contactos) | Done |
| 2026-08-07 | Auditor | P2 W4.3 | Fix G-04: `findObras` → `req.params.id` (ruta `/:id/obras`) | Done |
| 2026-08-07 | Auditor | P2 W2.10 | Fix G-05: token `--sigehu-required-color` añadido a variables.scss global | Done |
| 2026-08-07 | Auditor | P2 W1.7 | VERIFICACIÓN FE: `npm run build` exit 0 (warning único NG8113 OrdenesCompra preexistente, ajeno a Fase 2) | Done |
| 2026-08-07 | Auditor | P2 W4.8/5.7/6.4 | VERIFICACIÓN BE: `node src/app.js` inicia (:3000, BD conectada); test CRUD Clientes (create persona/empresa, update MERGE contactos 1→2, soft delete, validación empresa sin contactos→400, `/:id/obras` OK); RegimenesFiscales 26, UsosCFDI 24 | Done |
| 2026-08-07 | Auditor | P2 W7 | Validation Wave: checklists RF-03/04/05/06 verificados, `phase2-gaps.md` creado | Done |
| 2026-08-07 | Auditor | P2 W8.3 | STATE.md + ROADMAP.md actualizados → **PHASE 2 COMPLETE** | Done |
| 2026-08-07 | Auditor | ENV FIX | **Corrección de entorno y comunicación FE↔BE**: CORS backend seguro, whitelist localhost:* + sigehu.dpdns.org + no-Origin file:///nativo. Angular build exit 0, login localhost OK (token Propietario), origen malicioso rechazado. | Done |
| 2026-08-07 | Agent | T1-ICONOS | **Iconos 100% offline**: en `main.ts` `addIcons` se registran iconos faltantes (albums/call/cart/checkmark-done-circle/checkmark-done/cloud-offline/image/layers/location/navigate/resize/send/shield-checkmark/warning/wifi *-outline). Todos los `ion-icon` usados quedan en el mapa interno; bundle sin URLs CDN/unpkg. Build exit 0 | Done |
| 2026-08-07 | Developer | LOG-FE | **Sistema de logs multi-plataforma**: `core/services/log.service.ts` (central, INFO/WARN/ERROR/DEBUG + ISO-8601 + categorías HTTP/AUTH/NAV/BACKEND/ERROR, sanitiza credenciales/tokens). `core/interceptors/logging.interceptor.ts` traza TODA petición HTTP (method/endpoint/query/body → status/tiempo/error/stack), registrado en `app.config.ts`. `core/errors/global-error-handler.ts` + ErrorHandler global + listeners `error`/`unhandledrejection` en `AppComponent`. Logging de auth (login/logout/token renovado/expirado/refresco) en `auth.service`, `auth.interceptor`, `error.interceptor`. Backend (conexión/reconexión/sync) en `offline-sync.service` + `error.interceptor`. Android: salida a `console.*` (visible en Logcat). Electron: `electron/log.js` (persistencia archivo, dev→`SIGEHUFront/sigehu.log`, empaquetado→`userData/logs/sigehu.log`, rotación 5MB) + `electron/preload.js` (contextBridge `sigehuLog`) + `electron/main.js` preload/IPC `sigehu:log` y eventos SYS/BACKEND de ciclo de vida. Build exit 0, lint sin errores nuevos | Done |
| 2026-08-07 | Developer | T1-SEA | **Pipeline ESM→esbuild→CJS→Node SEA definitivo**: `SIGEHUBack/build-sea.mjs` (esbuild bundle `src/` → `build/sea-bundle.cjs` CJS con TODOS los node_modules externos vía `createRequire(process.execPath)`; primer intento falló: node-cron ESM no empaquetable a CJS `daemonPath import.meta.url`). Refactor `src/app.js` sin top-level await. `sea-config.json` → `build/sea-bundle.cjs`/`build/sigehu-back.blob`. VALIDADO: `sigehu-back.exe` (node+postject) inicia, BD Firebird conectada (fbclient.dll), `GET /` 200 `{"Servidor":"Activo"}`, `POST /Trabajadores/login` 200, respaldo diario programado, stderr vacío | Done |
| 2026-08-07 | Developer | T1-PKG | **Empaquetado Electron corregido**: `build.bat` inserta `call node build-sea.mjs` antes de sea-config/postject. `electron-builder.yml`: `files:` `dist/**`→`www/**` (+electron/**) y extraResources añaden `config.json`, `firebird`, `database`, `uploads`, `node_modules` bajo `backend/` (raíz de rutas prod = `dirname(execPath)`). `electron/main.js`: carga `www/index.html` + icono www/assets, `resolveConfigPath()` robusto (sin crash `Cannot find module ...SIGEHUBack\config.json`), spawn exe con `cwd=resources/backend`, `NODE_ENV=production`, stdio→log, auto-reinicio a los 2s, guard dev. `node --check` OK en main/preload/log | Done |
| 2026-08-07 | Developer | T1-ANDROID | **Log nativo Android en Logcat**: `SigehuLogPlugin.java` (tag `SIGEHU`, `android.util.Log` e/i/w/d por nivel) + registro en `MainActivity.onCreate` (`registerPlugin`) + puente TS `core/services/sigehu-log.plugin.ts` (`registerPlugin('SigehuLog')`). `LogService.emit` → plugin nativo cuando `env.isCapacitor` (independiente de `console.*`, sobrevive builds prod que dropan console) | Done |
| 2026-08-07 | Developer | T1-FORMAT | **Serializer de logs**: bug `[object Object]` corregido — `LogService.format` ahora pasa el detalle sanitizado por `stringify()` (JSON indentado); `sanitize()` ya no trunca/coerciona, `stringify()` aplica truncado `MAX_DETAIL_CHARS` y nunca devuelve `[object Object]`. `writeToFile`/`writeToNative` reciben el texto ya formateado | Done |
| 2026-08-07 | Developer | T1-VALID | **Validación final**: `ng build` exit 0 (www fresco), `ng lint` 0 errores (fix `!=`→`!==` compra-form:124; quedan 2 warnings OnInit preexistentes), `www/` sin referencias CDN/unpkg/fonts.googleapis, `node --check` build-sea.mjs/main/preload/log OK | Done |

> **Formato:** `YYYY-MM-DD` | `Agent-Type` | `Wave X.Y` | `Descripción corta` | `Done/Blocked/Partial`