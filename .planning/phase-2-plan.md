# PHASE-2-PLAN: SIGEHU - Módulo Clientes Completo - Plan de Ejecución Subatómico

> **Para Agentes Ejecutores:** Este plan contiene instrucciones **subatómicas** - cada tarea es tan específica que no requiere interpretación. Ejecuta en orden estricto. Si una tarea falla (build error), **DETENTE** y resuelve antes de continuar.
>
> **REGLA DE ORO:** Después de cada tarea marcada con `✅ VERIFY`, ejecutar `npm run build` (frontend) o `node src/app.js` (backend). Si falla → **NO CONTINUAR**. Fixear el error primero.

---

## CONVENCIONES DE EJECUCIÓN

| Símbolo | Significado |
|---------|-------------|
| `📝 EDIT` | Modificar archivo existente |
| `📄 CREATE` | Crear archivo nuevo |
| `📂 MOVE` | Mover archivo/carpeta |
| `🗑 DELETE` | Eliminar archivo/carpeta |
| `✅ VERIFY` | Ejecutar `npm run build` (FE) o `node src/app.js` (BE) y confirmar exit code 0 |
| `🔍 SEARCH` | Buscar patrón en codebase |
| `📖 READ` | Leer archivo para entender contexto |

**Regla de Oro:** Después de cada tarea marcada con `✅ VERIFY`, ejecutar build correspondiente. Si falla → **NO CONTINUAR**. Fixear el error primero.

---

## ESTRUCTURA DE OLAS (WAVES)

```
WAVE 1: Frontend - Proveedores Modal Detalles + Eliminaciones Clientes
WAVE 2: Frontend - Clientes Formulario Persona/Empresa + Selector + Datos Fiscales
WAVE 3: Frontend - Clientes Contactos CRUD + Validaciones + Indicadores Obligatorios
WAVE 4: Backend - Clientes Rutas, Controladores, Servicios, Queries
WAVE 5: Backend - Clientes Stored Procedures, Triggers, Vistas, Índices, Tablas
WAVE 6: Backend - SIGEHU.sql + Relaciones + Migraciones
WAVE 7: Validation Wave - Comparación exhaustiva contra REQUIREMENTS.md
WAVE 8: Verificación Técnica - Build Frontend + Backend + Fix solo errores de fase
```

---

## WAVE 1: FRONTEND - PROVEEDORES MODAL DETALLES + ELIMINACIONES CLIENTES (Tareas 1.1 - 1.8)

### 1.1 📖 READ + 🔍 SEARCH: Entender modal actual de proveedores
**Objetivo:** Analizar implementación actual del modal de detalles en `proveedores.component`

| Paso | Acción Exacta |
|------|---------------|
| 1.1.1 | Leer `SIGEHUFront/src/app/pages/Admin/proveedores/proveedores.component.ts` - buscar `openDetailModal`, `detailModal`, `selectedProveedor` |
| 1.1.2 | Leer `SIGEHUFront/src/app/pages/Admin/proveedores/proveedores.component.html` - estructura del modal actual |
| 1.1.3 | Leer `SIGEHUFront/src/app/pages/Admin/proveedores/proveedores.component.scss` - estilos del modal |
| 1.1.4 | `grep -r "materiales" SIGEHUFront/src/app/pages/Admin/proveedores/` - ver cómo se muestran materiales actualmente |
| 1.1.5 | Leer `SIGEHUFront/src/app/pages/Admin/proveedores/proveedor-new/proveedor-new.component.html` - patrón de formulario Agregar/Editar para replicar |

**Archivos esperados:** Ninguno (solo lectura)
**Criterios de salida:** Entender estructura actual: modal muestra solo COUNT de materiales, NO lista

---

### 1.2 📝 EDIT: Rediseñar modal de detalles Proveedores - Template
**Objetivo:** Reemplazar modal actual con diseño label-based igual a formulario Agregar/Editar

| Paso | Acción Exacta |
|------|---------------|
| 1.2.1 | En `proveedores.component.html`: Localizar `<ion-modal>` o `<app-confirm-modal>` de detalles |
| 1.2.2 | Reemplazar contenido del modal por estructura label-value replicando `proveedor-new.component.html` (solo lectura) |
| 1.2.3 | **Cambio crítico:** En lugar de badge "X materiales", crear lista `<ion-list>` con `<ion-item>` por material vinculado |
| 1.2.4 | Cada item material: nombre, descripción, unidad, **botón "Detalles"** (icono info/chevron) |
| 1.2.5 | Agregar `@Output() materialDetailClick = new EventEmitter<Material>()` en componente padre |
| 1.2.6 | En `proveedores.component.ts`: Agregar handler `onMaterialDetailClick(material: Material)` que emite evento |

**Qué NO modificar:** `proveedor-new.component.*`, servicios de proveedores, backend
**Archivos esperados:** `proveedores.component.html` (modificado), `proveedores.component.ts` (modificado)
**Criterios de aceptación:** Modal muestra lista completa de materiales con botón "Detalles" cada uno

---

### 1.3 📝 EDIT: Estilos modal Proveedores - SCSS
**Objetivo:** Aplicar design system tokens al modal rediseñado

| Paso | Acción Exacta |
|------|---------------|
| 1.3.1 | En `proveedores.component.scss`: Agregar estilos para `.modal-detail-grid` (label-value pairs) |
| 1.3.2 | Usar tokens: `--sigehu-text-secondary` para labels, `--sigehu-text-primary` para values |
| 1.3.3 | Estilizar lista materiales: `ion-item` con `--background: var(--sigehu-card-bg)`, `--border-color: var(--sigehu-border-divider)` |
| 1.3.4 | Botón "Detalles": `ion-button` con `fill="clear"`, `color="primary"`, `size="small"` |
| 1.3.5 | Responsive: modal `max-width: 600px` en desktop, `100%` en móvil |

**Archivos esperados:** `proveedores.component.scss` (modificado)
**Criterios de aceptación:** Modal visualmente consistente con formulario Agregar/Editar

---

### 1.4 📄 CREATE: Componente Material Detail View (reutilizable)
**Objetivo:** Crear componente standalone para detalle de material reutilizable

| Paso | Acción Exacta |
|------|---------------|
| 1.4.1 | Crear `SIGEHUFront/src/app/shared/components/material-detail/` |
| 1.4.2 | `material-detail.component.ts`: Input `material: Material`, standalone, usa `shared/components/button`, `shared/components/input` (solo lectura) |
| 1.4.3 | `material-detail.component.html`: Grid label-value completo (nombre, descripción, unidad, precio referencia, proveedor, stock) |
| 1.4.4 | `material-detail.component.scss`: Usar tokens `--sigehu-*`, layout responsive |
| 1.4.5 | Exportar en `shared/components/index.ts` si existe |

**Qué NO modificar:** Componentes existentes de materiales, catálogo
**Archivos esperados:** 3 archivos nuevos en `shared/components/material-detail/`
**Criterios de aceptación:** Componente reutilizable, usa design system, muestra todos los campos de material

---

### 1.5 🔍 SEARCH + 📝 EDIT: Eliminar "¿Requiere Factura?" del formulario Clientes
**Objetivo:** Remover completamente switch y campo del frontend

