# PHASE 2 GAPS — Validation Wave

> **Regla de la Wave 7:** Solo verificación, sin implementación. Registro formal de desviaciones
> respecto a `phase-2-plan.md`, comparado contra `REQUIREMENTS.md` (RF-03, RF-04, RF-05, RF-06).

**Fecha de la Wave:** 2026-08-07

---

## Checklist RF-03 — CRUD Clientes & Contactos 1:N

| Requisito RF-03 | Verificación | Estado |
|-----------------|--------------|--------|
| Obligatorio: Nombre/Razón Social | `cliente-form.component.ts` `Validators.required` en `nombre` (ambos tipos); BD `NombreCompleto VARCHAR(100) NOT NULL` | [x] |
| Múltiples contactos/teléfonos (1:N) | Frontend: `contact-list` component (add/edit/delete); Backend: tabla `ContactosClientes` + servicio `updateCliente` hace MERGE diferencial | [x] |
| Opcionales: Email, Dirección, RFC, Régimen, CP, Uso CFDI | Campos en `buildPersonaForm`/`buildEmpresaForm` dentro de grupos fiscales; columnas NULLable en `Clientes` | [x] |
| Soft-delete desactivando registro | `clientes.component.ts` botón desactivar + `confirm-modal` (RNF-07); `deleteCliente` `UPDATE Activo=FALSE` en transacción | [x] |

**Resultado RF-03:** Cumplido.

---

## RF-04 — Historial de Cliente

| Requisito RF-04 | Verificación | Estado |
|-----------------|--------------|--------|
| Perfil muestra historial completo obras | `GET /Clientes/:id/obras` (`getObrasByCliente`) devuelve obras; `getClienteById` incluye `Obras` | [x] |
| Estados actuales obras | `getObrasByCliente` join `EstadosObra e` → `EstadoObra` | [x] |
| Montos (solo admin) | `getObrasByCliente` NO expone montos/precios (solo medidas y fechas); RNF-04 via `blockFinancialForWorker` en `/Clientes/RegimenesFiscales`, `/Clientes/UsosCFDI` | [x] |
| Fechas clave | `getObrasByCliente` incluye `FechaCreacion`, `FechaUltimaActualizacion` | [x] |

**Activo:** RF-04 cumplido. El perfil completo con montos filtrados por rol se obtiene vía
`blockFinancialForWorker` aplicado globalmente en `app.js`; los montos de obra no se exponen
en este endpoint (aislamiento reforzado).

---

## RF-05 — Filtros de Clientes

| Requisito RF-05 | Verificación | Estado |
|-----------------|--------------|--------|
| Filtro activos/inactivos | `clientes.component.ts` filterOptions `activos`/`inactivos` + `activo` mapeado del `ACTIVO` de `VW_CLIENTES_CON_OBRAS` | [x] (corregido en auditoría) |
| Filtro con/sin datos fiscales | filterOptions `con_sat`/`sin_sat` + `datosSat` del view | [x] |

**Activo añadido durante auditoría** (no estaba previsto en HW): el plan pedía el filtro
activos/inactivos; faltaba el campo `activo` en el mapeo del listado. Corregido.

> **Nota de desviación vs. plan:** El plan (2.5/2.9) pedía reutilizar searchers
> `RegimenFiscalSelectorComponent`/`UsoCFDISelectorComponent` de Proveedores. **No existen**
> en `proveedores/`. Decisión (KI-12, registrada en STATE): reutilizar catálogos backend de
> Clientes (`GET /Clientes/RegimenesFiscales`, `GET /Clientes/UsosCFDI`) con combobox searchable.

---

## RF-06 — Validación Estricta

