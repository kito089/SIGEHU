# Reglas de Negocio y Requerimientos Funcionales: SIGEHU

> [!NOTE] INSTRUCCIÓN PARA EL LLM
> Este documento define la lógica de negocio, la máquina de estados y los requerimientos funcionales (RF). Puedes actualizar este archivo para marcar los requerimientos completados (ej. usando `[x]`) a medida que avances en el desarrollo.
> **REGLA DE ORO DE ESTADOS:** Para cualquier cambio de estado en una obra donde interviene un trabajador, el flujo OBLIGATORIO es: (1) Trabajador marca la tarea como finalizada/completada en la app móvil -> (2) El sistema lo marca como "Pendiente de validación" -> (3) El Propietario valida y confirma en el sistema -> (4) La obra cambia oficialmente al siguiente estado.

---

## 1. Flujo de Trabajo (Business Workflow)
El sistema digitaliza el proceso operativo de Herrería Utrilla. Fases:
1.  **Presupuesto Inicial:** Solicitud del cliente (WhatsApp/Llamada). Se registra Cliente y Obra (fotos/medidas aprox).
2.  **Elaboración (Fuera del sistema):** El dueño diseña y presupuesta apoyándose en el catálogo de materiales.
3.  **Autorización (Fuera del sistema):** El cliente aprueba y el dueño cambia el estado a "Aprobado".
4.  **Levantamiento:** Trabajador va a sitio (solo ve dirección/teléfono). Toma medidas reales y recibe anticipo.
5.  **Fabricación:** Trabajador asignado ve modelo, medidas y materiales. (Las compras se manejan como orden separada).
6.  **Instalación:** Equipo asignado ve dirección/detalles. Realizan montaje y confirman entrega.
7.  **Garantías (Post-venta):** Registro de fallas (ej. bisagra suelta), asignación de visita y resolución.

---

## 2. Máquina de Estados de la Obra (Ciclo de Vida)
Cada obra transita estrictamente por este flujo. Solo el Propietario puede autorizar el cambio de estado definitivo.

`Solicitud Recibida` ➔ `Levantamiento Pendiente` ➔ `En Fabricación` ➔ `Instalación Programada` ➔ `Instalado` ➔ `[Garantía (Opcional)]` ➔ `Finalizado`

---

## 3. Requerimientos Funcionales (RF) por Módulo

### M1. Dashboard General
*   **[ ] RF-01. Tablero Kanban:** Pantalla principal web con columnas por estado de obra. Muestra tarjetas con: cliente, obra, trabajadores asignados y fechas próximas. Actualización en tiempo real.
*   **[ ] RF-02. Calendario Operativo:** Vista mensual con actividades (levantamientos, fabricación, instalación, garantías). Al hacer clic en un evento, abre el detalle de la obra.

### M2. Gestión de Clientes
*   **[ ] RF-03. CRUD Clientes:** Obligatorio: Nombre/Razón Social. El cliente puede tener múltiples contactos/teléfonos asociados (Relación 1:N). Opcional: Correo, Dirección, RFC, Régimen, CP, Uso CFDI. "Eliminar" solo desactiva (soft-delete).
*   **[ ] RF-04. Historial por Cliente:** Perfil del cliente que muestra todas sus obras asociadas, estados y fechas clave.
*   **[ ] RF-05. Filtros:** Por obras activas/inactivas y con/sin datos fiscales.
*   **[ ] RF-06. Validación Estricta:** Teléfono (10-15 dígitos), RFC (12-13 caracteres formato MX), Email válido.

### M3. Gestión de Obras / Proyectos
*   **[ ] RF-07. Alta de Obras:** Múltiples obras por cliente (incluso mismo domicilio). Obligatorio: Cliente, Nombre de obra. Opcional: Dirección específica, fotos, medidas aprox.
*   **[ ] RF-08. Transición de Estados:** Implementación estricta de la máquina de estados. Registra auditoría (quién y cuándo cambió el estado).
*   **[ ] RF-09. Evidencias Fotográficas (1:N):** Una misma obra puede tener múltiples fotografías por cada una de sus etapas (Levantamiento, Fabricación, Instalación, Garantía). Almacenadas en local.
*   **[ ] RF-10. Bitácora de Notas (1:N):** Una misma obra puede tener múltiples notas de texto libre. Son acumulativas, cada nota guarda la fecha, la etapa de la obra en la que se escribió y el autor.

