import service from "../services/GarantiasTrabajadores.service.js";

// POST /Garantias/:idGarantia/trabajadores
const asignar = async (req, res) => {
    try {
        const { idTrabajador, idEstadoGarantia } = req.body;

        if (!idTrabajador || !idEstadoGarantia) {
            return res.status(400).json({ error: "idTrabajador e idEstadoGarantia son requeridos" });
        }

        const idDetalleAsignacion = await service.asignarTrabajador({
            idGarantia: req.params.idGarantia,
            idTrabajador
        });

        res.status(201).json({ message: "Trabajador asignado a la Garantia", idDetalleAsignacion });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Garantias/:idGarantia/trabajadores
const getByGarantia = async (req, res) => {
    try {
        const trabajadores = await service.getTrabajadoresByGarantia(req.params.idGarantia);
        res.json(trabajadores);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /Garantias/trabajadores/:idDetalleAsignacion
const quitar = async (req, res) => {
    try {
        const eliminado = await service.quitarTrabajador(req.params.idDetalleAsignacion);

        if (!eliminado) {
            return res.status(404).json({ error: "Asignación no encontrada" });
        }

        res.json({ message: "Trabajador removido de la Garantia" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default {
    asignar,
    getByGarantia,
    quitar
};