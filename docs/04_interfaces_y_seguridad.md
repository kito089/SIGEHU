> [!IMPORTANT] INSTRUCCIÓN PARA EL LLM: SEGURIDAD Y ARQUITECTURA DE SOFTWARE
> Este documento define los estándares de interfaces, persistencia de archivos, transacciones SQL y seguridad. Las reglas de seguridad (especialmente el aislamiento de endpoints y el uso de transacciones) son mandatorias para cualquier código de backend o frontend generado.

# Interfaces y Seguridad General: SIGEHU

## 1. Interfaces de Usuario (UI/UX)
El sistema cuenta con dos clientes frontend en un monorepo, cada uno con un propósito y restricciones específicas:

### 1.1. Panel Web Administrativo (Escritorio / Laptop)
*   **Plataforma:** Aplicación de escritorio (Web empaquetada en Electron) en Windows 10+.
*   **Resolución base:** 1366 × 768 píxeles. Estilo visual administrativo (tablas, Kanban, filtros).
*   **Usuarios:** Uso exclusivo del Propietario / Administrador principal.
*   **Idioma:** Español (México).

### 1.2. Aplicación Móvil (Android)
*   **Plataforma:** Android Go o superior (empaquetado con Ionic + Capacitor).
*   **Layout:** Estrictamente Vertical (Portrait). Diseñado para pantallas de 5 a 6.5 pulgadas.
*   **Usuarios:** Trabajadores operativos y Propietario (si inicia sesión allí, tiene permisos de admin).
*   **Offline-First (RNF-14):** La app debe almacenar localmente las obras asignadas (caché) para consulta sin internet. Las acciones (confirmar fin de trabajo, capturar fotos) se guardan en una cola local y se **sincronizan automáticamente** al recuperar la conexión.

---

## 2. Interfaces de Hardware y Software (Integraciones)

*   **Cámara Móvil (IH-01):** La app utilizará exclusivamente la API de cámara de Capacitor para capturar evidencias.
*   **Almacenamiento de Archivos (IS-04):** **NO** guardar imágenes en base64 en la base de datos. Las evidencias fotográficas se guardan en una carpeta local física dentro del servidor (laptop). La base de datos (Firebird) **solo almacena la ruta relativa** (path) del archivo.
*   **Conexión Móvil (IC-01):** La app se comunica con el servidor local mediante túnel seguro HTTPS generado por **zrok2**.
*   **Capa de Datos (IS-03):** Prohibido el acceso directo a Firebird desde el frontend. Todo pasa por la API REST (JSON) del backend Node.js.

---

## 3. Seguridad Estricta y Control de Acceso

### 3.1. Autenticación y Tokens (RNF-06, RNF-07, RNF-09)
*   **Prohibido el acceso anónimo.** Todo endpoint requiere autenticación.
*   **Passwords:** Guardados obligatoriamente con hash `bcrypt`. NUNCA en texto plano.
*   **JWT:** Tiempo de expiración de 8 horas con mecanismo de renovación (Refresh Token). El token debe ser invalidado del lado del cliente al hacer Logout. La firma (Secret Key) debe provenir de variables de entorno (NUNCA hardcodeada).

### 3.2. Autorización y Datos Sensibles (RNF-08, RNF-10)
*   **Aislamiento de Endpoints:** Los endpoints que devuelven datos fiscales, precios, montos o presupuestos **deben tener un middleware** que valide que el rol del usuario es "Propietario". Si un trabajador consulta ese endpoint, el backend debe devolver `403 Forbidden`.
*   **Permisos Granulares:** El backend debe filtrar la respuesta del endpoint de detalles de obra basándose en la matriz de permisos de ese trabajador específico.

---

## 4. Estabilidad e Integridad de Datos (Manejo de Backend)

### 4.1. Transacciones SQL Obligatorias (RNF-11)
Cualquier operación que modifique más de una tabla debe envolverse en una transacción (`BEGIN TRANSACTION`, `COMMIT`, `ROLLBACK`).
*   *Ejemplo estricto:* Cambiar el estado de una obra (UPDATE en tabla Obras) + Registrar la acción en el Log de Auditoría (INSERT en tabla Auditoria) = **Misma transacción**. Si el log falla, el estado de la obra NO debe cambiar (Rollback).

### 4.2. Manejo de Errores y Excepciones (RNF-12)
*   **Backend:** Debe capturar y registrar el error real (stack trace, error de SQL) en un log interno.
*   **Frontend / Respuesta API:** Debe devolver un mensaje amigable en Español (ej. "Error al guardar el cliente, intente de nuevo") sin exponer detalles técnicos, sintaxis SQL, ni rutas del servidor.

### 4.3. Respaldo Automático (RNF-13)
*   El sistema ejecutará un script de respaldo diario de Firebird. Debe incluir verificación de integridad. Si falla, el sistema debe registrar el fallo y mostrar una alerta en la interfaz del Administrador en su próximo inicio de sesión.