### M4. Levantamientos
*   **[ ] RF-11. Orden de Levantamiento:** Asignación de trabajador, fecha, dirección y teléfono. (El trabajador móvil solo ve esto, cero precios).
*   **[ ] RF-12. Captura de Medidas:** Registro de Ancho, Alto, Profundidad, observaciones técnicas y varias fotos.
*   **[ ] RF-13. Confirmación (Doble paso):** Trabajador marca levantamiento finalizado en app ➔ Estado pasa a 'Fabricación (Pendiente)' ➔ Propietario confirma y edita si es necesario ➔ Estado oficial 'En Fabricación'.
*   **[ ] RF-14. Registro de Anticipo:** Propietario registra monto y método (efectivo/transferencia). Solo visible para él.

### M5. Fabricación
*   **[ ] RF-15. Orden de Trabajo:** Generación automática visible para el trabajador asignado. Incluye: medidas reales, modelo/foto, observaciones y materiales.
*   **[ ] RF-16. Asignación de Materiales:** Propietario ingresa materiales requeridos (texto libre: descripción, cantidad, unidad).
*   **[ ] RF-17. Confirmación (Doble paso):** Trabajador marca fabricación terminada (con fotos) ➔ Propietario valida ➔ Transita a 'Instalación Programada'.

### M6. Compras
*   **[ ] RF-18. Órdenes de Compra:** Asignación de chofer/trabajador para compras. En su app solo ve: Proveedor, Dirección, Teléfono y Lista de materiales. No ve datos de la obra ni precios.

### M7. Instalación
*   **[ ] RF-19. Programación:** Asignación de fecha, hora, equipo, notas operativas y cobro pendiente (visible solo para propietario y cobrador).
*   **[ ] RF-20. Confirmación (Doble paso):** Equipo marca entrega con fotos y notas ➔ Propietario valida ➔ Transita a 'Instalado'.
*   **[ ] RF-21. Cobro Final:** Propietario registra el pago final recibido (solo visible para él).
*   **[ ] RF-22. Kits de Instalación:** CRUD de kits de instalación (conjuntos predefinidos de herramientas/materiales).
*   **[ ] RF-23. Checklist de Kit:** Asignación de un kit a la obra. Los trabajadores ven un checklist interactivo para marcar herramientas cargadas antes de salir a ruta.

### M8. Garantías (Post-venta)
*   **[ ] RF-24. Apertura:** Desde 'Instalado', el propietario puede abrir un reporte (descripción, fecha, fotos). La obra transita a 'Garantía'.
*   **[ ] RF-25. Seguimiento:** Sub-estados de garantía: Reportada ➔ En atención ➔ Resuelta. Trabajador asignado solo ve problema, dirección y teléfono.
*   **[ ] RF-26. Cierre:** Se registran acciones y fotos de la resolución. Tras resolverse, la obra transita a 'Finalizado'.

### M9. Catálogos Administrativos y Permisos
*   **[ ] RF-27. CRUD Personal:** Trabajadores con usuario, password (bcrypt), teléfono y documentos (IMSS en PDF/IMG).
*   **[ ] RF-28. Permisos Granulares (Matriz Usuario-Obra):** El propietario define a nivel de campo qué ve un trabajador en una obra específica (dirección, teléfono, notas, fotos, medidas). *Seguridad estricta en el Backend.*
*   **[ ] RF-29. CRUD Proveedores:** Empresa, contacto, materiales que maneja (texto), teléfono, dirección.

### M10. Reportes y Búsqueda
*   **[ ] RF-30. KPIs Dashboard:** Contadores de obras en cada estado y finalizadas en el mes.
*   **[ ] RF-31. Búsqueda Global:** Buscador tipo "Spotlight" (omnibox) que busca simultáneamente en Clientes, Obras (nombres y direcciones) y Proveedores.

### M11. Auditoría, Seguridad y Móvil
*   **[ ] RF-32. Log de Auditoría:** Registro inmutable de acciones (quién, qué, cuándo, valores anteriores/nuevos).
*   **[ ] RF-33. Historial Reciente:** Feed cronológico en el dashboard con la actividad reciente de los usuarios.
*   **[ ] RF-34. Autenticación:** Login JWT en Web y Móvil (expira a las 8 horas).
*   **[ ] RF-35. Fotos Offline (App):** Captura desde cámara/galería. Si no hay internet, se encolan localmente y se sincronizan al reconectar.
*   **[ ] RF-36. Acceso Total Móvil (Propietario):** Si el usuario es el dueño e inicia sesión en la app, tiene acceso a funcionalidades completas (cambiar estados, ver precios, aprobar tareas).