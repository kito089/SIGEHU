# 1. Descripción General

El layout presenta una estructura clásica de aplicación web empresarial estilo "Dashboard", dividida en dos áreas principales: una barra lateral izquierda (Sidebar) de navegación fija y una barra superior (Topbar) para contexto y acciones globales. 

La jerarquía visual establece la barra lateral como el ancla de navegación primaria mediante un fondo más oscuro, mientras que el Topbar se fusiona cromáticamente con el área de contenido principal, sirviendo como un encabezado contextual en lugar de una barrera visual. La distribución sigue un esquema de pantalla completa sin márgenes exteriores (full-bleed), optimizando el espacio horizontal.

---

# 2. Paleta de colores

| Elemento | Color aproximado | Función |
|-----------|------------------|----------|
| Sidebar (Fondo) | #0F172A | Fondo principal de la navegación lateral |
| Topbar (Fondo) | #1E293B | Fondo de la barra superior |
| Fondo Principal | #1E293B | Área de contenido, se fusiona con Topbar |
| Elemento Activo (Fondo)| #1E3A8A | Fondo del ítem seleccionado en el menú |
| Elemento Activo (Texto)| #3B82F6 | Color de texto e icono del ítem seleccionado |
| Texto Principal | #F8FAFC | Títulos y texto destacado |
| Texto Secundario | #94A3B8 | Subtítulos, placeholders e ítems inactivos |
| Botón Primario (Fondo) | #3B82F6 | Botón de acción principal ("Nueva obra") |
| Botón Primario (Texto) | #FFFFFF | Texto sobre el botón principal |
| Buscador (Fondo) | #0F172A | Fondo del input de búsqueda |
| Bordes / Divisores | #334155 | Bordes de inputs y separaciones sutiles |
| Indicador Notificación| #EF4444 | Punto rojo en la campana de notificaciones |
| Avatar (Fondo) | #3B82F6 | Fondo circular del avatar del usuario |

---

# 3. Tipografía

- **Familia aproximada:** Sans-serif geométrica moderna (similar a Inter, Roboto o San Francisco).
- **Grosor:** 
  - Regular (400) para texto secundario e ítems de menú inactivos.
  - Medium (500) para ítems de menú activos y botones.
  - SemiBold/Bold (600/700) para el título principal del Topbar y el nombre del sistema.
- **Tamaños:** Variación desde ≈10px (etiquetas de módulos) hasta ≈24px (título de página).
- **Espaciado:** Interlineado estándar (≈150%), tracking amplio en etiquetas en mayúsculas (MÓDULOS).
- **Alineación:** Predominantemente alineación a la izquierda.

---

# 4. Sidebar

- **Ancho aproximado:** ≈240px - 260px.
- **Altura:** 100vh (toda la altura de la ventana).
- **Fondo:** Color sólido #0F172A. Sin gradientes visibles.
- **Bordes:** No hay borde lateral derecho visible; la separación se logra por contraste de color.
- **Sombra:** No se detectan sombras proyectadas hacia el contenido.
- **Padding general:** ≈16px a los lados, ≈24px superior e inferior.
- **Sección de Logo:**
  - Icono del logo: Tres capas superpuestas en color #3B82F6, tamaño ≈24x24px.
  - Nombre del sistema: "SIGEHU" en blanco #FFFFFF, texto en negrita, tamaño ≈18px.
  - Subtítulo: "Herrería Utrilla" en gris #94A3B8, tamaño ≈12px.
  - Separación interna (logo-textos): ≈12px.
- **Sección "MÓDULOS":**
  - Título: Texto en mayúsculas, color #64748B, tamaño ≈10px, espaciado entre letras (tracking) aumentado, margen inferior ≈12px.
- **Navegación:**
  - Ítems visibles: Dashboard, Proyectos, Presupuestos, Inventario, Producción, Clientes.
  - Iconos: Estilo outline, grosor ≈1.5px, tamaño ≈20x20px. Ubicados a la izquierda del texto.
  - Espaciado entre icono y texto: ≈12px.
  - Espaciado entre ítems (gap vertical): ≈4px a 8px.
  - Padding de cada ítem: ≈10px vertical, ≈16px horizontal.
  - Radios de borde (ítems): ≈8px.
- **Indicador de elemento activo ("Dashboard"):**
  - Fondo: Rectángulo con esquinas redondeadas color #1E3A8A.
  - Texto e Icono: Color #3B82F6.
  - Grosor de fuente: Medium.
- **Efectos Hover:** No es posible determinarlo con certeza desde la imagen estática.
- **Divisores:** No hay líneas horizontales de separación visibles; el espaciado vertical rige las secciones.
- **Footer / Sección inferior:**
  - Separación amplia empujando el contenido hacia abajo (flex-grow o margin-top auto).
  - Ítem "Configuración": Con icono de engranaje, estilo idéntico a los ítems inactivos.
