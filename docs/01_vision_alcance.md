> [!WARNING] INSTRUCCIÓN DE SISTEMA: ARCHIVO INMUTABLE (SOLO LECTURA).
> Este documento define la visión estricta del proyecto. El LLM tiene PROHIBIDO editar, reescribir o sugerir cambios arquitectónicos sobre este archivo. Utilizar exclusivamente como contexto.

# Visión y Alcance: SIGEHU

## 1. Ámbito del Sistema
**Nombre:** SIGEHU (Sistema Integral de Gestión para Herrería Utrilla).
**Propósito:** Plataforma digital para centralizar, organizar y administrar el ciclo de vida de obras operativas, desde la aceptación del trabajo hasta la cobertura de garantías.

### 1.1 Elementos del Sistema
*   **Web App (Administrativa):** Ejecutada en laptop local (Windows 10+). Control integral y maestro del negocio.
*   **Mobile App (Operativa):** Ejecutada en dispositivos Android (Go/Gama baja). Diseñada para trabajadores en campo. 

### 1.2 Procesos Cubiertos (Módulos)
*   **Clientes:** CRUD completo, contactos múltiples e historial.
*   **Obras & Trabajos:** Gestión de múltiples obras independientes por cliente/trabajo.
*   **Usuarios (Trabajadores):** Asignación de permisos granulares.
*   **Proveedores & Kits:** Gestión de materiales y herramientas de instalación.
*   **Levantamiento:** Asignación en sitio, captura de medidas reales y evidencias.
*   **Fabricación:** Visualización técnica de especificaciones para el taller.
*   **Instalación:** Programación de fechas y asignación de personal.
*   **Garantías:** Registro de incidencias post-entrega y acciones correctivas.
*   **Multimedia:** Almacenamiento local de fotografías por etapa.
*   **Dashboard & Auditoría:** Seguimiento visual de estados y trazabilidad automática de operaciones.

---

## 2. Perspectiva y Entorno Técnico
Sistema desarrollado a la medida (reemplaza procesos manuales/WhatsApp). No depende de software empresarial externo.

### 2.1 Conectividad y Red
*   **Panel Administrativo:** Funciona 100% offline vía red local (`localhost`) en la laptop del propietario.
*   **App Móvil:** Se comunica con el backend mediante un túnel seguro **zrok2** (HTTPS) a través de Wi-Fi o datos móviles.
*   **Tolerancia a fallos (Offline-First):** Si la app móvil pierde conexión, almacena peticiones y fotos localmente, sincronizándolas automáticamente al recuperar internet.

### 2.2 Hardware e Infraestructura
*   **Almacenamiento Local (Laptop):** Base de datos y evidencias se guardan físicamente en la laptop (con backups automáticos).
*   **Cámara:** Integración nativa en la app móvil para fotos de obras.
*   **Flujo de entrada externo:** Los clientes contactan por WhatsApp; el administrador transcribe los datos manualmente a SIGEHU.

---

## 3. Glosario y Definiciones
*   **SIGEHU:** Sistema Integral de Gestión para Herrería Utrilla.
*   **Trabajo:** Ubicación/Dirección física que agrupa una o más "Obras".
*   **Obra:** Proyecto específico fabricado (ej. portón, escalera). Tiene un ciclo de vida independiente.
*   **Cliente:** Persona física/moral que contrata el trabajo.
*   **Levantamiento:** Toma de medidas reales en el domicilio del cliente.
*   **Fabricación:** Producción de la obra en el taller.
*   **Instalación:** Colocación de la obra en la ubicación del cliente.
*   **Garantía:** Soporte y correcciones post-instalación.
*   **Permiso Granular:** Control de acceso a nivel de *campo específico* por usuario y obra (no rol genérico).
*   **Administrador:** Propietario. Acceso total.
*   **Trabajador:** Operativo (oficial, peón, chofer). Acceso restringido a tareas asignadas.
*   **Anticipo:** Pago parcial inicial registrado para habilitar producción.
*   **Estado de obra:** Ciclo de vida estricto: `Solicitud recibida` -> `Levantamiento pendiente` -> `En fabricación` -> `Instalación programada` -> `Instalado` -> `Garantía` -> `Finalizado`.