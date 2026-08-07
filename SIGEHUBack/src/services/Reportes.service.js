import { getConnection } from "../config/db.js";

/* =========================================================================
   SIGEHU — Servicio de consultas para el módulo de Reportes.

   Todas las lecturas se resuelven con agregaciones SQL sobre el esquema
   existente (ver SIGEHU.sql). Fechas/timestamps que el driver entrega como
   Date/ZonedDate/cadena se normalizan aquí a valores legibles.

   Regla del módulo: reportes es SOLO lectura y exclusivo de administración
   (el router exige rol 'Propietario'); no se abre sesión de auditoría ni
   transacciones de escritura.
   ========================================================================= */

const pad = (n) => String(n).padStart(2, '0');

function dateACadena(d) {
  return `${pad(d.getUTCFullYear())}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// Normaliza el valor que devuelve el driver (Date | ZonedDate | string).
function aFecha(v) {
  if (v == null) return null;
  if (typeof v === 'object' && 'date' in v) return new Date(v.date);
  const d = new Date(String(v).replace('T', ' '));
  return Number.isNaN(d.getTime()) ? null : d;
}

function aTexto(v) {
  if (v == null) return null;
  if (typeof v === 'object' && 'date' in v) return dateACadena(new Date(v.date));
  if (v instanceof Date && !Number.isNaN(v.getTime())) return dateACadena(v);
  return String(v);
}

// Lectura segura por claves (el driver normaliza las columnas en MAYÚSCULAS).
const val = (row, ...claves) => {
  for (const c of claves) {
    if (row?.[c] !== undefined && row[c] !== null) return row[c];
  }
  return null;
};

const num = (row, ...claves) => Number(val(row, ...claves) || 0);

const nombreEstado = (id) => ({
  1: 'Solicitud recibida',
  2: 'Levantamiento pendiente',
  3: 'En fabricación',
  4: 'Instalación programada',
  5: 'Instalado',
  6: 'Garantía',
  7: 'Finalizado',
}[id] || `Estado ${id}`);

/* -------------------------------------------------------------------------
   1) OBRAS — Distribución por estado (dona).
   ------------------------------------------------------------------------- */
const getObrasPorEstado = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT e.Nombre AS ESTADO, e.Orden AS ORDEN, COUNT(o.idObra) AS TOTAL
     FROM EstadosObra e
     LEFT JOIN Obras o ON o.EstadosObra_idEstadoObra = e.idEstadoObra AND o.Activo = TRUE
     GROUP BY e.idEstadoObra, e.Nombre, e.Orden
     ORDER BY e.Orden`,
    []
  );
  const total = rows.reduce((acc, r) => acc + num(r, 'TOTAL'), 0);
  return {
    total,
    estados: rows.map(r => ({
      estado: String(val(r, 'ESTADO')),
      orden: num(r, 'ORDEN'),
      total: num(r, 'TOTAL'),
      porcentaje: total > 0 ? Math.round((num(r, 'TOTAL') / total) * 1000) / 10 : 0,
    })),
  };
};

/* -------------------------------------------------------------------------
   2) OBRAS — Evolución de creación por período (barras).
   Se devuelve grano diario; el período (día/semana/mes/año) lo agrega el
   controller para evitar multiplicar consultas.
   ------------------------------------------------------------------------- */