| Paso | Acción Exacta |
|------|---------------|
| 1.5.1 | `grep -r "requiereFactura\|requiere_factura\|Requiere Factura" SIGEHUFront/src/app/pages/Admin/clientes/` |
| 1.5.2 | En `cliente-form.component.html`: Eliminar `<ion-item>` o `<div>` que contenga el switch "¿Requiere Factura?" |
| 1.5.3 | En `cliente-form.component.ts`: Eliminar `requiereFactura` del `FormGroup`, del modelo `Cliente`, de `onSubmit()` |
| 1.5.4 | En `clientes.component.ts` (listado): Eliminar columna "Requiere Factura" si existe en tabla |
| 1.5.5 | Verificar que NO queda ninguna referencia en `cliente.model.ts` (si existe campo, marcar deprecated o eliminar) |

**Qué NO modificar:** Backend (se hace en Wave 4), base de datos
**Archivos esperados:** `cliente-form.component.html`, `cliente-form.component.ts`, `clientes.component.ts` (modificados)
**Criterios de aceptación:** 0 referencias a "Requiere Factura" en frontend Clientes

---

### 1.6 🔍 SEARCH + 📝 EDIT: Eliminar "Dirección de Instalación / Habitual" del formulario Clientes
**Objetivo:** Remover completamente campo del frontend

| Paso | Acción Exacta |
|------|---------------|
| 1.6.1 | `grep -r "direccionInstalacion\|direccion_instalacion\|Dirección de Instalación\|Dirección Habitual" SIGEHUFront/src/app/pages/Admin/clientes/` |
| 1.6.2 | En `cliente-form.component.html`: Eliminar campo completo (label + input + validaciones) |
| 1.6.3 | En `cliente-form.component.ts`: Eliminar `direccionInstalacion` del `FormGroup`, modelo, `onSubmit()` |
| 1.6.4 | En `clientes.component.ts`: Eliminar columna si existe en data-table |
| 1.6.5 | Verificar `cliente.model.ts`: Eliminar o deprecificar campo |

**Qué NO modificar:** Backend (Wave 4), base de datos
**Archivos esperados:** `cliente-form.component.html`, `cliente-form.component.ts`, `clientes.component.ts` (modificados)
**Criterios de aceptación:** 0 referencias a "Dirección de Instalación/Habitual" en frontend Clientes

---

### 1.7 ✅ VERIFY WAVE 1 FRONTEND: Build Angular
```bash
cd SIGEHUFront && npm run build
```
**Criterios de éxito:** Exit code 0, 0 errores TypeScript, 0 warnings
**Si falla:** Leer error → fixear archivo indicado → re-ejecutar. **NO PASAR A WAVE 2 HASTA VERDE.**

---

### 1.8 📝 EDIT: Actualizar proveedores.component.ts - Handler material detail
**Objetivo:** Conectar botón "Detalles" con componente MaterialDetail (preparación Wave 2)

| Paso | Acción Exacta |
|------|---------------|
| 1.8.1 | Importar `MaterialDetailComponent` en `proveedores.component.ts` |
| 1.8.2 | Agregar propiedad `selectedMaterialForDetail: Material | null = null` |
| 1.8.3 | Implementar `onMaterialDetailClick(material: Material)` → set propiedad + abrir modal |
| 1.8.4 | En template: Agregar `<app-material-detail *ngIf="selectedMaterialForDetail" [material]="selectedMaterialForDetail" (close)="selectedMaterialForDetail = null"></app-material-detail>` |
| 1.8.5 | Verificar que `Material` interface existe en `core/models/` |

**Archivos esperados:** `proveedores.component.ts` (modificado), `proveedores.component.html` (modificado)
**Criterios de aceptación:** Click en "Detalles" abre vista de material correctamente

---

## WAVE 2: FRONTEND - CLIENTES FORMULARIO PERSONA/EMPRESA + SELECTOR + DATOS FISCALES (Tareas 2.1 - 2.12)

### 2.1 📖 READ + 🔍 SEARCH: Analizar formulario actual Clientes
**Objetivo:** Entender estructura actual antes de rediseño completo

| Paso | Acción Exacta |
|------|---------------|
| 2.1.1 | Leer `SIGEHUFront/src/app/pages/Admin/clientes/cliente-form/cliente-form.component.ts` completo |
| 2.1.2 | Leer `SIGEHUFront/src/app/pages/Admin/clientes/cliente-form/cliente-form.component.html` completo |
| 2.1.3 | Leer `SIGEHUFront/src/app/pages/Admin/clientes/cliente-form/cliente-form.component.scss` completo |
| 2.1.4 | Leer `SIGEHUFront/src/app/core/models/cliente.model.ts` (o donde esté definido) |
| 2.1.5 | `grep -r "Persona\|Empresa\|tipoCliente" SIGEHUFront/src/app/pages/Admin/clientes/` |

**Archivos esperados:** Ninguno (solo lectura)
**Criterios de salida:** Documentar campos actuales, validaciones, estructura FormGroup

---

### 2.2 📄 CREATE: Interface/Type para nuevo modelo Cliente (Persona vs Empresa)
**Objetivo:** Definir tipos TypeScript que reflejen el nuevo diseño

| Paso | Acción Exacta |
|------|---------------|
| 2.2.1 | Crear/Actualizar `SIGEHUFront/src/app/core/models/cliente.model.ts` |
| 2.2.2 | Definir `type ClienteTipo = 'persona' | 'empresa'` |
| 2.2.3 | Interface `ClientePersona`: nombre, telefono, correo, observaciones, datosFiscales?: DatosFiscales |
| 2.2.4 | Interface `ClienteEmpresa`: nombre, direccion, observaciones, contactos: Contacto[], datosFiscales?: DatosFiscalesEmpresa |
| 2.2.5 | Interface `Contacto`: nombre, telefono, correo, observaciones |
| 2.2.6 | Interface `DatosFiscales`: rfc, razonSocial, regimenFiscal, usoCFDI, codigoPostal, direccion |
| 2.2.7 | Interface `DatosFiscalesEmpresa`: rfc, razonSocial, regimenFiscal, usoCFDI, codigoPostal, direccionFiscal |
| 2.2.8 | Union type `ClienteFormData = ClientePersona | ClienteEmpresa` con discriminator `tipo` |

**Qué NO modificar:** Backend models, base de datos
**Archivos esperados:** `cliente.model.ts` (actualizado/creado)
**Criterios de aceptación:** Tipos TypeScript reflejan exactamente requisitos Fase 2

---

### 2.3 📝 EDIT: Rediseñar template - Selector Persona/Empresa (Check Buttons Mutuamente Exclusivos)
**Objetivo:** Implementar selector visual de dos botones tipo check mutuamente exclusivos

| Paso | Acción Exacta |
|------|---------------|
| 2.3.1 | En `cliente-form.component.html`: Eliminar selector actual (select, radio, etc.) |
| 2.3.2 | Crear contenedor `.tipo-selector` con dos botones: |
| 2.3.3 | Botón 1: `<button type="button" class="tipo-btn" [class.active]="tipo() === 'persona'" (click)="setTipo('persona')">` |
| 2.3.4 | Botón 2: `<button type="button" class="tipo-btn" [class.active]="tipo() === 'empresa'" (click)="setTipo('empresa')">` |
| 2.3.5 | Labels: "Persona" | "Empresa" con iconos opcionales (user, building) |
| 2.3.6 | En `cliente-form.component.ts`: Signal `tipo = signal<ClienteTipo>('persona')`, método `setTipo(t: ClienteTipo)` |
| 2.3.7 | Al cambiar tipo: resetear FormGroup completo, reconstruir controles según tipo |

**Qué NO modificar:** Otros componentes, servicios
**Archivos esperados:** `cliente-form.component.html`, `cliente-form.component.ts` (modificados)
**Criterios de aceptación:** Solo un botón activo a la vez, cambio reconstruye formulario

