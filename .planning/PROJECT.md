# PROJECT: SIGEHU (Sistema Integral de Gestión para Herrería Utrilla)

## Visión General
SIGEHU es una plataforma digital de gestión integral y offline-first diseñada a la medida para centralizar, organizar y administrar el ciclo de vida completo de obras operativas en Herrería Utrilla, desde la solicitud/aceptación inicial hasta la atención y cierre de garantías post-entrega.

## Stack Tecnológico
- **Base de Datos:** Firebird 5 (Embedded SQL).
- **Backend:** Node.js + Express + CORS, empaquetado/compilado con Node SEA (Single Executable Application) en `SIGEHUBack`.
- **Frontend Dual (Monorepo `SIGEHUFront`):**
  - **Escritorio (Panel Administrativo):** Angular + Electron (Windows 10+).
  - **Móvil (App Operativa para Trabajadores):** Angular + Ionic + Capacitor (Android APK).
- **Conectividad & Túnel Remoto:** zrok2 (Genera URL HTTPS segura para la comunicación móvil sin IP pública fija).
- **Almacenamiento Local:** Archivos locales físicos en servidor/laptop (evidencias fotográficas e IMSS) almacenando solo la ruta relativa en base de datos.

## Principios de Arquitectura & Reglas Inviolables
1. **Offline-First:** Sincronización transparente vía cola de peticiones locales en la app móvil.
2. **Detección Dinámica de Entorno:**
   - Desktop (Electron) -> Conexión `localhost`.
   - Móvil (Ionic) -> Conexión HTTPS vía URL de `zrok2`.
3. **Control de Acceso y Aislamiento Financiero:**
   - Rol Propietario (Admin): Acceso total a finanzas, presupuestos, clientes, configuraciones y auditoría.
   - Rol Trabajador (Operativo): Acceso restringido vía `VW_OBRAS_TRABAJADOR` y matriz de permisos granulares por obra. Bloqueo estricto `403 Forbidden` a cualquier endpoint con precios, montos o datos fiscales.
4. **Máquina de Estados de Obra & Doble Confirmación:**
   - Flujo estricto: `Solicitud recibida` -> `Levantamiento pendiente` -> `En fabricación` -> `Instalación programada` -> `Instalado` -> `Garantía` (opcional) -> `Finalizado`.
   - Un trabajador marca una tarea como completada en su app -> El estado pasa a "Pendiente de validación" -> El Propietario aprueba/valida en la app web -> Transición oficial vía `SP_CAMBIAR_ESTADO_OBRA`.
5. **Transacciones SQL & Auditoría Firebird 5:**
   - Todas las operaciones multi-tabla deben ejecutarse en transacciones SQL explícitas (`BEGIN TRANSACTION`, `COMMIT`, `ROLLBACK`).
   - El backend debe establecer `RDB$GET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID')` antes de cualquier DML para alimentar las tablas de auditoría (`Auditorias` / `AuditoriasDetalles`).
6. **Archivos Protegidos:** `build.bat`, `apply-env.js`, `setup.iss`, `electron/main.js`, `SIGEHUBack/config.json`, y `environment*.ts` se administran mediante `.env` + `build.bat`.

## Objetivos Principales
- Digitalizar y eliminar los procesos manuales/WhatsApp en la herrería.
- Proporcionar trazabilidad operativa y financiera completa para el Propietario.
- Otorgar a los trabajadores en campo herramientas móviles simplificadas, offline e intuitivas para el seguimiento de tareas, toma de medidas y evidencias fotográficas.