const getEvolucionObrasGranular = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT EXTRACT(YEAR FROM o.FechaCreacion) AS ANIO,
            EXTRACT(MONTH FROM o.FechaCreacion) AS MES,
            EXTRACT(WEEK FROM o.FechaCreacion) AS SEMANA,
            CAST(o.FechaCreacion AS DATE) AS DIA,
            COUNT(*) AS TOTAL
     FROM Obras o
     WHERE o.Activo = TRUE
     GROUP BY 1, 2, 3, 4`,
    []
  );
  const out = rows.map(r => ({
    anio: num(r, 'ANIO'),
    mes: num(r, 'MES'),
    semana: num(r, 'SEMANA'),
    dia: aTexto(val(r, 'DIA')),
    total: num(r, 'TOTAL'),
  }));
  const clean = {};
  for (const r of out) {
    const k = r.dia;
    if (k != null && !clean[k]) clean[k] = r;
  }
  return Object.values(clean);
};

/* -------------------------------------------------------------------------
   3) OBRAS — Tiempo promedio permanecido por etapa (barras horizontales).
   Usa Obras_has_Trabajadores como bitácora de ingreso a cada etapa (primera
   FechaAsignacion por obra+etapa) y calcula la permanencia hasta el ingreso a
   la etapa siguiente o hasta hoy si la obra aún está en esa etapa.
   ------------------------------------------------------------------------- */
const getTiemposPromedioEtapas = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT oht.Obras_idObra AS IDOBRA, oht.EstadosObra_idEstadoObra AS IDEA,
            es.Orden AS ORDEN, es.Nombre AS ESTADO, oht.FechaAsignacion AS FECHA,
            o.EstadosObra_idEstadoObra AS ESTADO_ACTUAL
     FROM Obras_has_Trabajadores oht
     JOIN EstadosObra es ON es.idEstadoObra = oht.EstadosObra_idEstadoObra
     JOIN Obras o ON o.idObra = oht.Obras_idObra
     ORDER BY oht.Obras_idObra, es.Orden, oht.FechaAsignacion`,
    []
  );

  const porObra = new Map();
  for (const r of rows) {
    const idObra = num(r, 'IDOBRA');
    const idEst = num(r, 'IDEA');
    const orden = num(r, 'ORDEN');
    const fecha = aFecha(val(r, 'FECHA'));
    if (!porObra.has(idObra)) porObra.set(idObra, new Map());
    const etapas = porObra.get(idObra);
    if (!etapas.has(idEst)) {
      etapas.set(idEst, { idEst, orden, fecha });
    } else if (fecha && (!etapas.get(idEst).fecha || fecha < etapas.get(idEst).fecha)) {
      etapas.set(idEst, { idEst, orden, fecha });
    }
  }

  const estadoActual = new Map();
  for (const r of rows) {
    const actual = val(r, 'ESTADO_ACTUAL');
    if (actual != null) estadoActual.set(num(r, 'IDOBRA'), num(r, 'ESTADO_ACTUAL'));
  }

  const acumulador = new Map(); // idEst -> { suma, obras }
  for (const [idObra, etapas] of porObra) {
    const lista = [...etapas.values()].sort((a, b) => a.orden - b.orden);
    const cur = estadoActual.get(Number(idObra));
    for (let i = 0; i < lista.length; i++) {
      const actual = lista[i];
      if (!actual.fecha) continue;
      const siguiente = lista[i + 1];
      let salida;
      if (siguiente && siguiente.fecha) {
        salida = siguiente.fecha;
      } else if (cur != null && cur === actual.idEst) {
        salida = new Date();
      } else {
        continue;
      }
      const dias = (salida - actual.fecha) / 86400000;
      if (dias < 0 || !Number.isFinite(dias)) continue;
      if (!acumulador.has(actual.idEst)) acumulador.set(actual.idEst, { suma: 0, obras: 0 });
      const acc = acumulador.get(actual.idEst);
      acc.suma += dias;
      acc.obras++;
    }
  }

  return [...acumulador.entries()]
    .map(([idEst, acc]) => ({
      idEstado: idEst,
      estado: nombreEstado(idEst),
      promedioDias: acc.obras ? Math.round((acc.suma / acc.obras) * 10) / 10 : 0,
      obras: acc.obras,
    }))
    .sort((a, b) => a.idEstado - b.idEstado);
};

/* -------------------------------------------------------------------------
   4) CLIENTES — Ranking por obras (total / activas).
   ------------------------------------------------------------------------- */