---

### 2.4 📝 EDIT: Formulario Persona - Campos + Validaciones Condicionales
**Objetivo:** Implementar campos Persona con reglas teléfono/correo condicionales

| Paso | Acción Exacta |
|------|---------------|
| 2.4.1 | En `cliente-form.component.ts`: Método `buildPersonaForm()` que crea FormGroup con: |
| 2.4.2 | `nombre`: `['', [Validators.required, Validators.maxLength(150)]]` |
| 2.4.3 | `telefono`: `['', [Validators.pattern(/^[\d\s\-\+\(\)]{10,15}$/)]]` (NO required inicialmente) |
| 2.4.4 | `correo`: `['', [Validators.email, Validators.maxLength(100)]]` (NO required inicialmente) |
| 2.4.4 | `observaciones`: `['', [Validators.maxLength(500)]]` |
| 2.4.5 | **Validación cruzada:** Custom validator `telefonoOcorreoRequired` que valida: (telefono XOR correo) - al menos uno |
| 2.4.6 | Aplicar validator a nivel FormGroup: `this.personaForm.setValidators([telefonoOcorreoRequired])` |
| 2.4.7 | En template: Mostrar campos solo si `tipo() === 'persona'` usando `@if` |
| 2.4.8 | Agregar indicadores visuales obligatorios (asterisco rojo) solo en `nombre` |

**Reutilizar:** Validators de `shared/components/input` si existen patrones phone/email
**Archivos esperados:** `cliente-form.component.ts` (modificado), `cliente-form.component.html` (modificado)
**Criterios de aceptación:** Formulario Persona funcional, validación XOR teléfono/correo funciona

---

### 2.5 📝 EDIT: Datos Fiscales Persona - Switch + Campos + Searchers Reutilizados
**Objetivo:** Implementar sección Datos Fiscales colapsable con searchers de Proveedores

| Paso | Acción Exacta |
|------|---------------|
| 2.5.1 | En `cliente-form.component.ts`: Signal `showDatosFiscales = signal(false)` |
| 2.5.2 | En template: `<ion-toggle>` o checkbox "Datos Fiscales" que togglea signal |
| 2.5.3 | `@if (showDatosFiscales())` → mostrar grid de campos fiscales |
| 2.5.4 | Campos: `rfc`, `razonSocial`, `regimenFiscal`, `usoCFDI`, `codigoPostal`, `direccion` |
| 2.5.5 | **Searchers REUTILIZAR:** `regimenFiscal` y `usoCFDI` → usar mismo componente/búsqueda que Proveedores |
| 2.5.6 | `grep -r "regimenFiscal\|usoCFDI" SIGEHUFront/src/app/pages/Admin/proveedores/` → identificar componente |
| 2.5.7 | Importar y reutilizar `RegimenFiscalSelectorComponent` y `UsoCFDISelectorComponent` de Proveedores |
| 2.5.8 | **NO CREAR NUEVOS** - Solo seleccionar existentes (regla estricta) |
| 2.5.9 | Validaciones: RFC pattern MX (12-13 chars), CP 5 dígitos, requeridos si switch ON |

**Qué NO modificar:** Componentes de Proveedores (solo importar/reutilizar)
**Archivos esperados:** `cliente-form.component.ts`, `cliente-form.component.html` (modificados)
**Criterios de aceptación:** Switch muestra/oculta fiscales, searchers reutilizados de Proveedores

---

### 2.6 📝 EDIT: Formulario Empresa - Campos Base
**Objetivo:** Implementar campos base Empresa

| Paso | Acción Exacta |
|------|---------------|
| 2.6.1 | En `cliente-form.component.ts`: Método `buildEmpresaForm()` con FormGroup: |
| 2.6.2 | `nombre`: `['', [Validators.required, Validators.maxLength(150)]]` |
| 2.6.3 | `direccion`: `['', [Validators.maxLength(200)]]` |
| 2.6.4 | `observaciones`: `['', [Validators.maxLength(500)]]` |
| 2.6.5 | En template: `@if (tipo() === 'empresa')` mostrar campos |
| 2.6.6 | Indicador obligatorio solo en `nombre` |

**Archivos esperados:** `cliente-form.component.ts`, `cliente-form.component.html` (modificados)
**Criterios de aceptación:** Formulario Empresa base funcional

---

### 2.7 📄 CREATE: Componente Contact List (Contactos 1:N) - Mini CRUD
**Objetivo:** Crear componente reutilizable para gestión de contactos de empresa

| Paso | Acción Exacta |
|------|---------------|
| 2.7.1 | Crear `SIGEHUFront/src/app/shared/components/contact-list/` |
| 2.7.2 | `contact-list.component.ts`: |
| 2.7.3 | Inputs: `contactos: Contacto[]`, `readonly?: boolean` |
| 2.7.4 | Outputs: `contactosChange = output<Contacto[]>()` |
| 2.7.5 | Métodos: `addContacto()`, `editContacto(index)`, `deleteContacto(index)`, `validateContacto(contacto)` |
| 2.7.6 | Validación por contacto: mismo XOR teléfono/correo que Persona |
| 2.7.7 | Validación formulario: `contactos.length >= 1` (al menos uno requerido) |
| 2.7.8 | `contact-list.component.html`: Lista con `ion-item` por contacto, botones editar/eliminar, botón "+ Agregar" |
| 2.7.9 | Modal para agregar/editar contacto (reutilizar `shared/components/confirm-modal` o crear `contacto-modal`) |
| 2.7.10 | `contact-list.component.scss`: Usar tokens `--sigehu-*`, estilo consistente con data-table |

**Reutilizar:** Patrones de `entity-form` para modal, validaciones de input
**Archivos esperados:** 3 archivos en `shared/components/contact-list/`
**Criterios de aceptación:** CRUD contactos funcional, validación mínimo 1, validación XOR por contacto

---

### 2.8 📝 EDIT: Integrar ContactList en Formulario Empresa
**Objetivo:** Conectar componente ContactList al formulario principal

| Paso | Acción Exacta |
|------|---------------|
| 2.8.1 | En `cliente-form.component.ts`: Importar `ContactListComponent` |
| 2.8.2 | Agregar `contactos = signal<Contacto[]>([])` |
| 2.8.3 | En `buildEmpresaForm()`: NO incluir contactos en FormGroup (componente separado) |
| 2.8.4 | En template (empresa): `<app-contact-list [contactos]="contactos()" (contactosChange)="contactos.set($event)" />` |
| 2.8.5 | En `onSubmit()`: Validar `contactos().length >= 1` antes de enviar |
| 2.8.6 | En `onSubmit()`: Incluir contactos en payload: `{ ...formValue, contactos: this.contactos() }` |

**Archivos esperados:** `cliente-form.component.ts`, `cliente-form.component.html` (modificados)
**Criterios de aceptación:** Contactos integrados, validación mínimo 1 funciona

---

### 2.9 📝 EDIT: Datos Fiscales Empresa - Campos
**Objetivo:** Implementar sección Datos Fiscales para Empresa (similar a Persona pero dirección fiscal)

| Paso | Acción Exacta |
|------|---------------|
| 2.9.1 | En `cliente-form.component.ts`: Signal `showDatosFiscalesEmpresa = signal(false)` |
| 2.9.2 | En template (empresa): Toggle "Datos Fiscales" |
| 2.9.3 | `@if (showDatosFiscalesEmpresa())` → campos: `rfc`, `razonSocial`, `regimenFiscal`, `usoCFDI`, `codigoPostal`, `direccionFiscal` |
| 2.9.4 | Reutilizar mismos searchers `RegimenFiscalSelectorComponent` y `UsoCFDISelectorComponent` |
| 2.9.5 | Validaciones idénticas a Persona (RFC, CP, requeridos si switch ON) |

