> [!WARNING] INSTRUCCIÓN DE SISTEMA: ARCHIVO INMUTABLE (SOLO LECTURA).
> Este documento define la arquitectura técnica y restricciones infranqueables. El LLM tiene PROHIBIDO editar, reescribir o sugerir cambios sobre este archivo. Las reglas descritas aquí deben obedecerse de manera absoluta durante la escritura de código.

# Arquitectura y Restricciones Técnicas: SIGEHU

## 1. Arquitectura del Sistema y Tecnologías
Sistema offline-first con exposición segura a internet. Todo el stack debe usar tecnologías de código abierto sin licencias de pago (RD-05).
*   **Base de Datos:** Firebird 5 (formato Embedded, SQL).
*   **Backend (SIGEHUBack):** Node.js + Express + CORS. Compilado con Node SEA (Single Executable Application).
*   **Frontend Web & App (SIGEHUFront):** Angular + TypeScript.
    *   *Escritorio:* Empaquetado con Electron (EXE). El proceso `main.js` inicializa zrok2 y el Backend.
    *   *Móvil:* Empaquetado con Ionic + Capacitor (APK).
*   **Túnel seguro:** zrok2 (genera URL HTTPS para la app móvil).
*   **Almacenamiento:** Archivos locales (evidencias fotográficas en móvil y laptop).

---

## 2. Reglas del Monorepo (Carpeta `SIGEHUFront`)
El frontend web y móvil coexisten en la misma carpeta bajo un esquema estricto de separación:
1.  **Detección de Entorno y Conexión:**
    *   El código debe detectar dónde se ejecuta.
    *   Si es Móvil -> Usar conexión HTTPS con URL de zrok2.
    *   Si es Escritorio -> Usar conexión local (`localhost`).
    *   *Nota:* El frontend web debe ser *responsive* (adaptable a pantallas móviles y escritorio), pero el método de conexión lo dicta el entorno de ejecución.
2.  **Aislamiento de Vistas:**
    *   Las páginas móviles (trabajadores) **NO** pueden acceder a las rutas web (administrador), y viceversa.
    *   Debe existir protección mediante *Guards* de Angular para aislar los módulos operativos de los administrativos.

---

## 3. Automatizaciones y Archivos Protegidos (¡PROHIBIDO MODIFICAR!)
El LLM tiene **ESTRICTAMENTE PROHIBIDO** modificar los siguientes archivos. Toda gestión de variables se hace **únicamente** agregando nuevas claves en el `.env` de la raíz y ejecutando `build.bat`:
*   🚫 `build.bat` (Script maestro de compilación).
*   🚫 `apply-env.js` (Script de inyección de entorno).
*   🚫 `Installer/setup.iss` (Configuración de Inno Setup y zrok2).
*   🚫 `SIGEHUFront/electron/main.js` (Arranque de zrok2 y backend).
*   🚫 `SIGEHUBack/config.json` (No tocar. Actualizado por build.bat).
*   🚫 `SIGEHUFront/src/environments/environment.ts` y `environment.prod.ts` (No tocar. Actualizados por build.bat, contienen la `apiUrl` de zrok2).

---

## 4. Restricciones de Negocio y Seguridad
*   **Roles y Permisos:** Solo el propietario (Administrador) configura accesos. Ningún usuario puede elevar sus privilegios.
*   **Privacidad de Datos:** 
    *   Ocultar totalmente precios y datos fiscales a los trabajadores.
    *   Los trabajadores solo pueden ver datos (dirección, teléfono) de las obras a las que fueron explícitamente asignados.
*   **Autenticación y Seguridad:** JWT con renovación automática + Hash bcrypt para contraseñas.
*   **Acciones Irreversibles (RNF-20):** Desactivar clientes, cambiar estados de obra o cerrar garantías requiere obligatoriamente un modal de confirmación visual.
*   **Auditoría y Respaldo:** El sistema debe registrar un Log de toda acción relevante y ejecutar un backup diario silencioso de Firebird.

## 5. Mantenibilidad (RNF-15, RNF-16)
*   Arquitectura modular obligatoria: Cada módulo (Clientes, Obras, etc.) debe aislar sus servicios, componentes y rutas.
*   Todo el código clave (lógica de negocio y conexiones) debe contener comentarios técnicos.