const getClientesPorObras = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT c.idCliente AS ID, c.NombreCompleto AS NOMBRE,
            COUNT(o.idObra) AS TOTAL,
            COUNT(CASE WHEN o.EstadosObra_idEstadoObra < 7 THEN 1 END) AS ACTIVAS
     FROM Clientes c
     LEFT JOIN Obras o ON o.Clientes_idCliente = c.idCliente AND o.Activo = TRUE
     WHERE c.Activo = TRUE
     GROUP BY c.idCliente, c.NombreCompleto
     ORDER BY c.NombreCompleto`,
    []
  );
  return rows.map(r => ({
    idCliente: num(r, 'ID'),
    nombre: String(val(r, 'NOMBRE')),
    total: num(r, 'TOTAL'),
    activas: num(r, 'ACTIVAS'),
  }));
};

/* -------------------------------------------------------------------------
   5) CLIENTES — Nuevos por mes (serie para línea + listado).
   Clientes no registra fecha de creación; se deriva de la auditoría INSERT.
   Solo se consideran clientes activos (los eliminados quedan fuera de las
   estadísticas de clientes vigentes).
   ------------------------------------------------------------------------- */
const getClientesNuevos = async () => {
  const db = await getConnection();
  const serie = await db.query(
    `SELECT EXTRACT(YEAR FROM a.Fecha) AS ANIO, EXTRACT(MONTH FROM a.Fecha) AS MES, COUNT(*) AS TOTAL
     FROM Auditorias a
     JOIN Clientes c ON c.idCliente = a.RegistroAfectado AND c.Activo = TRUE
     WHERE a.Tabla = 'Clientes' AND a.Accion = 'INSERT'
     GROUP BY 1, 2
     ORDER BY 1, 2`,
    []
  );
  const listado = await db.query(
    `SELECT a.RegistroAfectado AS ID, c.NombreCompleto AS NOMBRE, a.Fecha AS FECHA
     FROM Auditorias a
     JOIN Clientes c ON c.idCliente = a.RegistroAfectado
     WHERE a.Tabla = 'Clientes' AND a.Accion = 'INSERT' AND c.Activo = TRUE
     ORDER BY a.Fecha DESC
     ROWS 50`,
    []
  );
  return {
    serie: serie.map(r => ({
      anio: num(r, 'ANIO'),
      mes: num(r, 'MES'),
      total: num(r, 'TOTAL'),
    })),
    listado: listado.map(r => ({
      idCliente: num(r, 'ID'),
      nombre: String(val(r, 'NOMBRE')),
      fecha: aTexto(val(r, 'FECHA')),
    })),
  };
};

/* -------------------------------------------------------------------------
   6) TRABAJADORES — Obras activas asignadas (ranking).
   ------------------------------------------------------------------------- */
const getObrasActivasPorTrabajador = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT t.idTrabajador AS ID, t.NombreCompleto AS NOMBRE,
            COUNT(DISTINCT oht.Obras_idObra) AS OBRAS
     FROM Obras_has_Trabajadores oht
     JOIN Trabajadores t ON t.idTrabajador = oht.Trabajadores_idTrabajador
     JOIN Obras o ON o.idObra = oht.Obras_idObra
                 AND o.Activo = TRUE AND o.EstadosObra_idEstadoObra < 7
     GROUP BY t.idTrabajador, t.NombreCompleto
     ORDER BY 3 DESC
     ROWS 15`,
    []
  );
  return rows.map(r => ({
    idTrabajador: num(r, 'ID'),
    nombre: String(val(r, 'NOMBRE')),
    obras: num(r, 'OBRAS'),
  }));
};

/* -------------------------------------------------------------------------
   7) TRABAJADORES — Más involucrados en garantías (barras).
   ------------------------------------------------------------------------- */
