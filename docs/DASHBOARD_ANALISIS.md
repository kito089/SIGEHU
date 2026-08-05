# 1. Organización General

- **Estructura:** El área del dashboard se encuentra contenida debajo del Topbar. Presenta una disposición de flujo vertical con un scrollbar lateral derecho personalizado (track oscuro, thumb gris).
- **Márgenes del contenedor:** Margen izquierdo y derecho de ≈32px respecto a los bordes de la pantalla (o barra lateral). Margen superior de ≈24px.
- **Filas principales:**
  1. Tarjetas de métricas (KPIs).
  2. Pestañas de navegación (Tabs).
  3. Área de contenido principal (ocupada por el tablero Kanban).
- **Alineaciones:** Alineación superior y a la izquierda para la mayoría de los bloques de contenido.

---

# 2. Tarjetas de métricas

Las tarjetas están ubicadas en la parte superior, dispuestas en una fila horizontal (flex-row o CSS grid). 

**Tarjeta 1: "Total de Obras Activas"**
- **Tamaño:** Ocupa aproximadamente el 40-45% del ancho disponible.
- **Posición:** Primera tarjeta a la izquierda.
- **Fondo:** #1E293B (mismo que el fondo base).
- **Borde:** 1px sólido #334155.
- **Radio:** ≈12px.
- **Padding:** ≈24px interno.
- **Distribución interna:** Flex row, con icono a la izquierda y textos a la derecha. Un elemento adicional alineado a la extrema derecha.
- **Icono:** Icono de un edificio/documento azul (#3B82F6). Envuelto en una caja cuadrada con fondo #1E3A8A (azul oscuro translúcido) y bordes redondeados (≈8px).
- **Tipografía:**
  - Número "12": Color #FFFFFF, fuente Bold, tamaño ≈32px.
  - Texto "Total de Obras Activas": Color #94A3B8, tamaño ≈14px. Margen superior pequeño (≈4px).
- **Badge (Etiqueta derecha):** 
  - Texto: "+3 este mes", tamaño ≈12px.
  - Color de texto: #60A5FA (azul claro).
  - Fondo: #1E3A8A.
  - Forma: "Pill" (píldora), radio de borde máximo (≈99px). Padding ≈4px 12px.

**Tarjeta 2: "Finalizadas este Mes"**
- **Tamaño:** Similar a la primera tarjeta.
- **Posición:** Inmediatamente a la derecha de la primera, separadas por un gap de ≈24px.
- **Fondo:** #1E293B.
- **Borde:** 1px sólido #334155.
- **Radio:** ≈12px.
- **Icono:** Marca de verificación (Check), color #10B981 (verde). Caja cuadrada con fondo #064E3B (verde oscuro).
- **Tipografía:**
  - Número "3": Color #FFFFFF, Bold, ≈32px.
  - Texto "Finalizadas este Mes": Color #94A3B8, ≈14px.
- **Badge:**
  - Texto: "↑ 25% vs jun", ≈12px.
  - Color de texto: #10B981.
  - Fondo: #064E3B.
  - Forma: Pill, incluye un pequeño icono de flecha hacia arriba.

---

# 3. Pestañas (Tabs)

Ubicadas debajo de las tarjetas de métricas.
- **Disposición:** Fila horizontal, alineada a la izquierda. Gap entre elementos ≈8px.
- **Ítems visibles:** "Kanban" (Activo), "Calendario" (Inactivo), "Trabajos asignados" (Inactivo).
- **Ítem Activo ("Kanban"):**
  - Icono: Cuadrícula pequeña blanca.
  - Texto: "Kanban", color #FFFFFF.
  - Fondo: #334155 (gris azulado medio).
  - Padding: ≈8px 16px.
  - Radio: ≈8px.
- **Ítems Inactivos:**
  - Iconos: Calendario, Lista. Color #94A3B8.
  - Texto: Color #94A3B8.
  - Fondo: Transparente.
  - Padding: ≈8px 16px.

---

# 4. Kanban

Ocupa el resto del espacio disponible hacia abajo. Muestra un sistema de scroll horizontal (implícito por el corte de la tarjeta derecha) y scroll vertical global.

**Columnas:**
Existen 5 columnas visibles.
- **Títulos de columnas:**
  1. Solicitud Recibida (Punto Gris #94A3B8)
  2. Levantamiento (Punto Amarillo #F59E0B)
  3. En Fabricación (Punto Azul #3B82F6)
  4. Instalación Programada (Punto Morado #A855F7)
  5. Instalado (Punto Verde #10B981)
- **Encabezado de columna:**
  - Flex row centrado verticalmente. Margen inferior de ≈16px.
  - Punto indicador: Círculo pequeño (≈8px) a la izquierda.
  - Título: Color #FFFFFF, Bold, ≈14px.
  - Contador: Círculo pequeño derecho (fondo #334155, texto gris oscuro o claro, tamaño ≈20x20px).
  - Icono "+": Para añadir, color #94A3B8, extremo derecho.
- **Ancho de columna:** ≈300px.
- **Separación entre columnas:** ≈16px.

**Tarjetas del Kanban (Tickets):**
- **Fondo:** #0F172A (más oscuro que el fondo general del dashboard).
- **Borde:** 1px sólido #334155.
- **Radio de borde:** ≈8px.
- **Padding interno:** ≈16px en todos los lados.
- **Sombra:** Inexistente.
- **Separación vertical entre tarjetas:** ≈12px.
- **Estructura interna de la tarjeta:**
  1. **ID (Ej. C1):** Superior izquierda, texto pequeño (≈11px), color #64748B.
  2. **Subtítulo (Cliente/Lugar):** Ej. "Constructora Altamira". Texto color #94A3B8, tamaño ≈12px. Margen inferior ≈4px.
  3. **Título Principal (Trabajo):** Ej. "Herrería decorativa fachada norte". Texto color #FFFFFF, fuente Bold, tamaño ≈14px. Líneas de texto múltiples soportadas. Margen inferior ≈12px.
  4. **Área de Badges (Opcional):**
     - "Pendiente": Punto amarillo, texto amarillo, fondo #452703, forma redondeada estilo pill, borde 1px amarillo oscuro.
     - "Realizado": Punto verde, texto verde, fondo #064E3B.
     - "Alta": Letras rojas, fondo #450A0A, incluye flecha roja hacia arriba. Alineado a la derecha junto al ID en algunas tarjetas.
  5. **Footer de tarjeta (Fecha y Usuario):** Flex row space-between. Top margin de ≈16px con una línea separadora invisible o mediante margen.
     - Fecha: Icono de calendario miniatura + texto "28 Jul 2024". Color #64748B, tamaño ≈11px.
     - Avatar: Círculo de ≈24x24px, con iniciales (ej. CU, LG, JM) en blanco. Fondos de colores variables (Morado #7C3AED, Azul #2563EB, etc.). Nombre al lado del avatar: "C. Utrilla", color #94A3B8, tamaño ≈11px.

**Botón Inferior de Columna:**
- Texto: "+ Agregar tarea".
- Color: #64748B.
- Alineación: Izquierda. Margen superior ≈12px.

---

# 5. Calendario

No es posible determinarlo con certeza desde la imagen, ya que la pestaña de "Calendario" no está activa y su contenido no es visible.

---

# 6. Widgets

**Botón flotante de Ayuda (FAB):**
- **Posición:** Esquina inferior derecha (bottom right), fixed o absolute.
- **Forma:** Circular.
- **Tamaño:** ≈48x48px.
- **Color de fondo:** #1E293B o #0F172A.
- **Icono:** Signo de interrogación "?" color #94A3B8.
- **Borde:** 1px sólido #334155.

Aparte de las métricas superiores y el Kanban, no hay otros widgets visibles en este momento.

---

# 7. Espaciado

- **Separación entre métricas y tabs:** ≈32px.
- **Separación entre tabs y kanban:** ≈24px.
- **Alineación:** Todas las secciones maestras se alinean verticalmente con un eje izquierdo estricto, creando una línea de visión recta y limpia.

---

# 8. Sistema de colores (Dashboard)

| Elemento | Color aproximado |
|-----------|------------------|
| Fondo del Dashboard | #1E293B |
| Fondo Tarjeta Kanban | #0F172A |
| Bordes de Tarjetas | #334155 |
| Texto Primario | #FFFFFF |
| Texto Secundario | #94A3B8 |
| Texto Terciario | #64748B |
| Indicador - Levantamiento| #F59E0B |
| Indicador - Fabricación | #3B82F6 |
| Indicador - Inst. Prog. | #A855F7 |
| Indicador - Instalado | #10B981 |
| Badge Alta (Fondo) | #450A0A |
| Badge Alta (Texto) | #EF4444 |

---

# 9. Tipografía

- **Tamaños:**
  - 32px (Números de métricas)
  - 14px (Títulos de tarjetas kanban, títulos de columnas, nombres de métricas)
  - 12px (Subtítulos, fechas, badges)
  - 11px (IDs de tareas, nombres de usuarios)
- **Pesos:** Uso intensivo de Bold (700) para destacar títulos (nombres de obras, títulos de columnas) y Regular (400) para datos secundarios.
- **Estilos:** Ausencia total de itálicas. Todo el texto es recto y funcional.

---

# 10. Iconografía

- **Estilo:** Líneas delgadas de grosor consistente (≈1.5px), estilo geométrico outline.
- **Tamaño:** Los iconos de métricas son más grandes (≈24x24px). Los iconos dentro de las tarjetas kanban (calendario) son muy pequeños (≈12x12px).
- **Colores:** Se tintan según su función (Azul para construcción, verde para éxito, gris para metadatos).

---

# 11. Jerarquía visual

1. El usuario es atraído primero por los números grandes de las **Métricas** en la parte superior.
2. La vista desciende al título iluminado de la pestaña actual (**Kanban**).
3. Los **títulos de las columnas** y sus puntos de colores brillantes captan la atención para categorizar el espacio horizontal.
4. Dentro de cada columna, el **Título Principal del Trabajo** (ej. "Herrería decorativa fachada norte") en color blanco resalta inmediatamente contra los textos grises que lo rodean, siendo el punto focal de cada tarjeta individual. Las etiquetas de prioridad ("Alta" en rojo) rompen la monotonía intencionalmente para llamar a la acción.

---

# 12. Principios de diseño

- **Dashboard Moderno & Enterprise UI:** Estructura altamente organizada que maximiza la densidad de información sin saturar visualmente al usuario.
- **Flat Design / Minimalismo:** Se evita el skeuomorfismo. No hay gradientes, ni texturas, ni bordes biselados, ni sombras pronunciadas. Las capas se diferencian estrictamente por el valor de luminosidad del color de fondo (de #1E293B a #0F172A).
- **Dark Theme Nativo:** La elección de paleta no es un simple modo invertido, sino una construcción cuidada de azules muy oscuros (slate) que reduce la fatiga visual, característica crítica en interfaces empresariales que se utilizan durante horas continuas.