# DISEÑO_UI: SIGEHU — Fuente de Verdad de Diseño y de Componentes

> **Este documento es la ÚNICA fuente de verdad visual y de componentes** del sistema SIGEHU.
> Se consolida a partir de `docs/LAYOUT_ANALISIS.md`, `docs/DASHBOARD_ANALISIS.md`, `docs/LOGIN_ANALISIS.md`,
> `REQUIREMENTS.md`, `PROJECT.md` y la implementación vigente en `SIGEHUFront/src/app`.
>
> Toda página o componente nuevo **DEBE** cumplir estrictamente este documento. Cualquier divergencia
> visual frente a estos tokens y patrones se considera un defecto.
>
> Los tokens se implementan en `SIGEHUFront/src/theme/variables.scss` (prefijo `--sigehu-*`) y se
> importan vía `SIGEHUFront/src/global.scss`.

---

## 1. Principios de Diseño (No Negociables)

1. **Dark Mode / Modo Oscuro Profundo:** Fondo oscuro con tinte azul (slate). No es un modo invertido;
   es una construcción cuidada de azules muy oscuros que reduce la fatiga visual en uso prolongado.
2. **Flat / Enterprise UI:** Sin gradientes, sin texturas, sin biseles, sin sombras pronunciadas.
   Las capas se diferencian **exclusivamente por la luminosidad del fondo**.
3. **Densidad empresarial:** Maximizar la información útil sin saturar (dashboard moderno).
4. **Comunicación de estado clara:** Rojo = error/peligro; amarillo = pendiente/advertencia;
   azul = acción/atención; verde = éxito/cierre; morado = instalación.
5. **Confirmación de acciones irreversibles:** Desactivar clientes, cambios oficiales de estado de obra
   y cierre de garantías requieren obligatoriamente un modal de confirmación (RNF-07).

---

## 2. Paleta de Colores Oficial

| Token CSS | Valor | Rol |
|---|---|---|
| `--sigehu-sidebar-bg` | `#0F172A` | Fondo sidebar (más oscuro) |
| `--sigehu-topbar-bg` | `#1E293B` | Topbar, se fusiona con content |
| `--sigehu-content-bg` | `#1E293B` | Área de contenido principal |
| `--sigehu-active-bg` | `#1E3A8A` | Item activo / hover (fondo) |
| `--sigehu-active-text` | `#3B82F6` | Item activo (texto / icono) |
| `--sigehu-text-primary` | `#F8FAFC` | Títulos y texto destacado |
| `--sigehu-text-secondary` | `#94A3B8` | Subtítulos, placeholders, items inactivos |
| `--sigehu-text-tertiary` | `#64748B` | IDs, metadatos |
| `--sigehu-primary-btn-bg` | `#3B82F6` | Botón primario (fondo) |
| `--sigehu-primary-btn-text` | `#FFFFFF` | Botón primario (texto) |
| `--sigehu-search-bg` | `#0F172A` | Fondo de inputs de búsqueda |
| `--sigehu-border-divider` | `#334155` | Bordes y divisores |
| `--sigehu-notification-dot` | `#EF4444` | Punto de notificación |
| `--sigehu-avatar-bg` | `#3B82F6` | Fondo de avatar |
| `--sigehu-card-bg` | `#0F172A` | Fondo tarjeta Kanban |
| `--sigehu-accent` | `#3B82F6` | Color de acento global |
| `--sigehu-success` | `#10B981` | Éxito / Instalado / finalizadas |
| `--sigehu-warning` | `#F59E0B` | Alerta / Levantamiento |
| `--sigehu-danger` | `#EF4444` | Peligro / errores / Garantías |

### Estados de obra (puntos de color)

| Estado | Token | Color |
|---|---|---|
| Solicitud Recibida | `--sigehu-estado-solicitud` | `#94A3B8` (gris) |
| Levantamiento | `--sigehu-estado-levantamiento` | `#F59E0B` (amarillo) |
| En Fabricación | `--sigehu-estado-fabricacion` | `#3B82F6` (azul) |
| Instalación Programada | `--sigehu-estado-instalacion` | `#A855F7` (morado) |
| Instalado | `--sigehu-estado-instalado` | `#10B981` (verde) |
| Garantías | `--sigehu-estado-garantias` | `#EF4444` (rojo) |

### Badges