**Archivos esperados:** `cliente-form.component.ts`, `cliente-form.component.html` (modificados)
**Criterios de aceptación:** Datos fiscales empresa funcionales, searchers reutilizados

---

### 2.10 📝 EDIT: Indicadores visuales campos obligatorios - Diseño consistente
**Objetivo:** Establecer patrón visual unificado para campos requeridos

| Paso | Acción Exacta |
|------|---------------|
| 2.10.1 | En `SIGEHUFront/src/theme/variables.scss`: Verificar/agregar token `--sigehu-required-color: var(--sigehu-danger)` |
| 2.10.2 | En `shared/components/input/input.component.scss` (si existe): Estilizar label con `::after { content: '*'; color: var(--sigehu-required-color); margin-left: 4px; }` cuando `required` |
| 2.10.3 | Si NO existe input component: En `cliente-form.component.scss` agregar `.required-label::after` pattern |
| 2.10.4 | Aplicar clase `required` a labels de: nombre (ambos), teléfono/correo (condicional), fiscales (condicional), contactos (empresa) |
| 2.10.5 | Para validaciones condicionales: indicador dinámico que aparece solo cuando aplica (ej. teléfono required si no hay correo) |

**Reutilizar:** Componente `input` compartido si existe
**Archivos esperados:** `variables.scss` (posible), `input.component.scss` o `cliente-form.component.scss`
**Criterios de aceptación:** Todos los campos obligatorios tienen asterisco rojo consistente

---

### 2.11 📝 EDIT: Validaciones completas - Email, Phone, RFC, CP, Longitudes
**Objetivo:** Implementar todas las validaciones requeridas reutilizando existentes

| Paso | Acción Exacta |
|------|---------------|
| 2.11.1 | `grep -r "Validators.pattern\|email\|phone\|rfc" SIGEHUFront/src/app/shared/` - buscar validadores existentes |
| 2.11.2 | **Email:** Usar `Validators.email` nativo + maxLength 100 |
| 2.11.3 | **Teléfono:** Pattern `/^[\d\s\-\+\(\)]{10,15}$/` (10-15 dígitos con separadores) |
| 2.11.4 | **RFC México:** Pattern `/^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})?$/` (12-13 chars) |
| 2.11.5 | **Código Postal:** Pattern `/^\d{5}$/` (exacto 5 dígitos) |
| 2.11.6 | **Longitudes:** nombre 150, dirección 200, observaciones 500, razonSocial 200 |
| 2.11.7 | Centralizar validadores en `shared/validators/` si no existen (crear `custom-validators.ts`) |
| 2.11.8 | Aplicar a todos los FormControls correspondientes |
| 2.11.9 | Mostrar mensajes de error usando `shared/components/input` error display o pattern estándar |

**Reutilizar:** Validadores existentes en `shared/validators/` o componentes input
**Archivos esperados:** `cliente-form.component.ts`, posible `shared/validators/custom-validators.ts`
**Criterios de aceptación:** Todas las validaciones funcionan, mensajes claros, sin duplicar lógica

---

### 2.12 ✅ VERIFY WAVE 2 FRONTEND: Build Angular
```bash
cd SIGEHUFront && npm run build
```
**Criterios de éxito:** Exit code 0, 0 errores TypeScript, 0 warnings
**Si falla:** Fixear → re-build. **NO PASAR A WAVE 3 HASTA VERDE.**

---

## WAVE 3: FRONTEND - CLIENTES CONTACTOS CRUD + VALIDACIONES + INDICADORES (Tareas 3.1 - 3.6)

### 3.1 📝 EDIT: Refinar ContactListComponent - Edge Cases
**Objetivo:** Pulir componente contactos con casos borde

| Paso | Acción Exacta |
|------|---------------|
| 3.1.1 | Validar: No permitir contactos duplicados (mismo telefono+correo) |
| 3.1.2 | Validación en tiempo real mientras edita contacto en modal |
| 3.1.3 | Botón "Eliminar" con `app-confirm-modal` (acción irreversible) |
| 3.1.4 | Ordenar contactos: principal primero (primer agregado) |
| 3.1.5 | Accesibilidad: labels, aria-live para errores, focus management en modal |

**Archivos esperados:** `contact-list.component.ts/html/scss` (modificados)
**Criterios de aceptación:** CRUD robusto, accesible, sin duplicados

---

### 3.2 📝 EDIT: Formulario Clientes - Manejo Edición (Cargar datos existentes)
**Objetivo:** Soporte modo edición - poblar formulario con datos de BD

| Paso | Acción Exacta |
|------|---------------|
| 3.2.1 | En `cliente-form.component.ts`: Input `clienteId?: number` |
| 3.2.2 | En `ngOnInit()`: Si `clienteId`, llamar `clienteService.getById(clienteId)` |
| 3.2.3 | Mapear respuesta a nuevo modelo: detectar `tipo` (persona/empresa) |
| 3.2.4 | Setear `tipo.set(detectedTipo)`, reconstruir formulario correspondiente |
| 3.2.5 | PatchValue en FormGroup + setear `contactos signal` |
| 3.2.6 | Setear `showDatosFiscales` signals según presencia de datos |
| 3.2.7 | Título página: "Editar Cliente" vs "Nuevo Cliente" (via MainLayout pageConfig) |

**Qué NO modificar:** Service (ya existe), routing
**Archivos esperados:** `cliente-form.component.ts` (modificado)
**Criterios de aceptación:** Edición carga datos correctamente, tipo detectado automáticamente

---

### 3.3 📝 EDIT: Listado Clientes - Actualizar columnas data-table
**Objetivo:** Reflejar nuevo modelo en tabla de listado

| Paso | Acción Exacta |
|------|---------------|
| 3.3.1 | Leer `SIGEHUFront/src/app/pages/Admin/clientes/clientes.component.ts` |
| 3.3.2 | Actualizar `columns` config de `data-table`: |
| 3.3.3 | Columnas: Tipo (badge Persona/Empresa), Nombre/Razón Social, Teléfono principal, Email principal, RFC (si tiene), Acciones |
| 3.3.4 | Eliminar columnas: "Requiere Factura", "Dirección Instalación" |
| 3.3.5 | Cell template para Tipo: `<span class="badge" [class]="tipo === 'persona' ? 'badge-info' : 'badge-primary'">{{ tipo }}</span>` |
| 3.3.6 | Cell template para Tel/Email: mostrar primer contacto o campo directo |

**Archivos esperados:** `clientes.component.ts`, `clientes.component.html` (modificados)
**Criterios de aceptación:** Tabla muestra datos nuevos, sin columnas eliminadas

---

### 3.4 📝 EDIT: Filtros Clientes - Actualizar FilterBar
**Objetivo:** Filtros acordes a nuevos campos

| Paso | Acción Exacta |
|------|---------------|
| 3.4.1 | En `clientes.component.ts`: Actualizar `filterConfig` para `filter-bar` |
| 3.4.2 | Filtros: Buscar (nombre/razonSocial/tel/email), Tipo (Persona/Empresa/Todos), Con datos fiscales (Sí/No/Todos), Activos/Inactivos |
| 3.4.3 | Eliminar filtros obsoletos |

**Archivos esperados:** `clientes.component.ts` (modificado)
**Criterios de aceptación:** Filtros funcionales y relevantes

---

