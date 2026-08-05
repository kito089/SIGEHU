# REQUIREMENTS: SIGEHU (Sistema Integral de Gestión para Herrería Utrilla)

Este documento es la única fuente de verdad funcional y no funcional del sistema SIGEHU, consolidando la totalidad de requerimientos especificados en la documentación del proyecto (`docs/`).

---

## Mapeo de Requerimientos Funcionales (v1 - Alcance Principal)

### MÓDULO 1: Dashboard General & Métricas
- **[ ] RF-01 (Kanban de Obras):** Tablero Kanban interactivo en la Web App con columnas ordenadas por cada estado de la máquina de estados. Muestra tarjetas con nombre de cliente, tipo de obra, trabajadores asignados y fechas asociadas. Actualización en tiempo real.
- **[ ] RF-02 (Calendario Operativo):** Vista mensual y semanal interactiva que programa actividades (levantamientos, fabricación, instalación, visitas de garantía). Al hacer clic abre el detalle completo de la obra.
- **[ ] RF-30 (KPIs Dashboard):** Tarjetas con contadores en tiempo real de obras en cada estado, obras finalizadas en el mes corriente y alertas operativas.
- **[ ] RF-33 (Historial Reciente / Activity Feed):** Feed cronológico en el dashboard con la actividad reciente capturada por auditoría (creaciones, cambios de estado, notas agregadas).

### MÓDULO 2: Gestión de Clientes
- **[ ] RF-03 (CRUD de Clientes & Contactos 1:N):** Registro de clientes (Nombre/Razón Social obligatorio). Un cliente puede tener múltiples contactos/teléfonos asociados (relación 1:N). Opcionales: Email, Dirección, RFC, Régimen Fiscal, Código Postal, Uso CFDI. Eliminación lógica (soft-delete desactivando registro).
- **[ ] RF-04 (Historial de Cliente):** Perfil del cliente que despliega su historial completo de obras, estados actuales, montos (solo admin) y fechas clave.
- **[ ] RF-05 (Filtros de Clientes):** Filtro rápido por clientes activos/inactivos y clientes con/sin información fiscal registrada.
- **[ ] RF-06 (Validación Estricta de Datos):** Validación en tiempo real de formato de teléfono (10-15 dígitos), RFC mexicano (12-13 caracteres) y correo electrónico.

### MÓDULO 3: Gestión de Obras / Proyectos (Core)
- **[ ] RF-07 (Alta de Obras):** Múltiples obras independientes asociadas a un mismo cliente. Campos obligatorios: Cliente y Nombre de obra. Campos opcionales: Dirección específica, fotos iniciales, medidas aproximadas.
- **[ ] RF-08 (Transición de Estados):** Implementación estricta de la máquina de estados: `Solicitud recibida` ➔ `Levantamiento pendiente` ➔ `En fabricación` ➔ `Instalación programada` ➔ `Instalado` ➔ `[Garantía]` ➔ `Finalizado`. Registro obligatorio en log de auditoría.
- **[ ] RF-09 (Evidencias Fotográficas 1:N):** Soporte de múltiples fotos por obra organizadas por etapa (Levantamiento, Fabricación, Instalación, Garantía). Guardado físico local en disco.
- **[ ] RF-10 (Bitácora de Notas 1:N):** Historial acumulativo de notas de texto libre por obra. Guarda la fecha, hora, autor y la etapa en que fue escrita.

### MÓDULO 4: Levantamientos (Campo)
- **[ ] RF-11 (Orden de Levantamiento):** Generación y asignación de orden a trabajador con fecha, hora, dirección y teléfono del cliente. (Aislamiento total de precios en móvil).
- **[ ] RF-12 (Captura de Medidas y Observaciones):** Registro interactivo en app móvil de Ancho, Alto, Profundidad, observaciones técnicas y fotografías en sitio.
- **[ ] RF-13 (Doble Validación de Levantamiento):** El trabajador marca levantamiento terminado ➔ Estado pasa a "Levantamiento Pendiente de Validación" ➔ El Propietario revisa/edita en Web ➔ Transición oficial a `En Fabricación`.
- **[ ] RF-14 (Registro de Anticipo):** Módulo exclusivo del Propietario para registrar el monto del anticipo, fecha y forma de pago (Efectivo/Transferencia) antes de habilitar producción.

### MÓDULO 5: Fabricación (Taller)
- **[ ] RF-15 (Orden de Trabajo para Taller):** Vista de orden de fabricación para trabajadores asignados con medidas reales, modelo de diseño/fotografía, especificaciones y lista de materiales.
- **[ ] RF-16 (Asignación de Insumos/Materiales):** Registro por parte del Propietario de la lista de materiales requeridos (descripción, cantidad, unidad).
- **[ ] RF-17 (Doble Validación de Fabricación):** El trabajador marca fabricación terminada con fotos ➔ El Propietario valida en Web ➔ Transición oficial a `Instalación Programada`.

### MÓDULO 6: Compras & Logística
- **[ ] RF-18 (Órdenes de Compra para Choferes/Trabajadores):** Vista simplificada en app móvil para compras en proveedores: solo despliega Proveedor, Dirección, Teléfono y Lista de materiales. Oculta precios y datos de la obra.

