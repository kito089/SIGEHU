import service from "../services/NotasGarantias.service.js";

// POST /Garantias/:idGarantia/notas
const create = async (req, res) => {
    try {
        const { idEstadoGarantia, idTrabajador, nota } = req.body;

        if (!idEstadoGarantia || !idTrabajador || !nota) {
            return res.status(400).json({
                error: "idEstadoGarantia, idTrabajador y nota son requeridos"
            });
        }

        const idNotaGarantia = await service.createNota({
            idGarantia: req.params.idGarantia,
            idEstadoGarantia,
            idTrabajador,
            nota
        });

        res.status(201).json({ message: "Nota creada", idNotaGarantia });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Garantias/:idGarantia/notas
const getByGarantia = async (req, res) => {
    try {
        const notas = await service.getNotasByGarantia(req.params.idGarantia);
        res.json(notas);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /notas/:id
const getById = async (req, res) => {
    try {
        const nota = await service.getNotaById(req.params.id);
        res.json(nota);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /notas/:id
const update = async (req, res) => {
    try {
        const { nota } = req.body;

        if (!nota) {
            return res.status(400).json({ error: "El campo nota es requerido" });
        }

        const actualizado = await service.updateNota(req.params.id, { nota });

        if (!actualizado) {
            return res.status(404).json({ error: "Nota no encontrada" });
        }

        res.json({ message: "Nota actualizada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /notas/:id
const remove = async (req, res) => {
    try {
        const eliminado = await service.deleteNota(req.params.id);

        if (!eliminado) {
            return res.status(404).json({ error: "Nota no encontrada" });
        }

        res.json({ message: "Nota eliminada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { create, getByGarantia, getById, update, remove };