### 3.5 📝 EDIT: Estilos finales formulario - SCSS consistente
**Objetivo:** Pulir visual del formulario completo

| Paso | Acción Exacta |
|------|---------------|
| 3.5.1 | En `cliente-form.component.scss`: Layout grid responsivo (2 cols desktop, 1 col móvil) |
| 3.5.2 | Espaciado consistente: `var(--sigehu-space-4)` entre secciones, `var(--sigehu-space-2)` entre campos |
| 3.5.3 | Sección Datos Fiscales: fondo sutil `var(--sigehu-card-bg)`, borde `var(--sigehu-border-divider)`, radio `var(--sigehu-radius-md)` |
| 3.5.4 | Selector tipo: botones con estado activo claro (`var(--sigehu-active-bg)` + `var(--sigehu-active-text)`) |
| 3.5.5 | ContactList: integrar visualmente como sección más |
| 3.5.6 | Botones acciones (Guardar/Cancelar): `btn-primary` / `btn-secondary` alineados derecha |

**Archivos esperados:** `cliente-form.component.scss` (modificado)
**Criterios de aceptación:** Formulario visualmente consistente con DISEÑO_UI.md

---

### 3.6 ✅ VERIFY WAVE 3 FRONTEND: Build Angular
```bash
cd SIGEHUFront && npm run build
```
**Criterios de éxito:** Exit code 0, 0 errores TypeScript, 0 warnings
**Si falla:** Fixear → re-build. **NO PASAR A WAVE 4 HASTA VERDE.**

---

## WAVE 4: BACKEND - CLIENTES RUTAS, CONTROLADORES, SERVICIOS, QUERIES (Tareas 4.1 - 4.8)

### 4.1 📖 READ: Analizar backend actual Clientes
**Objetivo:** Entender estructura actual antes de modificaciones

| Paso | Acción Exacta |
|------|---------------|
| 4.1.1 | Leer `SIGEHUBack/src/routes/clientes.routes.js` (o .ts) |
| 4.1.2 | Leer `SIGEHUBack/src/controllers/clientes.controller.js` |
| 4.1.3 | Leer `SIGEHUBack/src/services/clientes.service.js` |
| 4.1.4 | Leer `SIGEHUBack/src/models/cliente.model.js` (si existe) |
| 4.1.5 | `grep -r "requiereFactura\|direccionInstalacion" SIGEHUBack/src/` - ubicaciones backend |

**Archivos esperados:** Ninguno (solo lectura)
**Criterios de salida:** Mapear endpoints, validaciones, queries actuales

---

### 4.2 📝 EDIT: Actualizar Modelo Cliente Backend
**Objetivo:** Reflejar nuevo esquema en modelo/validación backend

| Paso | Acción Exacta |
|------|---------------|
| 4.2.1 | En modelo/validación: Eliminar `requiereFactura`, `direccionInstalacion` |
| 4.2.2 | Agregar campos: `tipo` (ENUM 'persona'/'empresa'), `contactos` (JSON/array), `datosFiscales` (objeto) |
| 4.2.3 | Validaciones backend: RFC pattern, CP pattern, email, phone, XOR telefono/correo |
| 4.2.4 | Validación: Si empresa → contactos array length >= 1 |
| 4.2.5 | Validación: datosFiscales requeridos si flag activado |

**Qué NO modificar:** Otros modelos (Materiales, Proveedores, etc.)
**Archivos esperados:** `cliente.model.js` o validaciones en service/controller
**Criterios de aceptación:** Modelo backend coincide con frontend

---

### 4.3 📝 EDIT: Controlador Clientes - Endpoints CRUD
**Objetivo:** Actualizar controlador para nuevo payload

| Paso | Acción Exacta |
|------|---------------|
| 4.3.1 | `POST /api/clientes` - Crear: aceptar nuevo payload, validar, llamar service |
| 4.3.2 | `PUT /api/clientes/:id` - Actualizar: mismo payload, validar, llamar service |
| 4.3.3 | `GET /api/clientes` - Listar: retornar campos nuevos, paginación, filtros |
| 4.3.4 | `GET /api/clientes/:id` - Detalle: retornar completo con contactos y fiscales |
| 4.3.5 | `DELETE /api/clientes/:id` - Soft delete (ya existe, verificar) |
| 4.3.6 | Manejo errores: 400 validación, 404 no encontrado, 403 si trabajador (RNF-04) |

**Archivos esperados:** `clientes.controller.js` (modificado)
**Criterios de aceptación:** Endpoints aceptan/responden nuevo formato

---

### 4.4 📝 EDIT: Servicio Clientes - Lógica de negocio
**Objetivo:** Implementar lógica de persistencia nuevo modelo

| Paso | Acción Exacta |
|------|---------------|
| 4.4.1 | `create(data)`: Iniciar transacción, insertar cliente, insertar contactos (si empresa), insertar fiscales (si aplica), commit |
| 4.4.2 | `update(id, data)`: Transacción, actualizar cliente, upsert contactos, upsert fiscales |
| 4.4.3 | `getAll(filters)`: Query con joins contactos + fiscales, mapear a response DTO |
| 4.4.4 | `getById(id)`: Query con joins, mapear completo |
| 4.4.5 | `softDelete(id)`: UPDATE activo=0 (verificar que usa transacción) |
| 4.4.6 | **Regla Firebird:** SET `RDB$GET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID')` antes de DML |

**Qué NO modificar:** Servicios de otros módulos
**Archivos esperados:** `clientes.service.js` (modificado)
**Criterios de aceptación:** Servicio maneja transacciones, auditoría, nuevo modelo

---

### 4.5 📝 EDIT: Rutas Clientes - Verificar middleware auth/roles
**Objetivo:** Asegurar rutas protegidas correctamente

| Paso | Acción Exacta |
|------|---------------|
| 4.5.1 | Verificar `authMiddleware` en todas las rutas clientes |
| 4.5.2 | Verificar `roleMiddleware(['admin', 'propietario'])` para GET/POST/PUT/DELETE |
| 4.5.3 | Verificar que trabajadores reciben 403 en endpoints con datos fiscales (RNF-04) |
| 4.5.4 | Si no existe middleware financiero: agregar en rutas que retornan fiscales |

**Archivos esperados:** `clientes.routes.js` (modificado/verificado)
**Criterios de aceptación:** Rutas protegidas, 403 para trabajadores en datos fiscales

---

### 4.6 📝 EDIT: Queries SQL - Clientes (SELECT, INSERT, UPDATE)
**Objetivo:** Actualizar queries raw SQL para nuevo esquema

| Paso | Acción Exacta |
|------|---------------|
| 4.6.1 | `SELECT` listado: JOIN ContactosClientes, LEFT JOIN DatosFiscales (vista o subquery) |
| 4.6.2 | `SELECT` by id: JOIN completo con contactos y fiscales |
| 4.6.3 | `INSERT` cliente: INSERT INTO Clientes + INSERT INTO ContactosClientes (si empresa) + INSERT INTO ClientesDatosFiscales (si aplica) |
| 4.6.4 | `UPDATE` cliente: UPDATE Clientes + MERGE ContactosClientes + MERGE ClientesDatosFiscales |
| 4.6.5 | Usar parámetros preparados (`?`), NO concatenación |
| 4.6.6 | Transacciones explícitas: `BEGIN TRANSACTION`, `COMMIT`, `ROLLBACK` en service |

**Archivos esperados:** Queries en `clientes.service.js` o archivo SQL separado
**Criterios de aceptación:** Queries correctas, parametrizadas, transaccionales

---