- **Información del usuario:**
  - Avatar: Círculo de ≈32x32px, fondo #3B82F6, iniciales "CU" en color #FFFFFF, fuente pequeña.
  - Textos: Nombre "Carlos Utrilla" (Blanco #FFFFFF, ≈14px, Medium), Rol "Administrador" (Gris #334155 o más oscuro, muy tenue).

---

# 5. Topbar

- **Altura aproximada:** ≈80px.
- **Color de fondo:** #1E293B (idéntico al fondo del contenido principal, sin separación visual dura).
- **Padding:** ≈24px horizontal, ≈24px vertical.
- **Distribución:** Flexbox con justificación `space-between` (contenido a la izquierda y controles a la derecha).
- **Sección Izquierda (Títulos):**
  - Título Principal: "Dashboard de Obras", color #FFFFFF, fuente Bold, tamaño ≈24px.
  - Subtítulo: "Julio 2024 · Herrería Utrilla", color #94A3B8, fuente Regular, tamaño ≈14px. Separación de puntos central entre las dos frases. Margen superior mínimo respecto al título (≈4px).
- **Sección Derecha (Acciones):**
  - Alineación: Flex row, alineación vertical centrada. Espaciado (gap) entre elementos ≈16px a 24px.
  - Buscador:
    - Input rectangular con fondo #0F172A.
    - Borde: 1px sólido tenue, aproximado #334155.
    - Radio de borde: ≈8px.
    - Icono: Lupa a la izquierda, color #94A3B8, tamaño ≈16px.
    - Placeholder: "Buscar obras...", texto gris #94A3B8, tamaño ≈14px.
    - Atajo de teclado: Elemento visual a la derecha del input que dice "⌘K", caja rectangular con borde, texto muy pequeño.
    - Padding interno: ≈8px vertical, ≈12px horizontal.
  - Notificaciones:
    - Icono de campana outline, color #94A3B8, tamaño ≈20x20px.
    - Indicador: Círculo rojo #EF4444 en la esquina superior derecha del icono, sin número visible, borde del mismo color que el fondo (#1E293B) para crear recorte.
  - Botón "Nueva obra":
    - Forma: Rectángulo con esquinas redondeadas.
    - Radio: ≈8px.
    - Color de fondo: #3B82F6.
    - Texto: "Nueva obra", color #FFFFFF, fuente Medium, tamaño ≈14px.
    - Icono: Signo "+" a la izquierda del texto.
    - Padding: ≈10px vertical, ≈16px horizontal.
- **Sombras:** Ninguna sombra detectada bajo el Topbar.
- **Bordes inferiores:** Ninguno, transición fluida al Dashboard.

---

# 6. Sistema de Espaciado

- **Grid base:** Aparenta seguir un sistema múltiplo de 4px u 8px.
- **Márgenes exteriores:** Inexistentes en los contenedores principales.
- **Separación de secciones:** ≈32px entre el Topbar y el inicio del contenido del Dashboard.

---

# 7. Bordes

- **Radios:** Se emplean predominantemente radios de ≈8px para elementos interactivos (botones, inputs, ítems de menú).
- **Grosor:** En donde existen (como en el buscador), son de 1px.
- **Colores:** Se utilizan grises oscuros (≈#334155) para mantener el bajo contraste general.

---

# 8. Sombras

- No se detectan sombras pronunciadas (drop-shadows) en los elementos del layout. El diseño prefiere usar jerarquía por color de fondo (flat design en dark mode) antes que elevación mediante sombras.

---

# 9. Iconografía

- **Tamaño general:** ≈20x20px y ≈24x24px.
- **Grosor (Stroke):** ≈1.5px. Consistente en toda la barra lateral y superior.
- **Estilo:** Lineal (Outline), con extremos redondeados (round-cap).
- **Familia:** Posiblemente Feather Icons, Lucide, o una variante similar moderna.

---

# 10. Responsive

- **Escritorio:** El diseño mostrado está explícitamente estructurado para formato de escritorio (pantalla ancha).
- **Tablet / Móvil:** No es posible determinarlo con certeza desde la imagen estática; sin embargo, carece de un botón de menú hamburguesa visible en esta vista, infiriendo que la barra lateral está fija (pinned) para resoluciones mayores a 1024px.

---

# 11. Conclusión del Layout

El layout obedece a los principios de una Interfaz de Usuario Empresarial (Enterprise UI) en su variante "Dark Mode". Emplea un diseño plano (flat design) y minimalista, evitando distracciones tridimensionales como gradientes complejos o sombras densas. La jerarquía se establece sólidamente mediante la variación de fondos de la escala de grises/azules y la aplicación quirúrgica del color de acento (#3B82F6) para indicar interactividad y ubicación actual.