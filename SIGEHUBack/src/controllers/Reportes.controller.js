import service from '../services/Reportes.service.js';

/* =========================================================================
   SIGEHU — Controlador de Reportes.

   Endpoints de solo lectura para el módulo de Reportes. Se agrupan por
   dominio (obras, clientes, trabajadores, garantías, materiales, compras,
   proveedores, kits). La agregación por período de la evolución de obras se
   resuelve aquí (agrupar el grano diario devuelto por el servicio).
   ========================================================================= */

const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const agrupar = (tipo, filas) => {
  const mapa = new Map(); // clave -> { label, total }

  const key = (r) => {
    switch (tipo) {
      case 'dia': return String(r.dia ?? '').slice(0, 10);
      case 'semana': return `${r.anio}-S${String(r.semana).padStart(2, '0')}`;
      case 'mes': return `${r.anio}-${String(r.mes).padStart(2, '0')}`;
      case 'anio': return String(r.anio);
      default: return `${r.anio}-${String(r.mes).padStart(2, '0')}`;
    }
  };

  const label = (r) => {
    switch (tipo) {
      case 'dia': return String(r.dia ?? '').slice(0, 10);
      case 'semana': return `Sem ${r.semana} ${r.anio}`;
      case 'mes': return `${meses[(r.mes | 0) - 1]} ${r.anio}`;
      case 'anio': return String(r.anio);
      default: return `${meses[(r.mes | 0) - 1]} ${r.anio}`;
    }
  };

  for (const r of filas) {
    const clave = key(r);
    if (!clave) continue;
    if (!mapa.has(clave)) mapa.set(clave, { label: label(r), total: 0 });
    mapa.get(clave).total += r.total || 0;
  }

  return [...mapa.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([, v]) => v);
};

const getObrasPorEstado = async (_req, res) => {
  try {
    res.json(await service.getObrasPorEstado());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getEvolucionObras = async (req, res) => {
  try {
    const tipo = ['dia', 'semana', 'mes', 'anio'].includes(req.query.tipo)
      ? req.query.tipo
      : 'mes';
    const filas = await service.getEvolucionObrasGranular();
    res.json({ tipo, serie: agrupar(tipo, filas) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getTiemposPromedioEtapas = async (_req, res) => {
  try {
    res.json(await service.getTiemposPromedioEtapas());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getClientesPorObras = async (_req, res) => {
  try {
    res.json(await service.getClientesPorObras());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getClientesNuevos = async (_req, res) => {
  try {
    res.json(await service.getClientesNuevos());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getObrasActivasPorTrabajador = async (_req, res) => {
  try {
    res.json(await service.getObrasActivasPorTrabajador());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getGarantiasPorTrabajador = async (_req, res) => {
  try {
    res.json(await service.getGarantiasPorTrabajador());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getGarantiasResumen = async (_req, res) => {
  try {
    res.json(await service.getGarantiasResumen());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getProblemasRecurrentes = async (_req, res) => {
  try {
    res.json(await service.getProblemasRecurrentes());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getGarantiasMultiples = async (_req, res) => {
  try {
    res.json(await service.getGarantiasMultiples());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getUsoMateriales = async (_req, res) => {
  try {
    res.json(await service.getUsoMateriales());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getMaterialesSinProveedor = async (_req, res) => {
  try {
    res.json(await service.getMaterialesSinProveedor());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getProveedoresUsados = async (_req, res) => {
  try {
    res.json(await service.getProveedoresUsados());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getProveedorMayorVariedad = async (_req, res) => {
  try {
    res.json(await service.getProveedorMayorVariedad());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getMaterialesPorProveedor = async (_req, res) => {
  try {
    res.json(await service.getMaterialesPorProveedor());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getKitsUsados = async (_req, res) => {
  try {
    res.json(await service.getKitsUsados());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

const getMaterialesPorKit = async (_req, res) => {
  try {
    res.json(await service.getMaterialesPorKit());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

export default {
  getObrasPorEstado,
  getEvolucionObras,
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