const getGarantiasPorTrabajador = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT t.idTrabajador AS ID, t.NombreCompleto AS NOMBRE,
            COUNT(DISTINCT ght.Garantias_idGarantia) AS GARANTIAS
     FROM Garantias_has_Trabajadores ght
     JOIN Trabajadores t ON t.idTrabajador = ght.Trabajadores_idTrabajador
     JOIN Garantias g ON g.idGarantia = ght.Garantias_idGarantia AND g.Activo = TRUE
     GROUP BY t.idTrabajador, t.NombreCompleto
     ORDER BY 3 DESC
     ROWS 15`,
    []
  );
  return rows.map(r => ({
    idTrabajador: num(r, 'ID'),
    nombre: String(val(r, 'NOMBRE')),
    garantias: num(r, 'GARANTIAS'),
  }));
};

/* -------------------------------------------------------------------------
   8) GARANTÍAS — Resumen (abiertas, por estado, tiempo promedio de resolución).
   ------------------------------------------------------------------------- */
const getGarantiasResumen = async () => {
  const db = await getConnection();
  const totalRows = await db.query(
    `SELECT COUNT(*) AS N FROM Garantias g WHERE g.Activo = TRUE`,
    []
  );
  const abiertasRows = await db.query(
    `SELECT COUNT(*) AS N FROM Garantias g WHERE g.Activo = TRUE AND g.EstadosGarantia_idEstadoGarantia <> 3`,
    []
  );
  const porEstado = await db.query(
    `SELECT eg.Nombre AS ESTADO, eg.Orden AS ORDEN, COUNT(g.idGarantia) AS TOTAL
     FROM EstadosGarantia eg
     LEFT JOIN Garantias g ON g.EstadosGarantia_idEstadoGarantia = eg.idEstadoGarantia AND g.Activo = TRUE
     GROUP BY eg.idEstadoGarantia, eg.Nombre, eg.Orden
     ORDER BY eg.Orden`,
    []
  );
  const resueltas = await db.query(
    `SELECT g.FechaCreacion AS CREACION, g.FechaUltimaActualizacion AS CIERRE
     FROM Garantias g
     WHERE g.Activo = TRUE AND g.EstadosGarantia_idEstadoGarantia = 3`,
    []
  );

  let sumaDias = 0;
  let nResueltas = 0;
  for (const r of resueltas) {
    const creacion = aFecha(val(r, 'CREACION'));
    const cierre = aFecha(val(r, 'CIERRE'));
    if (!creacion || !cierre) continue;
    const dias = (cierre - creacion) / 86400000;
    if (dias >= 0) { sumaDias += dias; nResueltas++; }
  }

  const total = num(totalRows[0] ?? {}, 'N');
  return {
    total,
    abiertas: num(abiertasRows[0] ?? {}, 'N'),
    resueltas: nResueltas,
    promedioResolucionDias: nResueltas ? Math.round((sumaDias / nResueltas) * 10) / 10 : 0,
    porEstado: porEstado.map(r => ({
      estado: String(val(r, 'ESTADO')),
      orden: num(r, 'ORDEN'),
      total: num(r, 'TOTAL'),
      porcentaje: total > 0 ? Math.round((num(r, 'TOTAL') / total) * 1000) / 10 : 0,
    })),
  };
};

/* -------------------------------------------------------------------------
   9) GARANTÍAS — Problemas recurrentes (obras que insisten en garantías).
   ------------------------------------------------------------------------- */
const getProblemasRecurrentes = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT o.idObra AS IDOBRA, o.Nombre AS OBRA, c.NombreCompleto AS CLIENTE,
            COUNT(g.idGarantia) AS NUMERO,
            (SELECT FIRST 1 gg.Descripcion FROM Garantias gg
             WHERE gg.Obras_idObra = o.idObra AND gg.Activo = TRUE
             ORDER BY gg.FechaCreacion DESC) AS DETALLE
     FROM Garantias g
     JOIN Obras o ON o.idObra = g.Obras_idObra
     JOIN Clientes c ON c.idCliente = o.Clientes_idCliente
     WHERE g.Activo = TRUE
     GROUP BY o.idObra, o.Nombre, c.NombreCompleto
     HAVING COUNT(g.idGarantia) > 1
     ORDER BY 4 DESC, o.Nombre
     ROWS 20`,
    []
  );
  return rows.map(r => ({
    idObra: num(r, 'IDOBRA'),
    obra: String(val(r, 'OBRA')),
    cliente: String(val(r, 'CLIENTE')),
    numero: num(r, 'NUMERO'),
    detalle: String(val(r, 'DETALLE') || ''),
  }));
};

/* -------------------------------------------------------------------------
   10) GARANTÍAS — Obras con varias garantías (listado).
    ------------------------------------------------------------------------- */
