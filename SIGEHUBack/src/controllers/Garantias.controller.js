import service from "../services/Garantias.service.js";

// GET /Garantias
const getAll = async (req, res) => {
    try {
        const Garantias = await service.getGarantias();
        res.json(Garantias);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Garantias/:id
const getById = async (req, res) => {
    try {
        const Garantia = await service.getGarantiaById(req.params.id);
        if (!Garantia) {
            return res.status(404).json({ error: "Garantia no encontrada" });
        }
        res.json(Garantia);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /Garantias
const create = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "El cuerpo de la solicitud está vacío" });
        }

        const { idObra, descripcion, idTrabajador } = req.body;

        const datos = { idObra };
        const faltantes = Object.entries(datos)
            .filter(([_, valor]) => valor == null || valor === '')
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }

        const nuevoId = await service.createGarantia({
            idObra,
            descripcion: descripcion ?? null,
            idTrabajador: idTrabajador ?? 1
        });

        res.status(201).json({ message: "Garantia creada", idGarantia: nuevoId });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /Garantias/:id
const update = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "El cuerpo de la solicitud está vacío" });
        }

        const { descripcion, idEstado, resolucion, idTrabajadorCtx } = req.body;

        const datos = { idEstado };
        const faltantes = Object.entries(datos)
            .filter(([_, valor]) => valor == null || valor === '')
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }

        const actualizado = await service.updateGarantia(req.params.id, {
            descripcion: descripcion ?? null,
            idEstado,
            resolucion: resolucion ?? null,
            idTrabajadorCtx: idTrabajadorCtx ?? 1
        });

        if (!actualizado) {
            return res.status(404).json({ error: "Garantia no encontrada" });
        }

        res.json({ message: "Garantia actualizada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /Garantias/:id
const remove = async (req, res) => {
    try {
        const eliminado = await service.deleteGarantia(req.params.id);

        if (!eliminado) {
            return res.status(404).json({ error: "Garantia no encontrada o ya estaba inactiva" });
        }

        res.json({ message: "Garantia eliminada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { getAll, create, update, remove, getById };