| Token | Color | Uso |
|---|---|---|
| `--sigehu-badge-pending-bg` | `#1E3A8A` | Badge info / "+3 este mes" |
| `--sigehu-badge-pending-text` | `#60A5FA` | idem |
| `--sigehu-badge-success-bg` | `#064E3B` | Badge verde |
| `--sigehu-badge-success-text` | `#10B981` | idem |
| `--sigehu-badge-warning-bg` | `#452703` | Badge pendiente (amarillo) |
| `--sigehu-badge-warning-text` | `#F59E0B` | idem |
| `--sigehu-badge-danger-bg` | `#450A0A` | Badge alta / rojo |
| `--sigehu-badge-danger-text` | `#EF4444` | idem |

---

## 3. Tipografía

- **Familia:** `'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif`.
- **Tamaños:** `xs` 10px (etiquetas) · `sm` 11px (IDs) · `base` 12px (metadata) · `md` 14px (títulos/columnas/
  métricas) · `lg` 16px (textos principales) · `xl` 18px (logo) · `2xl` 24px (título página / números KPI) ·
  `3xl` 32px (métricas grandes).
- **Pesos:** regular `400` · medium `500` · semibold `600` · bold `700`. Bold intenso para títulos.
- **Estilo:** Sin itálicas. Alineación izquierda general; centrado en login y CTAs.
- **Interlineado:** `1.5`. Tracking amplio (`0.05em`) en etiquetas mayúsculas "MÓDULOS".

---

## 4. Layout Principal (Admin)

Implementado por `shared/components/layout/` (sidebar, topbar, main-layout).

### 4.1 Sidebar
- Ancho `240px` (`--sigehu-sidebar-width`), altura `100vh`, fondo `--sigehu-sidebar-bg`. Sin borde derecho
  (separación por contraste de color). Sin sombras.
- **Logo:** icono de 3 capas (`#3B82F6`) + "SIGEHU" (18px bold) + "Herrería Utrilla" (12px gris).
- **Sección "MÓDULOS":** título 10px mayúsculas con tracking amplio.
- **Ítems de navegación:** icono outline `20x20` (stroke 1.5) + texto, gap `12px`, padding `10px 16px`,
  radio `8px`. Activo: fondo `#1E3A8A`, texto/icono `#3B82F6`, font Medium.
- **Footer:** ícon config + avatar `32px` `#3B82F6` + nombre (14px Medium) + rol (gris tenue).
- **Responsive:** `<1024px` sidebar oculta/colapsable, content ancho completo.

### 4.2 Topbar
- Altura `80px`, fondo `--sigehu-topbar-bg`, padding `0 24px`, `space-between`.
- **Izquierda:** título (24px bold) + subtítulo (14px gris, separador "·").
- **Derecha:** Omnibox (RF-31), campana notificaciones con dot rojo, botón "Nueva obra" (azul, radio 8px),
  avatar con chevron.

### 4.3 Main-Content
- Compone Sidebar + Topbar + `<router-outlet>` + `<app-toast-container>`.
- Contenido: padding `24px 32px`, max-width `1400px`, fondo `--sigehu-content-bg`.
- Es la **ruta padre de `/admin`**. `AppComponent` solo contiene toast-container + router-outlet (login aislado).

---

## 5. Componentes Compartidos Obligatorios

Toda la librería vive en `src/app/shared/components/`. **`shared/` = solo UI. `core/` = guards,
interceptors, services, models.**

### Catálogo obligatorio (reutilizar; prohibido duplicar)

| Componente | Carpeta (`shared/components/`) | Uso |
|---|---|---|
| `button` | `button` | Variantes primario / secundario / peligro |
| `input` | `input` | Campos con label, error, icono |
| `data-table` | `data-table` | Tabla genérica + `cell`/`actions` templates |
| `filter-bar` | `filter-bar` | Búsqueda / filtros |
| `entity-form` | `entity-form` | Formularios crear/editar genéricos |
| `confirm-modal` | `confirm-modal` | Modal de confirmación (acciones irreversibles) |
| `skeleton` | `skeleton` | Placeholders de carga |
| `empty-state` | `empty-state` | Estado sin datos |
| `error-page` | `error-page` | Página de error / acceso denegado |
| `kpi-card` | `kpi-card` | Tarjetas de métricas (primary/secondary) |
| `kanban` | `kanban` | Tablero Kanban (board, column, card) |
| `omnibox` | `omnibox` | Buscador global Spotlight (RF-31) |
| `dashboard` | `dashboard` | Tabs Kanban / Calendario / Trabajos asignados |
| `calendar` | `calendar` | Calendario mensual/semanal |
| `contact-list` | `contact-list` | Contactos 1:N de cliente |
| `activity-feed` | `activity-feed` | Feed cronológico de auditoría (RF-33) |
| `toast` | `toast` | Notificaciones toast |
| `layout` | `layout` | sidebar / topbar / main-layout |