const getGarantiasMultiples = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT o.idObra AS IDOBRA, o.Nombre AS OBRA, c.NombreCompleto AS CLIENTE,
            COUNT(g.idGarantia) AS NUMERO
     FROM Garantias g
     JOIN Obras o ON o.idObra = g.Obras_idObra
     JOIN Clientes c ON c.idCliente = o.Clientes_idCliente
     WHERE g.Activo = TRUE
     GROUP BY o.idObra, o.Nombre, c.NombreCompleto
     HAVING COUNT(g.idGarantia) >= 2
     ORDER BY 4 DESC, o.Nombre
     ROWS 30`,
    []
  );
  return rows.map(r => ({
    idObra: num(r, 'IDOBRA'),
    nombre: String(val(r, 'OBRA')),
    cliente: String(val(r, 'CLIENTE')),
    numero: num(r, 'NUMERO'),
  }));
};

/* -------------------------------------------------------------------------
   11) MATERIALES — Uso en obras (más/ menos utilizados + obras por material).
    ------------------------------------------------------------------------- */
const getUsoMateriales = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT m.idMaterial AS ID, m.Nombre AS NOMBRE, m.UnidadMedida AS UM,
            COUNT(DISTINCT ohm.Obras_idObra) AS OBRAS,
            SUM(COALESCE(ohm.Cantidad, 0)) AS CANTIDAD
     FROM Materiales m
     LEFT JOIN Obras_has_Materiales ohm ON ohm.Materiales_idMaterial = m.idMaterial
     WHERE m.Activo = TRUE
     GROUP BY m.idMaterial, m.Nombre, m.UnidadMedida`,
    []
  );
  const list = rows
    .map(r => ({
      idMaterial: num(r, 'ID'),
      nombre: String(val(r, 'NOMBRE')),
      unidad: String(val(r, 'UM') || ''),
      obras: num(r, 'OBRAS'),
      cantidad: num(r, 'CANTIDAD'),
    }))
    .filter(x => x.obras > 0)
    .sort((a, b) => b.obras - a.obras || b.cantidad - a.cantidad);
  return {
    masUtilizados: list.slice(0, 10),
    menosUtilizados: list.slice(-10).reverse(),
    porObra: list.map(x => ({ nombre: x.nombre, unidad: x.unidad, obras: x.obras, cantidad: x.cantidad })),
  };
};

/* -------------------------------------------------------------------------
   12) MATERIALES — Sin proveedor (tabla únicamente).
    ------------------------------------------------------------------------- */
const getMaterialesSinProveedor = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT m.idMaterial AS ID, m.Nombre AS NOMBRE, m.UnidadMedida AS UM
     FROM Materiales m
     WHERE m.Activo = TRUE
       AND NOT EXISTS (
         SELECT 1 FROM Proveedores_has_Materiales phm
         WHERE phm.Materiales_idMaterial = m.idMaterial
       )
     ORDER BY m.Nombre`,
    []
  );
  return rows.map(r => ({
    idMaterial: num(r, 'ID'),
    nombre: String(val(r, 'NOMBRE')),
    unidad: String(val(r, 'UM') || ''),
  }));
};

/* -------------------------------------------------------------------------
   13) PROVEEDORES — Más utilizados en compras (barras).
    ------------------------------------------------------------------------- */
const getProveedoresUsados = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT p.idProveedor AS ID, p.Nombre AS NOMBRE,
            COUNT(DISTINCT c.idCompra) AS COMPRAS,
            COUNT(dc.idDetalleCompra) AS LINEAS
     FROM DetallesCompras dc
     JOIN Compras c ON c.idCompra = dc.Compras_idCompra AND c.Activo = TRUE
     JOIN Proveedores p ON p.idProveedor = dc.Proveedores_has_Materiales_Proveedores_idProveedor
     GROUP BY p.idProveedor, p.Nombre
     ORDER BY 3 DESC`,
    []
  );
  return rows.map(r => ({
    idProveedor: num(r, 'ID'),
    nombre: String(val(r, 'NOMBRE')),
    compras: num(r, 'COMPRAS'),
    lineas: num(r, 'LINEAS'),
  }));
};

/* -------------------------------------------------------------------------
   14) PROVEEDORES — Mayor variedad de materiales (barras).
    ------------------------------------------------------------------------- */
