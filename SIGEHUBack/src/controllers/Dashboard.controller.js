import service from '../services/Dashboard.service.js';

const getIndicadores = async (_req, res) => {
    try {
        const indicadores = await service.getIndicadores();
        res.json(indicadores);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getResumen = async (_req, res) => {
    try {
        const resumen = await service.getResumen();
        res.json(resumen);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getKanban = async (_req, res) => {
    try {
        const kanban = await service.getKanban();
        res.json(kanban);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getActivityFeed = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        const feed = await service.getActivityFeed(limit);
        res.json(feed);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getCalendarEvents = async (_req, res) => {
    try {
        const events = await service.getCalendarEvents();
        const normalizados = events.map((r) => ({
            tipoEvento: String(r.TIPOEVENTO ?? r.TipoEvento ?? ''),
            idObra: Number(r.IDOBRA ?? r.IdObra ?? r.idObra ?? 0),
            nombreObra: String(r.NOMBREOBRA ?? r.NombreObra ?? r.nombreObra ?? ''),
            nombreCliente: String(r.NOMBRECLIENTE ?? r.NombreCliente ?? r.nombreCliente ?? ''),
            estadoObra: String(r.ESTADOOBRA ?? r.EstadoObra ?? r.estadoObra ?? ''),
            fechaEvento: aISO(primero(r, ['FECHAEVENTO', 'FechaEvento', 'fechaEvento'])),
        }));
        res.json(normalizados);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

function primero(obj, claves) {
    for (const c of claves) {
        if (obj?.[c] !== undefined && obj[c] !== null) return obj[c];
    }
    return null;
}

function aISO(v) {
    if (v == null) return null;
    const d = typeof v === 'object' && v instanceof Date ? v :
        (typeof v === 'object' && 'date' in v ? new Date(v.date) : new Date(String(v).replace('T', ' ')));
    if (Number.isNaN(d.getTime())) return null;
    const iso = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString();
    return iso.slice(0, 10);
}

export default { getIndicadores, getResumen, getKanban, getActivityFeed, getCalendarEvents };