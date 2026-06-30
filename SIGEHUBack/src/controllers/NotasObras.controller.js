import service from "../services/NotasObras.service.js";

// POST /obras/:idObra/notas
const create = async (req, res) => {
    try {
        const { idEstadoObra, idTrabajador, nota } = req.body;

        if (!idEstadoObra || !idTrabajador || !nota) {
            return res.status(400).json({
                error: "idEstadoObra, idTrabajador y nota son requeridos"
            });
        }

        const idNotaObra = await service.createNota({
            idObra: req.params.idObra,
            idEstadoObra,
            idTrabajador,
            nota
        });

        res.status(201).json({ message: "Nota creada", idNotaObra });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /obras/:idObra/notas
const getByObra = async (req, res) => {
    try {
        const notas = await service.getNotasByObra(req.params.idObra);
        res.json(notas);
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

export default { create, getByObra, update, remove };