### Convenciones de implementación
- Todos los componentes usan tokens `--sigehu-*`. **Prohibido** valores de color hardcodeados fuera de
  `variables.scss`.
- Componentes **standalone**. Imports directos por ruta (no barrel obligatorio).
- SVGs sanitizados con `DomSanitizer.bypassSecurityTrustHtml`; iconos Ionicon registrados globalmente
  en `main.ts`.

---

## 6. Patrón de Página Admin

Composición estándar de una página de listado (ver `clientes`, `trabajadores`, `proveedores`):

```
<section class="panel-frame">
  <header class="panel-header">  → título + descripción + botón acción principal </header>
  <app-filter-bar ... />           ← búsqueda/filtros opcional
  <app-data-table [columns] [data] [loading] [emptyMessage] rowKey=id>
    <ng-template #cell let-row let-col=column>    → switch por columna
    <ng-template #actions let-row>                → botones ver/editar/eliminar
  </app-data-table>
</section>
```

- **Acciones irreversibles** → siempre con `app-confirm-modal`, nunca `confirm()` nativo.
- **Carga:** `app-skeleton`. **Sin datos:** `app-empty-state`.
- **Acceso denegado (403 financiero / rol)** → `app-error-page`.

---

## 7. Tarjeta KPI

- Fondo `--sigehu-dashboard-bg`, borde 1px `#334155`, radio `12px`, padding `24px`, flex row:
  icono (48px, caja color suave) + `32px` bold (valor) + `14px` gris (label) + badge pill.
- Variantes: `primary` (ancha 40-45%, "Total de Obras Activas") y `secondary`.
- Badge: pill radio `999px`, padding `4px 12px`, 12px, variants info/success/warning/danger.

---

## 8. Kanban

- Columnas `300px`, gap `16px`. Título bold 14px + punto de color 8px + contador `20x20` + ícono "+".
- Botón "+ Agregar tarea" al pie.
- Card: fondo `#0F172A` (`--sigehu-card-bg`), borde `1px #334155`, radio `8px`, padding `16px`.
  ID (11px gris) · cliente (12px gris) · título bold 14px blanco · badges (pendiente/alta) ·
  footer fecha 11px + avatar + nombre.

---

## 9. Tablas de Datos

- Header `#1E293B`, texto secundario; bordes `#334155`. Filas alternas sutiles.
- Badges por estado/financiero en forma pill.
- **Responsive:** `<768px` scroll horizontal o conversión a tarjetas.

---

## 10. Modal de Confirmación (`confirm-modal`)

- Fondo backdrop `rgba(0,0,0,.5)`, tarjeta `#0F172A`/`#161F33`, radio `16px`, borde `1px #334155`.
- Variants: `default` (azul) / `danger` (rojo).
- Escape o click en backdrop cierran si `loading=false`.
- Botones: cancelar (ghost `#94A3B8`) / confirmar (primario o peligro).

---

## 11. Skeleton Screens (`skeleton`)

Tipos: `table-row`, `table-header`, `table`, `card`, `kanban-card`, `metric-card`, `avatar`, `text-line`,
`text-block`, `detail`, `circle`, `rect`. Animación shimmer (opacidad 0.4 ↔ 0.8).

---

## 12. Responsividad DUAL

- **Admin (Desktop):** `≥992px` sidebar fija. `<992px` sidebar colapsable.
- **Admin (Pantalla móvil):** `<768px` KPIs a ancho 100%, tablas en scroll/ cards, omnibox full-screen.
- **Worker (MovilCampo):** páginas usando **Ionic** (`ion-card`, `ion-input`, `ion-button`, `ion-list`)
  orientadas a táctil. El aislamiento de rutas se garantiza por Guard.

---

## 13. Aislamiento de Roles

- `/admin/**` → `AdminGuard` (bloquea trabajador, redirige a `/worker`).
- `/movil/*` + `/worker` → `WorkerGuard` (trabajador + admin por RF-36).
- Nunca se muestran montos/precios en rutas móviles; el backend responde `403` para operarios.

---

## 14. Identidad y Convenciones Técnicas

- Iconos outline stroke `≈1.5px`; logo = 3 capas azul `#3B82F6`.
- Radios: `6px` sm · `8px` md (botones/inputs/items) · `12px` lg (tarjetas) · `999px` pill.
- Sin sombras (elevación por contraste de fondo).
- Scrollbar dark (track `#0F172A`, thumb `#334155`).