# LOGIN_ANALISIS.md

# 1. Descripción General

El diseño analizado corresponde a una vista de inicio de sesión (Login) estructurada en un formato de tarjeta central (card) flotante sobre un fondo oscuro sólido. 

*   **Distribución:** La interfaz utiliza un diseño centrado en un único eje vertical (Column Layout). La tarjeta principal se encuentra al centro tanto horizontal como verticalmente respecto a la ventana gráfica visible.
*   **Estructura:** Se divide en cuatro bloques visuales claramente definidos:
    1.  **Encabezado (Header):** Contiene el isotipo o icono principal, el título del sistema y el subtítulo de la organización.
    2.  **Cuerpo del Formulario (Form Body):** Agrupa los campos de entrada de texto, los mensajes de validación, las opciones de recuperación/memoria y una caja de notificación informativa.
    3.  **Llamada a la Acción (CTA):** Un botón principal que abarca todo el ancho disponible del contenedor interno.
    4.  **Pie de página (Footer):** Separado por una línea divisoria, contiene información legal, créditos y año, con un tamaño de fuente reducido.
*   **Jerarquía visual:** El peso visual primario recae sobre el botón azul brillante en la parte inferior, seguido por el título "SIGEHU" en la parte superior. Los estados de error en color rojo atraen fuertemente la atención hacia los campos de texto, creando un punto focal secundario de alta prioridad.

---

# 2. Paleta de colores

La interfaz emplea un tema oscuro (Dark Mode) con contrastes en tonos azules y acentos en rojo para los estados de validación. 

| Elemento | Color aproximado (Hexadecimal) | Descripción de uso |
| :--- | :--- | :--- |
| **Fondo Global** | ≈ #0B1120 | Color sólido del fondo detrás de la tarjeta principal. |
| **Fondo de Tarjeta** | ≈ #161F33 | Color de la superficie de la tarjeta central. |
| **Fondo de Inputs** | ≈ #1E293B | Color de relleno interior de los campos de texto. |
| **Fondo de Caja Informativa** | ≈ #0F172A | Color de relleno interior del cuadro de notificación. |
| **Color Principal (Acento)** | ≈ #3B82F6 | Utilizado en el icono superior, enlaces, borde de notificación y botón principal. |
| **Color de Texto Principal** | ≈ #F8FAFC | Blanco roto, utilizado en el título principal. |
| **Color de Texto Secundario** | ≈ #94A3B8 | Gris azulado, utilizado en subtítulos, labels y texto del footer. |
| **Color de Placeholder/Iconos** | ≈ #64748B | Gris medio, utilizado en los textos de ejemplo dentro de los inputs y los iconos internos. |
| **Color de Texto Botón** | ≈ #0B1120 | Azul muy oscuro, casi negro, utilizado en el texto del botón principal. |
| **Color de Error (Bordes/Texto)** | ≈ #EF4444 | Rojo brillante, utilizado en los bordes de los inputs y textos de validación. |
| **Color de Bordes Generales** | ≈ #334155 | Gris oscuro, utilizado en el borde de la tarjeta y la línea divisoria del footer. |
| **Fondo Checkbox** | ≈ #FFFFFF | Blanco puro sólido en la caja de selección. |
| **Color Hover/Activo** | No es posible determinarlo con certeza desde la imagen. | No hay evidencia visual de estados hover en esta captura. |

---

# 3. Tipografía

El diseño utiliza una fuente de la familia Sans-Serif geométrica o neo-grotesca (similar a Inter, Roboto o San Francisco). 

*   **Familia aproximada:** Sans-Serif moderna.
*   **Grosores (Weights):**
    *   *Bold / Semi-bold (≈600-700):* Aplicado en el título "SIGEHU", las etiquetas (labels) "Usuario" y "Contraseña", el enlace "¿Olvidaste tu contraseña?" y el texto del botón principal.
    *   *Regular (≈400):* Aplicado en los subtítulos, los placeholders ("Ej. carlos.utrilla"), los mensajes de error, el texto de la notificación y el footer.
*   **Tamaños (Sizes - aproximados):**
    *   Título principal: ≈ 24 px.
    *   Etiquetas de formulario y botón principal: ≈ 14 px.
    *   Subtítulo, placeholders y enlace: ≈ 13 px.
    *   Mensajes de error, notificación y footer: ≈ 11 - 12 px.
*   **Espaciado (Tracking):** Espaciado neutro en la mayoría de los textos, con un ligero ajuste cerrado (tighter) en el título principal.
*   **Alineación:**
    *   Centrada: Encabezado (icono, título, subtítulo), botón principal y textos del footer.
    *   Izquierda: Etiquetas, textos internos de los inputs, mensajes de error y texto de la caja informativa.
    *   Derecha: El enlace "¿Olvidaste tu contraseña?" se alinea al margen derecho de su contenedor.

---

# 4. Login-card

Análisis detallado del componente contenedor principal.