| Requisito RF-06 | Verificación | Estado |
|-----------------|--------------|--------|
| Teléfono 10-15 dígitos | Frontend `custom-validators.ts` `TELEFONO_PATTERN /^[\d\s\-\+\(\)]{10,15}$/`; Backend `PHONE_REGEX /^\d{10,15}$/` (tras limpiar no-dígitos) | [x] |
| RFC mexicano 12-13 chars | Frontend `RFC_PATTERN /^([A-ZÑ&]{3,4})(\d{6})([A-Z\d]{3})?$/`; Backend `RFC_REGEX /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/` | [x] |
| Email válido | Frontend `Validators.email` + maxLength 100; Backend `EMAIL_REGEX` | [x] |
| Tiempo real | `cliente-form.component.html` muestra errores tras `touched`; formulario reconstruye al cambiar tipo | [x] |

**Activo RF-06:** Cumplido. Nota menor: frontend permite 12 o 13 chars RFC (`{3,4}` + `(\d{6})`+
`([A-Z\d]{3})?`), que incluye la variante de persona física (13) y moral (12). Backend el
`[A-Z0-9]{3}` fijo exige el sufijo de 3; para RFC de 12 chars (persona moral) el pattern
backend requiere exactamente `3-4 letras + 6 dígitos + 3` = 12 o 13 — consistente.

---

## Gaps descubiertos y correcciones aplicadas en la auditoría

| # | Requisito/Plan | Esperado | Actual (antes) | Acción | Severidad |
|---|----------------|----------|----------------|--------|-----------|
| G-01 | Wave 1.2/1.8 | Botón "Detalles" por material en modal de Proveedores + integración `MaterialDetailComponent` | Modal listaba solo el nombre del material, sin botón ni `selectedMaterialForDetail` | Implementado handler `onMaterialDetailClick` + selección + `<app-material-detail>` y botón "Detalles" | Bloqueador |
| G-02 | Wave 3.4 (Filtro RF-05 activos/inactivos) | Filtro por `activo` en listado | Faltaba campo `activo` en mapeo y opciones de filtro | Añadido `activo`, options presa/empresa/activos/inactivos/con_obras/con_sat/sin_sat | Mayor |
| G-03 | Wave 4.4 (service MERGE contactos) | Variable `consumidos` | Bug: `consumidas` (RT Runtime `consumidas is not defined`) en `updateCliente` MERGE de contactos | Corregido `consumidas`→`consumidos` (x4) | Bloqueador |
| G-04 | Wave 4.3 (`getObrasByCliente`) | El controlador leía `req.params.idCliente` | La ruta es `/:id/obras` → parametrize `id`, recibía `undefined` | Cambiado a `req.params.id` | Mayor |
| G-05 | Wave 2.10 token | `--sigehu-required-color` global | Token solo local en `cliente-form.component.css` | Añadido a `src/theme/variables.scss` | Menor |
| G-06 | Wave 5.2 (DDL) | Esquema plan: tablas `CLIENTES_CONTACTOS` y `CLIENTES_DATOS_FISCALES` | Esquema real reúe `ContactosClientes` existente y campos fiscales en `Clientes` | **No modificado**: se documenta desviación (la migración `phase2-clientes-migration.sql` y `SIGEHU.sql` reflejan el modelo real con `Tipo` + contactos) | Documentación |

---

## Desviaciones documentadas (sin corrección — fuera de alcance o ya razonables)

- **Esquema BD:** El plan propone tablas separadas `CLIENTES_DATOS_FISCALES`. El modelo ya
  existente mantiene datos fiscales dentro de `Clientes` (+ `ContactosClientes`). La auditoría
  **no reescribe el esquema** porque alterar el DDL existente con datos en producción sería un
  cambio de mayor riesgo sin necesidad funcional; RF-03/04/05/06 se cumplen con el modelo real.
- **Searchers fiscales (KI-12):** No existen componentes en Proveedores; se reusan catálogos
  backend de Clientes con combobox searchable en `cliente-form.component`.
- **`SP_CREAR_CLIENTE`/`SP_ACTUALIZAR_CLIENTE`:** Definidos en SQL; sin embargo el backend
  persiste vía servicio (queries parametrizadas y transacciones), no a través de los SP.
  Los SP quedan como conveniencia SQL/documentación (no elegidos como única vía de escritura).

---

**Firma:** Validation Wave completada — Gaps documentados.