### MÓDULO 7: Instalación & Kits
- **[ ] RF-19 (Programación de Instalación):** Asignación de fecha, hora, equipo de trabajo, notas operativas y cobro pendiente (visible solo para Admin).
- **[ ] RF-20 (Doble Validación de Instalación):** El equipo de instalación marca la obra como entregada en la app móvil con evidencias fotográficas ➔ El Propietario valida en Web ➔ Transición oficial a `Instalado`.
- **[ ] RF-21 (Cobro Final y Liquidación):** Registro por el Propietario del pago final recibido y método de pago (Efectivo/Transferencia).
- **[ ] RF-22 (CRUD de Kits de Instalación):** Catálogo predefinido de Kits de herramientas y consumibles (`Kits_Instalacion` y `Kits_has_Materiales`).
- **[ ] RF-23 (Checklist de Kit para Ruta):** Asignación de kit a la orden de instalación con checklist interactivo en la app móvil para verificación antes de salir a campo.

### MÓDULO 8: Garantías (Post-Venta)
- **[ ] RF-24 (Apertura de Reporte de Garantía):** Apertura de reporte desde una obra en estado `Instalado` (descripción de falla, fecha, evidencias). Transición oficial de la obra a estado `Garantía`.
- **[ ] RF-25 (Seguimiento y Sub-estados):** Control de sub-estados de la garantía: `Reportada` ➔ `En atención` ➔ `Resuelta`. El trabajador asignado solo ve problema, dirección y teléfono.
- **[ ] RF-26 (Cierre de Garantía):** Registro de acciones correctivas y fotos finales. Al quedar resueltas todas las garantías, la obra transita oficialmente a `Finalizado`.

### MÓDULO 9: Catálogos & Permisos Granulares
- **[ ] RF-27 (CRUD de Personal / Trabajadores):** Registro de trabajadores con usuario, contraseña (hash bcrypt), teléfono y documentos de afiliación IMSS (almacenamiento de archivos PDF/IMG).
- **[ ] RF-28 (Permisos Granulares Matriz Usuario-Obra):** Definición a nivel de campo por parte del Propietario sobre qué atributos (dirección, teléfono, notas, fotos, medidas) puede ver y manipular un trabajador específico en una obra asignada.
- **[ ] RF-29 (CRUD de Proveedores):** Empresa, contacto, lista de materiales que maneja, teléfono y dirección.

### MÓDULO 10: Búsquedas & Navegación
- **[ ] RF-31 (Búsqueda Global Omnibox):** Buscador "Spotlight" en la barra superior web que consulta simultáneamente en Clientes, Obras (nombres/direcciones) y Proveedores.

### MÓDULO 11: Auditoría, Seguridad & Móvil
- **[ ] RF-32 (Log de Auditoría Inmutable):** Disparadores (triggers) en Firebird que capturan usuario, fecha/hora, acción (INSERT/UPDATE/DELETE), tabla y valores anteriores/nuevos usando `RDB$GET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID')`.
- **[ ] RF-34 (Autenticación JWT):** Emisión de Tokens JWT con 8 horas de validez y renovación transparente.
- **[ ] RF-35 (Cola Offline de Fotografías y Peticiones):** Encolamiento local en Ionic/Capacitor cuando no existe red, con auto-sincronización al detectar conexión con el backend/zrok2.
- **[ ] RF-36 (Acceso Total Móvil para Propietario):** Reconocimiento del rol de Propietario al iniciar sesión en la app móvil para otorgarle capacidades administrativas completas.

---

## Requerimientos No Funcionales (RNF)

- **RNF-01 (Offline-First en Móvil):** La app móvil debe funcionar sin conexión a internet manteniendo caché local de obras asignadas y encolando acciones.
- **RNF-02 (Aislamiento de Entornos):** El frontend detecta automáticamente si corre en Electron (`localhost`) o Ionic (`zrok2` HTTPS).
- **RNF-03 (Almacenamiento Físico de Archivos):** Las fotos y PDFs se guardan en el sistema de archivos local. La base de datos solo guarda la ruta relativa. Queda prohibido el almacenamiento de imágenes Base64 en Firebird.
- **RNF-04 (Aislamiento Financiero 403 Forbidden):** Middleware del backend que bloquea con HTTP `403` a cualquier trabajador que intente acceder a endpoints con montos, precios, presupuestos o datos fiscales.
- **RNF-05 (Transacciones SQL Obligatorias):** Toda modificación que involucre más de una tabla debe ejecutarse bajo transacciones explícitas (`BEGIN TRANSACTION`, `COMMIT`, `ROLLBACK`).
- **RNF-06 (Seguridad de Contraseñas):** Uso obligatorio de hash `bcrypt` para todas las contraseñas.
- **RNF-07 (Modales de Confirmación para Acciones Irreversibles):** Modales obligatorios para desactivación de clientes, cambios oficiales de estado de obras y cierre de garantías.
- **RNF-08 (Respaldo Automático Silencioso):** Backup diario de la base de datos Firebird 5 con log de estatus y alerta visual en la Web App ante fallos.
- **RNF-09 (UI Dark Mode):** Paleta de colores en modo oscuro profundo (`#0F0F11`, `#151E32`), de alto contraste, con Skeleton screens para estados de carga.

---

## Requerimientos v2 / Fuera de Alcance (Out of Scope v1)

- **Facturación Electrónica Automática (CFDI Directo):** Opcional/v2. En v1 solo se capturan los datos fiscales (RFC, Régimen, Uso CFDI) para que el dueño facture externamente.
- **Pasarela de Pagos en Línea:** Fuera de alcance. Los cobros se registran manualmente (Efectivo/Transferencia).
- **Módulo de Cotizaciones Automáticas con Calculadora de Peso:** Fuera de alcance. El dueño cotiza manualmente fuera del sistema.