### 4.7 📝 EDIT: Eliminar campos obsoletos de BD (Backend only - preparatorio Wave 5)
**Objetivo:** Marcar campos como deprecated en queries, no eliminar aún (Wave 5)

| Paso | Acción Exacta |
|------|---------------|
| 4.7.1 | En SELECT queries: NO incluir `REQUIERE_FACTURA`, `DIRECCION_INSTALACION` |
| 4.7.2 | En INSERT/UPDATE: NO escribir estos campos |
| 4.7.3 | Comentario en código: `// DEPRECATED: Phase 2 - removed from frontend` |

**Qué NO modificar:** Base de datos real (Wave 5), stored procedures (Wave 5)
**Archivos esperados:** `clientes.service.js` (comentarios)
**Criterios de aceptación:** Backend no usa campos eliminados

---

### 4.8 ✅ VERIFY WAVE 4 BACKEND: Test sintaxis + inicio servidor
```bash
cd SIGEHUBack && node src/app.js
```
**Criterios de éxito:** Servidor inicia sin errores, rutas clientes responden (probar con curl/Postman básico)
**Si falla:** Fixear → re-ejecutar. **NO PASAR A WAVE 5 HASTA VERDE.**

---

## WAVE 5: BACKEND - STORED PROCEDURES, TRIGGERS, VISTAS, ÍNDICES, TABLAS (Tareas 5.1 - 5.7)

### 5.1 📖 READ: Analizar objetos BD actuales Clientes
**Objetivo:** Entender SPs, triggers, vistas, índices existentes

| Paso | Acción Exacta |
|------|---------------|
| 5.1.1 | Leer `SIGEHU.sql` - buscar secciones Clientes, ContactosClientes, ClientesDatosFiscales |
| 5.1.2 | `grep -r "SP_.*CLIENTE\|TR_.*CLIENTE\|VW_.*CLIENTE" SIGEHU.sql` |
| 5.1.3 | Identificar triggers de auditoría en tablas clientes |
| 5.1.4 | Verificar índices actuales en Clientes, ContactosClientes |

**Archivos esperados:** Ninguno (solo lectura)
**Criterios de salida:** Inventario completo de objetos BD Clientes

---

### 5.2 📝 EDIT: Actualizar/Crear Tablas - Nuevo esquema Clientes
**Objetivo:** DDL para nuevo modelo (ALTER TABLE + nuevas tablas)

| Paso | Acción Exacta |
|------|---------------|
| 5.2.1 | `ALTER TABLE CLIENTES ADD TIPO VARCHAR(10) DEFAULT 'persona' CHECK (TIPO IN ('persona','empresa'))` |
| 5.2.2 | `ALTER TABLE CLIENTES DROP COLUMN REQUIERE_FACTURA` (comentar primero, confirmar no usado) |
| 5.2.3 | `ALTER TABLE CLIENTES DROP COLUMN DIRECCION_INSTALACION` (comentar primero) |
| 5.2.4 | **Nueva tabla:** `CLIENTES_CONTACTOS` (ID, CLIENTE_ID FK, NOMBRE, TELEFONO, CORREO, OBSERVACIONES, ES_PRINCIPAL, ACTIVO) |
| 5.2.5 | **Nueva tabla:** `CLIENTES_DATOS_FISCALES` (ID, CLIENTE_ID FK UNIQUE, RFC, RAZON_SOCIAL, REGIMEN_FISCAL_ID FK, USO_CFDI_ID FK, CODIGO_POSTAL, DIRECCION_FISCAL, TIPO_PERSONA) |
| 5.2.5 | FKs a `REGIMENES_FISCALES` y `USOS_CFDI` (catálogos SAT existentes) |
| 5.2.6 | Índices: `IDX_CLIENTES_CONTACTOS_CLIENTE`, `IDX_CLIENTES_FISCALES_CLIENTE`, `IDX_CLIENTES_TIPO` |

**GOLDEN RULE:** NO tocar tablas Materiales, Kits, Proveedores, Trabajadores, Obras, Garantías
**Archivos esperados:** `SIGEHU.sql` (modificado - sección DDL Clientes)
**Criterios de aceptación:** Esquema BD soporta nuevo modelo

---

### 5.3 📝 EDIT: Stored Procedure SP_CREAR_CLIENTE / SP_ACTUALIZAR_CLIENTE
**Objetivo:** SPs transaccionales para crear/actualizar cliente completo

| Paso | Acción Exacta |
|------|---------------|
| 5.3.1 | `SP_CREAR_CLIENTE` (params: tipo, nombre, telefono, correo, observaciones, datos_fiscales_json, contactos_json) |
| 5.3.2 | Iniciar transacción, insertar CLIENTES, obtener ID, insertar CONTACTOS (si empresa), insertar FISCALES (si aplica), commit |
| 5.3.3 | `SP_ACTUALIZAR_CLIENTE` (params: id, tipo, nombre, telefono, correo, observaciones, datos_fiscales_json, contactos_json) |
| 5.3.4 | Transacción: update CLIENTES, MERGE CONTACTOS (delete removed, insert new, update existing), MERGE FISCALES, commit |
| 5.3.5 | Validaciones en SP: RFC único (si proporcionado), al menos 1 contacto si empresa |
| 5.3.6 | `RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', :user_id)` al inicio |

**Archivos esperados:** `SIGEHU.sql` (modificado - sección SPs Clientes)
**Criterios de aceptación:** SPs transaccionales, auditables, validan reglas negocio

---

### 5.4 📝 EDIT: Stored Procedure SP_OBTENER_CLIENTE / SP_LISTAR_CLIENTES
**Objetivo:** SPs de lectura optimizados

| Paso | Acción Exacta |
|------|---------------|
| 5.4.1 | `SP_OBTENER_CLIENTE(:id)` → retorna cliente + contactos + fiscales (JSON o múltiples result sets) |
| 5.4.2 | `SP_LISTAR_CLIENTES(:filtro, :tipo, :con_fiscales, :activo, :page, :page_size)` → paginado, filtros |
| 5.4.3 | Usar vistas o CTEs para joins eficientes |
| 5.4.4 | NO incluir campos deprecated en output |

**Archivos esperados:** `SIGEHU.sql` (modificado)
**Criterios de aceptación:** SPs lectura funcionan, performance adecuada

---

### 5.5 📝 EDIT: Triggers de Auditoría - Tablas nuevas
**Objetivo:** Extender auditoría a nuevas tablas

| Paso | Acción Exacta |
|------|---------------|
| 5.5.1 | Trigger `TR_CLIENTES_CONTACTOS_AU` (AFTER INSERT/UPDATE/DELETE) → insertar en AUDITORIAS_DETALLES |
| 5.5.2 | Trigger `TR_CLIENTES_DATOS_FISCALES_AU` (AFTER INSERT/UPDATE/DELETE) → auditoría |
| 5.5.3 | Usar `RDB$GET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID')` para usuario |
| 5.5.4 | Capturar: OLD.*, NEW.*, tabla, operación, timestamp |
| 5.5.5 | Verificar trigger existente `TR_CLIENTES_AU` sigue funcionando |

**Archivos esperados:** `SIGEHU.sql` (modificado - sección Triggers)
**Criterios de aceptación:** Auditoría completa en nuevas tablas

---

### 5.6 📝 EDIT: Vistas - Actualizar VW_CLIENTES / Crear VW_CLIENTES_COMPLETO
**Objetivo:** Vistas para listados y reportes