*   **Altura:** ≈ 680 px.
*   **Ancho:** ≈ 400 px.
*   **Color de fondo:** ≈ #161F33.
*   **Padding interno:** ≈ 40 px en todos los lados (top, right, bottom, left).
*   **Distribución:** Apilamiento vertical (flex-direction: column).
*   **Bordes y Radios:** Borde sólido de ≈ 1px de grosor, color ≈ #334155. Radio de las esquinas (Border Radius) de ≈ 16 px.
*   **Sombras:** Existe una sombra exterior muy sutil y oscura (Drop Shadow) alrededor de la tarjeta, de tamaño amplio y color casi negro, que genera profundidad sobre el fondo ≈ #0B1120.

**Componentes internos de la tarjeta:**

*   **Bloque Superior:**
    *   Icono: Contenedor cuadrado con esquinas redondeadas (radio ≈ 12 px), borde de ≈ 2px color ≈ #3B82F6. Contiene un isotipo lineal de una cara/escudo sonriente del mismo color azul.
    *   Separación: ≈ 16 px debajo del icono hasta el título.
    *   Textos: Título principal en blanco, seguido de un subtítulo en gris.
*   **Bloque de Entradas (Inputs):**
    *   Existen dos campos de texto ("Usuario" y "Contraseña").
    *   Altura de los inputs: ≈ 44 px.
    *   Bordes de inputs: Presentan un estado visual de error con un borde sólido de ≈ 1px color ≈ #EF4444.
    *   Radios de inputs: ≈ 8 px.
    *   Padding interno de inputs: ≈ 12 px vertical, ≈ 40 px horizontal izquierdo (para acomodar el icono), ≈ 40 px horizontal derecho (en el caso de la contraseña, para el icono del ojo).
    *   Textos de error: Ubicados inmediatamente debajo de cada input, color ≈ #EF4444, alineados a la izquierda.
*   **Opciones intermedias:**
    *   Contenedor dispuesto en fila (Row Layout) con justificación espacial (space-between).
    *   Izquierda: Caja blanca sólida (≈ 16x16 px) con borde de radio ≈ 4 px, seguida del texto "Recordar sesión".
    *   Derecha: Texto de enlace color ≈ #3B82F6.
*   **Caja de Notificación:**
    *   Contenedor rectangular debajo de las opciones.
    *   Fondo: ≈ #0F172A.
    *   Borde: Sólido, ≈ 1px, color ≈ #3B82F6.
    *   Radio: ≈ 8 px.
    *   Padding: ≈ 16 px.
    *   Texto interno en color azul, alineado a la izquierda, distribuido en dos líneas.
