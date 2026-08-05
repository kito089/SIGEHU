# Plan Maestro - Arquitectura y Desarrollo de SIGEHU

## 1. Visión General del Sistema
SIGEHU (Sistema Integral de Gestión para Herrería Utrilla) es una plataforma *offline-first* diseñada para centralizar la administración de obras operativas. Sustituye procesos manuales garantizando un control estricto mediante una arquitectura de dos clientes (Web Administrativa y App Móvil) bajo un mismo monorepo. Todo el entorno técnico utiliza tecnologías de código abierto sin licencias de pago.

---

## Fase 1: Análisis y Reestructuración de la Base de Datos
Esta fase establece los cimientos del almacenamiento estructurado y la auditoría automática, utilizando Firebird 5 (Embedded).

> **Contexto Requerido para esta Fase:**
> *   `05_modelo_y_matrices.md` (Base principal para tablas, vistas, triggers y permisos).
> *   `03_reglas_y_requerimientos.md` (Para la máquina de estados y requerimientos de tablas faltantes como Kits e IMSS).
> *   `04_interfaces_y_seguridad.md` (Para aplicar las reglas de transacciones y almacenamiento de rutas de archivos).

### 1.1 Consolidación del Esquema Relacional
*   Implementar las tablas principales normalizadas: `Usuarios` (Propietario/Trabajador), `Clientes`, `Obras`, `Proveedores`, `Materiales`, `Compras` y `Garantias`.
*   Crear la tabla `Kits_Instalacion` y su tabla pivote `Kits_has_Materiales` para gestionar conjuntos predefinidos de herramientas.
*   Añadir el soporte para almacenamiento de rutas físicas (PDF/IMG) en la tabla `Trabajadores` para gestionar los documentos del IMSS.

### 1.2 Máquina de Estados Estricta
*   Crear el Procedimiento Almacenado `SP_CAMBIAR_ESTADO_OBRA`.
*   Garantizar el flujo lineal estricto: `Solicitud recibida` ➔ `Levantamiento pendiente` ➔ `En fabricación` ➔ `Instalación programada` ➔ `Instalado` ➔ `Garantía` ➔ `Finalizado`.
*   Restringir transiciones inválidas en la base de datos (ej. bloquear el retroceso de obras finalizadas).

### 1.3 Sistema de Auditoría y Seguridad Integrada
*   Programar *Triggers* de auditoría (Módulo M11) para capturar acciones `INSERT`, `UPDATE` y `DELETE`, utilizando la variable de sesión `RDB$GET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID')`.
*   Crear vistas especializadas de aislamiento. Destaca la creación de `VW_OBRAS_TRABAJADOR`, la cual filtra a nivel SQL para asegurar que los operativos solo consuman información de las obras a las que están explícitamente asignados.

---

## Fase 2: Desarrollo del Backend
Construcción de la capa de servicios utilizando Node.js, Express y empaquetado final con Node SEA.

> **Contexto Requerido para esta Fase:**
> *   `02_arquitectura_restricciones.md` (Para la estructura del backend, Node SEA y manejo de variables de entorno).
> *   `04_interfaces_y_seguridad.md` (Mandatorio para el manejo de JWT, bcrypt, aislamiento 403 y transacciones SQL).
> *   `05_modelo_y_matrices.md` (Para conocer las vistas y procedimientos almacenados a consumir).
> *   `03_reglas_y_requerimientos.md` (Para implementar los endpoints de los requerimientos funcionales).

### 2.1 Autenticación y Control de Acceso (RBAC/ABAC)
*   Implementar sistema de login generando tokens JWT (con expiración de 8 horas) y almacenar contraseñas exclusivamente con *hash bcrypt*.
*   Desarrollar un *middleware* estricto de aislamiento: cualquier intento de un usuario con rol "Trabajador" por acceder a endpoints financieros, fiscales, de presupuestos o precios debe ser rechazado inmediatamente con un error `403 Forbidden`.

### 2.2 Gestión Transaccional SQL (Regla de Oro)
*   Envolver obligatoriamente todas las operaciones que afecten a múltiples tablas (ej. cambiar el estado de una obra y registrar el log de auditoría simultáneamente) en transacciones seguras (`BEGIN TRANSACTION`, `COMMIT`, `ROLLBACK`).

### 2.3 Persistencia de Archivos Locales
*   Configurar el backend para guardar las evidencias fotográficas directamente en el sistema de archivos físicos de la laptop que funciona como servidor.
*   Registrar exclusivamente la ruta relativa (*path*) en Firebird. Queda estrictamente prohibido almacenar imágenes codificadas en base64 en la base de datos.