| Paso | Acción Exacta |
|------|---------------|
| 5.6.1 | Actualizar `VW_CLIENTES` (si existe): agregar TIPO, contar contactos, flag tiene_fiscales |
| 5.6.2 | Crear `VW_CLIENTES_COMPLETO`: JOIN Clientes + Contactos (agregados) + Fiscales |
| 5.6.3 | Columnas: ID, TIPO, NOMBRE, TELEFONO_PRINCIPAL, CORREO_PRINCIPAL, RFC, CONTACTOS_COUNT, TIENE_FISCALES, ACTIVO |
| 5.6.4 | Optimizada para `data-table` frontend |

**Archivos esperados:** `SIGEHU.sql` (modificado - sección Vistas)
**Criterios de aceptación:** Vistas usadas por backend, columnas correctas

---

### 5.7 ✅ VERIFY WAVE 5 BACKEND: Sintaxis SQL + Test conexiones
```bash
cd SIGEHUBack && node -e "require('./src/app.js')"  # Verificar que carga SPs sin error sintaxis
# Opcional: isql -i SIGEHU.sql para validar DDL (si Firebird local)
```
**Criterios de éxito:** Sin errores sintaxis SQL, SPs compilan en Firebird
**Si falla:** Fixear SQL → re-verificar. **NO PASAR A WAVE 6 HASTA VERDE.**

---

## WAVE 6: BACKEND - SIGEHU.sql + RELACIONES + MIGRACIONES (Tareas 6.1 - 6.4)

### 6.1 📝 EDIT: Consolidar SIGEHU.sql - Sección Clientes completa
**Objetivo:** Archivo SQL único con todo esquema Clientes actualizado

| Paso | Acción Exacta |
|------|---------------|
| 6.1.1 | Reorganizar `SIGEHU.sql`: Sección `-- ============================================ CLIENTES` |
| 6.1.2 | Incluir: Tablas (Clientes, Contactos, Fiscales), Índices, SPs (CRUD), Triggers, Vistas |
| 6.1.3 | Comentar/separar campos deprecated: `-- DEPRECATED Phase 2: REQUIERE_FACTURA, DIRECCION_INSTALACION` |
| 6.1.4 | Verificar que catálogos `REGIMENES_FISCALES`, `USOS_CFDI` existen y tienen datos semilla |
| 6.1.5 | Agregar datos semilla para testing si no existen |

**Archivos esperados:** `SIGEHU.sql` (modificado - sección Clientes consolidada)
**Criterios de aceptación:** Archivo SQL completo, ejecutable, documentado

---

### 6.2 📝 EDIT: Script de Migración - Datos existentes → Nuevo esquema
**Objetivo:** Migrar datos de clientes actuales al nuevo modelo

| Paso | Acción Exacta |
|------|---------------|
| 6.2.1 | Crear `SIGEHUBack/migrations/phase2-clientes-migration.sql` |
| 6.2.2 | `INSERT INTO CLIENTES_CONTACTOS`: Para cada cliente actual, si tiene telefono/correo → crear contacto principal |
| 6.2.3 | `INSERT INTO CLIENTES_DATOS_FISCALES`: Para clientes con RFC/razonSocial → migrar |
| 6.2.4 | `UPDATE CLIENTES SET TIPO = CASE WHEN ... THEN 'empresa' ELSE 'persona' END` (heurística: si tiene contactos múltiples o razonSocial → empresa) |
| 6.2.5 | Manejo NULLs: telefono/correo opcionales, RFC opcional |
| 6.2.6 | Transacción única para toda migración |
| 6.2.7 | Rollback script: `DELETE FROM CLIENTES_CONTACTOS; DELETE FROM CLIENTES_DATOS_FISCALES; UPDATE CLIENTES SET TIPO='persona'` |

**Archivos esperados:** `phase2-clientes-migration.sql` (nuevo)
**Criterios de aceptación:** Migración idempotente, reversible, preserva datos

---

### 6.3 📝 EDIT: Verificar integridad referencial completa
**Objetivo:** FKs, constraints, cascadas correctas

| Paso | Acción Exacta |
|------|---------------|
| 6.3.1 | `CLIENTES_CONTACTOS.CLIENTE_ID` → `CLIENTES.ID` ON DELETE CASCADE |
| 6.3.2 | `CLIENTES_DATOS_FISCALES.CLIENTE_ID` → `CLIENTES.ID` ON DELETE CASCADE |
| 6.3.3 | `CLIENTES_DATOS_FISCALES.REGIMEN_FISCAL_ID` → `REGIMENES_FISCALES.ID` ON DELETE SET NULL |
| 6.3.4 | `CLIENTES_DATOS_FISCALES.USO_CFDI_ID` → `USOS_CFDI.ID` ON DELETE SET NULL |
| 6.3.5 | Unique constraint: `CLIENTES_DATOS_FISCALES.CLIENTE_ID` (1:1) |
| 6.3.6 | Check constraint: `CLIENTES.TIPO IN ('persona','empresa')` |

**Archivos esperados:** `SIGEHU.sql` (verificado/ajustado)
**Criterios de aceptación:** Integridad referencial completa, sin orphan records posibles

---

### 6.4 ✅ VERIFY WAVE 6 BACKEND: Ejecutar migración + test integración
```bash
cd SIGEHUBack && node src/app.js
# Test manual: POST /api/clientes con payload nuevo → verificar BD
```
**Criterios de éxito:** Migración ejecuta sin error, API funciona con nuevo esquema
**Si falla:** Rollback → fixear → re-ejecutar. **NO PASAR A WAVE 7 HASTA VERDE.**

---

## WAVE 7: VALIDATION WAVE - COMPARACIÓN EXHAUSTIVA CONTRA REQUIREMENTS.md (Tareas 7.1 - 7.5)

> **REGLA ESTRICTA:** ESTA OLA NO IMPLEMENTA NADA. SOLO VERIFICA. Detecta diferencias, inconsistencias, omisiones.

### 7.1 🔍 SEARCH: Checklist RF-03 (CRUD Clientes & Contactos 1:N)
**Objetivo:** Verificar cumplimiento completo RF-03

| Requisito RF-03 | Verificación | Estado |
|-----------------|--------------|--------|
| Obligatorio: Nombre/Razón Social | Frontend: required en nombre (ambos tipos). Backend: NOT NULL | [ ] |
| Múltiples contactos/teléfonos (1:N) | Frontend: ContactList CRUD. Backend: tabla CLIENTES_CONTACTOS | [ ] |
| Opcionales: Email, Dirección, RFC, Régimen, CP, Uso CFDI | Frontend: campos en fiscales. Backend: columnas NULLables | [ ] |
| Soft-delete desactivando registro | Frontend: botón desactivar + confirm-modal. Backend: UPDATE ACTIVO=0 | [ ] |

**Acción:** Marcar cada fila. Si [ ] → documentar gap en `phase2-gaps.md`

---

### 7.2 🔍 SEARCH: Checklist RF-04 (Historial Cliente)
**Objetivo:** Verificar perfil cliente con historial obras

| Requisito RF-04 | Verificación | Estado |
|-----------------|--------------|--------|
| Perfil muestra historial completo obras | Existe endpoint `GET /api/clientes/:id/obras` o incluido en detail | [ ] |
| Estados actuales obras | Response incluye estado_obra por cada obra | [ ] |
| Montos (solo admin) | Backend filtra montos si rol trabajador (RNF-04) | [ ] |
| Fechas clave | Response incluye fechas creación, levantamiento, instalación | [ ] |

---

### 7.3 🔍 SEARCH: Checklist RF-05 (Filtros Clientes)
**Objetivo:** Verificar filtros implementados