const getProveedorMayorVariedad = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT p.idProveedor AS ID, p.Nombre AS NOMBRE,
            COUNT(DISTINCT phm.Materiales_idMaterial) AS VARIEDAD
     FROM Proveedores_has_Materiales phm
     JOIN Proveedores p ON p.idProveedor = phm.Proveedores_idProveedor AND p.Activo = TRUE
     GROUP BY p.idProveedor, p.Nombre
     ORDER BY 3 DESC
     ROWS 15`,
    []
  );
  return rows.map(r => ({
    idProveedor: num(r, 'ID'),
    nombre: String(val(r, 'NOMBRE')),
    variedad: num(r, 'VARIEDAD'),
  }));
};

/* -------------------------------------------------------------------------
   15) PROVEEDORES — Materiales por proveedor (acciones de compra, apiladas).
    ------------------------------------------------------------------------- */
const getMaterialesPorProveedor = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT p.Nombre AS PROVEEDOR, m.Nombre AS MATERIAL, m.UnidadMedida AS UM,
            COUNT(dc.idDetalleCompra) AS CANTIDAD
     FROM DetallesCompras dc
     JOIN Compras c ON c.idCompra = dc.Compras_idCompra AND c.Activo = TRUE
     JOIN Proveedores p ON p.idProveedor = dc.Proveedores_has_Materiales_Proveedores_idProveedor
     JOIN Materiales m ON m.idMaterial = dc.Proveedores_has_Materiales_Materiales_idMaterial
     GROUP BY p.Nombre, m.Nombre, m.UnidadMedida
     ORDER BY p.Nombre, CANTIDAD DESC`,
    []
  );
  return rows.map(r => ({
    proveedor: String(val(r, 'PROVEEDOR')),
    material: String(val(r, 'MATERIAL')),
    unidad: String(val(r, 'UM') || ''),
    cantidad: num(r, 'CANTIDAD'),
  }));
};

/* -------------------------------------------------------------------------
   16) KITS — Más utilizados (dona).
    ------------------------------------------------------------------------- */
const getKitsUsados = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT k.idKit AS ID, k.Nombre AS NOMBRE, COUNT(ok.idObraKit) AS ASIGNACIONES
     FROM Kits_Instalacion k
     LEFT JOIN Obras_has_Kits ok ON ok.Kits_Instalacion_idKit = k.idKit
     WHERE k.Activo = TRUE
     GROUP BY k.idKit, k.Nombre`,
    []
  );
  const total = rows.reduce((acc, r) => acc + num(r, 'ASIGNACIONES'), 0);
  return {
    total,
    kits: rows.map(r => ({
      idKit: num(r, 'ID'),
      nombre: String(val(r, 'NOMBRE')),
      asignaciones: num(r, 'ASIGNACIONES'),
      porcentaje: total > 0 ? Math.round((num(r, 'ASIGNACIONES') / total) * 1000) / 10 : 0,
    })),
  };
};

/* -------------------------------------------------------------------------
   17) KITS — Materiales utilizados por kit (barras apiladas).
    ------------------------------------------------------------------------- */
const getMaterialesPorKit = async () => {
  const db = await getConnection();
  const rows = await db.query(
    `SELECT k.Nombre AS KIT, m.Nombre AS MATERIAL, m.UnidadMedida AS UM,
            COALESCE(km.Cantidad, 0) AS CANTIDAD
     FROM Kits_has_Materiales km
     JOIN Kits_Instalacion k ON k.idKit = km.Kits_Instalacion_idKit AND k.Activo = TRUE
     JOIN Materiales m ON m.idMaterial = km.Materiales_idMaterial AND m.Activo = TRUE
     ORDER BY k.Nombre, m.Nombre`,
    []
  );
  return rows.map(r => ({
    kit: String(val(r, 'KIT')),
    material: String(val(r, 'MATERIAL')),
    unidad: String(val(r, 'UM') || ''),
    cantidad: num(r, 'CANTIDAD'),
  }));
};

export default {
  getObrasPorEstado,
  getEvolucionObrasGranular,
  getTiemposPromedioEtapas,
  getClientesPorObras,
  getClientesNuevos,
  getObrasActivasPorTrabajador,
  getGarantiasPorTrabajador,
  getGarantiasResumen,
  getProblemasRecurrentes,
  getGarantiasMultiples,
  getUsoMateriales,
  getMaterialesSinProveedor,
  getProveedoresUsados,
  getProveedorMayorVariedad,
  getMaterialesPorProveedor,
  getKitsUsados,
  getMaterialesPorKit,
};