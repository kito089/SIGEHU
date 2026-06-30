import service from "../services/ObrasMateriales.service.js";

// POST /obras/:idObra/materiales
const asignar = async (req, res) => {
    try {
        const { idMaterial, cantidad, medida, notas } = req.body;

        if (!idMaterial) {
            return res.status(400).json({ error: "idMaterial es requerido" });
        }

        await service.asignarMaterial({
            idObra: req.params.idObra,
            idMaterial,
            cantidad,
            medida,
            notas
        });

        res.status(201).json({ message: "Material asignado a la obra" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /obras/:idObra/materiales
const getByObra = async (req, res) => {
    try {
        const materiales = await service.getMaterialesByObra(req.params.idObra);
        res.json(materiales);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /obras/:idObra/materiales/:idMaterial
const actualizar = async (req, res) => {
    try {
        const { cantidad, medida, notas } = req.body;

        const actualizado = await service.actualizarAsignacion(
            req.params.idObra,
            req.params.idMaterial,
            { cantidad, medida, notas }
        );

        if (!actualizado) {
            return res.status(404).json({ error: "Asignación no encontrada" });
        }

        res.json({ message: "Asignación actualizada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /obras/:idObra/materiales/:idMaterial
const quitar = async (req, res) => {
    try {
        const eliminado = await service.quitarMaterial(req.params.idObra, req.params.idMaterial);

        if (!eliminado) {
            return res.status(404).json({ error: "Asignación no encontrada" });
        }

        res.json({ message: "Material removido de la obra" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { asignar, getByObra, actualizar, quitar };