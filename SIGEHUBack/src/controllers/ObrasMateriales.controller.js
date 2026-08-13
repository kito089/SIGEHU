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
        res.status(e?.status || 500).json({ error: e.message });
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

// POST /obras/:idObra/materiales/batch
// Aplica un lote de materiales pendientes (agregar/actualizar/quitar) en una
// sola transacción, usado por el Detalle de Obra al pulsar "Guardar".
const aplicarBatch = async (req, res) => {
    try {
        const { agregar, actualizar, quitar } = req.body ?? {};

        const alguno =
            (Array.isArray(agregar) && agregar.length > 0) ||
            (Array.isArray(actualizar) && actualizar.length > 0) ||
            (Array.isArray(quitar) && quitar.length > 0);

        if (!alguno) {
            return res.status(400).json({
                error: "El lote no contiene operaciones (agregar, actualizar o quitar)"
            });
        }

        const resultados = await service.aplicarBatchMateriales({
            idObra: req.params.idObra,
            agregar: agregar ?? [],
            actualizar: actualizar ?? [],
            quitar: quitar ?? [],
            idTrabajadorCtx: req.user?.idTrabajador
        });

        res.json({ message: "Lote de materiales aplicado", ...resultados });

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

export default { asignar, getByObra, actualizar, quitar, aplicarBatch };