| Requisito RF-05 | Verificación | Estado |
|-----------------|--------------|--------|
| Filtro activos/inactivos | FilterBar tiene select Activo/Inactivo/Todos | [ ] |
| Filtro con/sin datos fiscales | FilterBar tiene select Con Fiscales/Sin Fiscales/Todos | [ ] |

---

### 7.4 🔍 SEARCH: Checklist RF-06 (Validación Estricta)
**Objetivo:** Verificar validaciones frontend + backend

| Requisito RF-06 | Verificación | Estado |
|-----------------|--------------|--------|
| Teléfono 10-15 dígitos | Pattern frontend + backend coincide | [ ] |
| RFC mexicano 12-13 chars | Pattern frontend + backend coincide | [ ] |
| Email válido | Validators.email + backend validation | [ ] |
| Tiempo real | Frontend muestra errores al escribir (blur/change) | [ ] |

---

### 7.5 📝 EDIT: Documentar Gaps - `phase2-gaps.md`
**Objetivo:** Registro formal de desviaciones

| Paso | Acción Exacta |
|------|---------------|
| 7.5.1 | Crear `.planning/phase2-gaps.md` |
| 7.5.2 | Listar cada gap encontrado: Requisito, Esperado, Actual, Severidad (Bloqueador/Mayor/Menor) |
| 7.5.3 | Para cada gap: Plan de acción (tarea futura) o Justificación (fuera de alcance) |
| 7.5.4 | Firmar: "Validation Wave completada - Gaps documentados" |

**Archivos esperados:** `.planning/phase2-gaps.md` (nuevo)
**Criterios de salida:** 100% requisitos mapeados, gaps documentados

---

## WAVE 8: VERIFICACIÓN TÉCNICA - BUILD FRONTEND + BACKEND (Tareas 8.1 - 8.3)

### 8.1 ✅ VERIFY: Build Frontend - Solo errores de esta fase
```bash
cd SIGEHUFront && npm run build
```
**Regla:** Fixear **SOLO** errores de compilación relacionados con cambios Fase 2 (clientes, proveedores modal, contact-list, validators). NO refactorizar código ajeno.

**Criterios de éxito:** Exit code 0

---

### 8.2 ✅ VERIFY: Backend - Inicio servidor + test endpoints Clientes
```bash
cd SIGEHUBack && node src/app.js
# Test rápido:
curl -X GET http://localhost:3000/api/clientes
curl -X POST http://localhost:3000/api/clientes -H "Content-Type: application/json" -d '{"tipo":"persona","nombre":"Test"}'
```
**Regla:** Fixear **SOLO** errores runtime relacionados con Fase 2.

**Criterios de éxito:** Servidor estable, endpoints Clientes responden 200/201/400 (validación)

---

### 8.3 📝 EDIT: Actualizar STATE.md + ROADMAP.md - Fase 2 Completa
**Objetivo:** Registrar finalización formal

| Paso | Acción Exacta |
|------|---------------|
| 8.3.1 | Actualizar `.planning/STATE.md`: Agregar Phase 2 con waves, tareas, estado Complete |
| 8.3.2 | Actualizar `.planning/ROADMAP.md`: Insertar Phase 2 después de Phase 1 |
| 8.3.3 | Actualizar `.planning/phase-2-plan.md`: Marcar todas las tareas `[x]` |
| 8.3.4 | Verificar que no hay tareas pendientes sin marcar |

**Archivos esperados:** `STATE.md`, `ROADMAP.md`, `phase-2-plan.md` (actualizados)
**Criterios de aceptación:** Documentación sincronizada, fase marcada Complete

---

## RIESGOS Y ESTRATEGIAS DE ROLLBACK

| Riesgo | Probabilidad | Impacto | Estrategia de Rollback |
|--------|-------------|---------|------------------------|
| Breaking changes en Proveedores modal | Media | Alto | Wave 1.2: Backup `proveedores.component.*` antes de modificar. Rollback: `git checkout -- proveedores.component.*` |
| Formulario Clientes complejo rompe edición | Alta | Alto | Wave 2.3: Feature flag `useNewClienteForm` para toggle viejo/nuevo. Rollback: flag=false |
| Migración BD pierde datos | Baja | Crítico | Wave 6.2: Script de rollback incluido. Ejecutar en transacción. Backup BD antes (`gbak`) |
| Searchers Proveedores no reutilizables | Media | Medio | Wave 2.5: Si no existen componentes separados, crear wrappers mínimos NO modificar Proveedores |
| Validaciones XOR teléfono/correo fallan | Media | Medio | Wave 2.4: Unit tests para custom validator. Rollback: validator simple required en ambos |
| Backend 403 financiero no aplica | Baja | Alto | Wave 4.5: Test manual con token trabajador. Rollback: middleware previo |

---

## ARCHIVOS CLAVE A MODIFICAR (RESUMEN)

### Frontend (SIGEHUFront)
```
src/app/pages/Admin/proveedores/proveedores.component.ts/html/scss
src/app/pages/Admin/clientes/cliente-form/cliente-form.component.ts/html/scss
src/app/pages/Admin/clientes/clientes.component.ts
src/app/shared/components/material-detail/ (NEW)
src/app/shared/components/contact-list/ (NEW)
src/app/shared/validators/custom-validators.ts (NEW o existente)
src/theme/variables.scss (posible token required-color)
src/app/core/models/cliente.model.ts
```

### Backend (SIGEHUBack)
```
src/routes/clientes.routes.js
src/controllers/clientes.controller.js
src/services/clientes.service.js
src/models/cliente.model.js (si existe)
SIGEHU.sql (sección Clientes completa)
migrations/phase2-clientes-migration.sql (NEW)
```

### Planning
```
.planning/phase-2-plan.md (este archivo - marcar tareas)
.planning/STATE.md (registrar fase)
.planning/ROADMAP.md (insertar fase)
.planning/phase2-gaps.md (validation wave)
```

---

## CRITERIOS DE SALIDA FASE 2 (DEFINITION OF DONE)

1. ✅ **Proveedores Modal:** Muestra lista materiales + botón "Detalles" → abre vista reutilizable
2. ✅ **Clientes Formulario:** Selector Persona/Empresa mutuamente exclusivo funcional
3. ✅ **Persona:** Nombre (req), Tel/Correo (XOR req), Obs, Datos Fiscales (switch) con searchers Proveedores
4. ✅ **Empresa:** Nombre (req), Dirección, Obs, Contactos 1:N (min 1, XOR tel/correo), Datos Fiscales (switch)
5. ✅ **Eliminados:** "¿Requiere Factura?", "Dirección Instalación/Habitual" - 0 referencias frontend
6. ✅ **Indicadores obligatorios:** Asterisco rojo consistente en todos los campos requeridos
7. ✅ **Validaciones:** Email, Phone (10-15), RFC (MX), CP (5 díg), longitudes - frontend + backend
8. ✅ **Backend:** Rutas, controladores, servicios, queries, transacciones, auditoría, 403 financiero
9. ✅ **BD:** Tablas nuevas, SPs CRUD, triggers auditoría, vistas, índices, migración datos
10. ✅ **Validation Wave:** 100% RF-03, RF-04, RF-05, RF-06 mapeados, gaps documentados
11. ✅ **Build Frontend:** `npm run build` exit 0
12. ✅ **Backend:** `node src/app.js` inicia, endpoints Clientes funcionales
13. ✅ **Documentación:** STATE.md, ROADMAP.md, phase-2-plan.md actualizados

---

**FIN DEL PLAN PHASE 2**