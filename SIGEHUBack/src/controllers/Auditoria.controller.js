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

export default {
    getByCliente
};