### 2.4 Gestión de Respaldo Automático
*   Crear un script de *backup* diario y silencioso para la base de datos Firebird, el cual debe registrar alertas en el backend para ser mostradas en el panel administrativo en caso de detectar fallos de integridad.

---

## Fase 3: Lógica de Conexión Frontend-Backend
Esta fase configura el enrutamiento seguro de la red y establece las reglas inmutables del monorepo.

> **Contexto Requerido para esta Fase:**
> *   `02_arquitectura_restricciones.md` (Para conocer los archivos intocables como `build.bat` y la lógica del monorepo).
> *   `04_interfaces_y_seguridad.md` (Para entender la conexión vía zrok2, HTTPS y localhost).
> *   `01_vision_alcance.md` (Para comprender el entorno físico: laptop vs celulares en campo).

### 3.1 Detección de Entornos y Conectividad
*   Configurar el frontend para detectar dinámicamente su entorno de ejecución:
    *   Si es Desktop (empaquetado en Electron), conectarse localmente vía `localhost`.
    *   Si es Móvil (empaquetado en Ionic), utilizar la URL HTTPS generada por el túnel **zrok2**.

### 3.2 Sincronización Offline-First (Móvil)
*   Diseñar un sistema de almacenamiento en caché (cola local) en la aplicación móvil. Si el dispositivo pierde conexión, las confirmaciones de trabajo y las fotografías tomadas se encolarán localmente.
*   Implementar un proceso en segundo plano que sincronice de forma automática y transparente la cola de peticiones con el backend una vez que el dispositivo recupere la conexión a internet.

### 3.3 Protección de Archivos del Sistema
*   Centralizar toda la configuración de variables dinámicas a través del archivo `.env` raíz.
*   Mantener la inmutabilidad de los scripts vitales del proyecto: `build.bat`, el script de inyección `apply-env.js` y el configurador del instalador `setup.iss`.

---

## Fase 4: Desarrollo del Frontend
Implementación de la interfaz unificada utilizando Angular (TypeScript), empaquetada con Electron para el Administrador e Ionic + Capacitor para los Trabajadores operativos.

> **Contexto Requerido para esta Fase:**
> *   `06_diseño_ui.md` (Reglas absolutas de estilo, colores, Skeleton screens y modales).
> *   `03_reglas_y_requerimientos.md` (Para saber qué módulos, botones y vistas Kanban construir).
> *   `04_interfaces_y_seguridad.md` (Para usar la API de la cámara de Capacitor y forzar orientaciones de pantalla).
> *   `02_arquitectura_restricciones.md` (Para la implementación de los *Guards* de Angular y aislamiento de vistas).

### 4.1 Implementación de UI/UX Global
*   Aplicar el sistema de diseño *Dark Mode* con fondos profundos (`#0F0F11`, `#151E32`), textos en blanco/gris pizarra y bordes sutiles para reducir la fatiga visual.
*   Utilizar un sistema de retícula flexible (Flexbox/Grid) basado en múltiplos de 8px (ej. espaciados de 16px, 24px, 32px).
*   Sustituir pantallas estáticas de carga por *Skeleton screens* y utilizar *Spinners* integrados en los botones primarios durante el procesamiento de llamadas asíncronas.
*   Implementar notificaciones flotantes (*Toasts*) en la esquina superior derecha con bordes codificados (Verde/Éxito, Ámbar/Advertencia, Rojo/Error).

### 4.2 Panel Web Administrativo (Escritorio / Electron)
*   Desarrollar el Módulo M1: Dashboard principal con tablero Kanban organizado por estados de obra y un Calendario Operativo interactivo.
*   Integrar un buscador omnibox (tipo "Spotlight") que permita consultas globales simultáneas sobre Clientes, Obras y Proveedores.
*   Implementar modales visuales de confirmación obligatoria para toda acción irreversible (como la desactivación de clientes o las transiciones de estado de una obra).

### 4.3 Aplicación Móvil Operativa (Android / Ionic)
*   Diseñar un *layout* responsivo pero estrictamente bloqueado en orientación vertical (*Portrait*).
*   Implementar el acceso a la cámara nativa mediante Capacitor para la captura rápida de evidencias fotográficas en sitio.
*   Programar los *Guards* de rutas en Angular para aislar de forma absoluta los módulos operativos de los módulos administrativos.
*   **Regla de Oro de Estados (UI Móvil):** Habilitar botones de acción para que los trabajadores marquen tareas operativas como finalizadas (pasando el estado lógico a "Pendiente de validación"), dejando el control de la confirmación final y transición oficial del estado de la obra exclusivamente al Propietario en el panel web.