import service from '../services/Auditoria.service.js';

const getByCliente = async (req, res) => {
    try {
        const historial = await service.getAuditoriaByCliente(
            req.params.idCliente,
            req.query.limit
        );
        res.json(historial);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getActividad = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 20;
        res.json(await service.getActividad(limit));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getHistorial = async (req, res) => {
    try {
        const dia = req.query.dia || null;
        const limit = parseInt(req.query.limit) || 500;
        res.json(await service.getAuditorias({ dia, limit }));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const getDetalles = async (req, res) => {
    try {
        res.json(await service.getAuditoriaDetalles(req.params.idAuditoria));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default {
    getByCliente,
    getActividad,
    getHistorial,
    getDetalles,
};