*   **Botón Principal:**
    *   Altura: ≈ 48 px.
    *   Ancho: 100% del espacio interior disponible.
    *   Fondo: ≈ #3B82F6 sólido.
    *   Radio: ≈ 8 px.
    *   Texto centrado, color oscuro (≈ #0B1120).
*   **Footer:**
    *   Línea divisoria horizontal, grosor ≈ 1px, color ≈ #334155, ocupa el 100% del ancho interno.
    *   Dos líneas de texto centradas, en color gris claro, ubicadas debajo de la línea divisoria.

---

# 5. Sistema de Espaciado

El diseño muestra un sistema de espaciado basado posiblemente en múltiplos de 4 u 8 píxeles.

*   **Paddings globales:** La tarjeta principal tiene un padding constante de ≈ 40 px.
*   **Separación vertical (Gaps):**
    *   Entre Icono principal y Título: ≈ 16 px.
    *   Entre Título y Subtítulo: ≈ 8 px.
    *   Entre Subtítulo y primer bloque de formulario: ≈ 32 px.
    *   Entre etiqueta (label) y campo de texto (input): ≈ 8 px.
    *   Entre campo de texto y mensaje de error: ≈ 8 px.
    *   Entre el primer bloque de formulario (Usuario) y el segundo (Contraseña): ≈ 24 px.
    *   Entre el mensaje de error de la contraseña y las opciones ("Recordar sesión"): ≈ 24 px.
    *   Entre las opciones y la caja de notificación: ≈ 24 px.
    *   Entre la caja de notificación y el botón principal: ≈ 24 px.
    *   Entre el botón principal y la línea divisoria del footer: ≈ 32 px.
    *   Entre la línea divisoria y el primer texto del footer: ≈ 16 px.
    *   Entre las líneas de texto del footer: ≈ 4 px.
*   **Separación horizontal:**
    *   Dentro de los inputs: Separación de ≈ 12 px entre el icono interno y el inicio del texto (placeholder).
    *   En la opción de Checkbox: Separación de ≈ 8 px entre el cuadro blanco y el texto "Recordar sesión".

---

# 6. Bordes

Las directrices de bordes mantienen consistencia en todo el diseño:

*   **Tarjeta Principal:** Grosor ≈ 1px, Color ≈ #334155, Radio exterior ≈ 16 px.
*   **Campos de texto (Estado de error actual):** Grosor ≈ 1px, Color ≈ #EF4444, Radio exterior ≈ 8 px.
*   **Icono Superior (Caja contenedora):** Grosor ≈ 2px, Color ≈ #3B82F6, Radio exterior ≈ 12 px.
*   **Caja de Notificación:** Grosor ≈ 1px, Color ≈ #3B82F6, Radio exterior ≈ 8 px.
*   **Botón Principal:** Sin borde visible (o coincidente con el fondo), Radio exterior ≈ 8 px.
*   **Checkbox:** No presenta borde visible diferenciado de su fondo blanco. Radio ≈ 4 px.
*   **División Footer:** Línea superior de borde único (border-top), Grosor ≈ 1px, Color ≈ #334155.

---

# 7. Sombras

El uso de sombras es sumamente restringido, acorde al estilo oscuro:

*   **Sombra de la Tarjeta:** Existe un "Drop Shadow" sutil pero extenso alrededor de la tarjeta contenedora principal.
    *   Color aproximado: Negro puro o `#000000` con baja opacidad (≈ 20-30%).
    *   Desplazamiento (Offset): Principalmente en el eje Y (hacia abajo), ≈ 4 px.
    *   Difuminado (Blur): Amplio, ≈ 24 px a 32 px, lo que genera un efecto de elevación (floating card) sobre el fondo más oscuro.
*   **Componentes internos:** No se aprecia el uso de sombras interiores (inner shadows) ni sombras externas en inputs o botones. El diseño interno es completamente plano (flat).

---

# 8. Iconografía

El sistema de iconos es consistente y minimalista.

*   **Estilo:** Line-art (arte de línea), sin relleno interior (unfilled).
*   **Grosor de línea (Stroke):** Uniforme en todos los iconos, de aproximadamente 1.5 px a 2 px.
*   **Familia aproximada:** Iconos tipo Feather, Lucide o Material Symbols Outlined.
*   **Inventario visual:**
    *   *Icono principal (Header):* Geometría personalizada que simula un rostro cuadrado sonriente o un escudo con rostro.
    *   *Icono "Usuario":* Silueta clásica de persona (cabeza y hombros curvos). Tamaño ≈ 18x18 px.
    *   *Icono "Contraseña" (Izquierda):* Candado cerrado. Tamaño ≈ 18x18 px.
    *   *Icono "Contraseña" (Derecha):* Ojo estándar (indica funcionalidad de visibilidad, aunque no se describe la acción, visualmente es el icono de un ojo). Tamaño ≈ 18x18 px.

---

# 9. Responsive (si puede inferirse)

Aunque solo se dispone de una vista, el diseño sugiere estar preparado para múltiples dispositivos:

*   **Escritorio (Desktop):** Se infiere que es la vista actual debido a los amplios márgenes del fondo oscuro exterior y la tarjeta en el centro de la pantalla.
*   **Móvil / Tablet:** El uso de una tarjeta de ancho fijo (≈ 400 px) con un botón que ocupa el 100% de la anchura disponible (fluid width block) sugiere que, en pantallas más pequeñas, la tarjeta simplemente reduciría su margen exterior (padding global de la página) para ocupar el ancho total del dispositivo de manera nativa sin requerir reorganización estructural.

---

# 10. Conclusión del Login

El login presenta un diseño altamente cohesivo y focalizado. Su estructura centralizada elimina cualquier distracción, obligando a la lectura vertical en cascada: desde la identidad de la marca, pasando por los campos de entrada de datos (marcando fuertemente la atención en los estados de error en rojo), bajando hacia las indicaciones de soporte, y finalizando con un llamado a la acción (botón principal) ineludible por su alto contraste cromático. La jerarquía está perfectamente resuelta mediante la combinación de espaciados, tamaños tipográficos y uso estratégico del color.

---

# 11. Principios de diseño

De la evidencia visual se pueden inferir los siguientes principios aplicados a la interfaz:

*   **Dark Mode (Tema Oscuro):** Es el principio base evidente al usar fondos oscuros (azul/negro) y textos claros. Reduce la fatiga visual y proyecta una imagen tecnológica.
*   **Flat Design (Diseño Plano):** Evidenciado por la ausencia de degradados, biseles o texturas en los botones, inputs y contenedores. Los fondos son colores sólidos.
*   **Enterprise UI (Interfaz Empresarial):** Justificado por la sobriedad tipográfica, la estructura rígida de formularios, textos legales al pie ("Panel de Acceso Único", "Herrería Utrilla © 2026") y la funcionalidad explícita para administradores/trabajadores. Transmite seriedad y robustez corporativa.
*   **Minimalismo:** Evidenciado por el uso exclusivo del espacio negativo (espacios en blanco) para separar los elementos, evitando el uso de líneas delimitadoras innecesarias (salvo en el footer). Hay un uso estricto y reducido de la paleta de colores.
*   **Comunicación de Estado Clara:** El uso del color rojo vibrante tanto para los bordes del contenedor como para el texto delata un principio de usabilidad fundamental: indicar de forma inequívoca el estado del sistema (en este caso, validación fallida).