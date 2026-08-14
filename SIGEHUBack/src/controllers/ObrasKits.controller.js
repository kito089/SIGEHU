import service from "../services/ObrasKits.service.js";

// POST /obras/:idObra/kit
const asignar = async (req, res) => {
    try {
        const { idKit } = req.body;

        if (!idKit) {
            return res.status(400).json({ error: "idKit es requerido" });
        }

        const resultado = await service.asignarKit({
            idObra: req.params.idObra,
            idKit,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        if (resultado?.duplicado) {
            return res.status(400).json({ error: "La obra ya tiene un kit asignado" });
        }

        res.status(201).json({ message: "Kit asignado a la obra", ...resultado });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /obras/:idObra/kit
const getByObra = async (req, res) => {
    try {
        const kit = await service.getKitByObra(req.params.idObra);
        res.json(kit);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /obras/:idObra/kit
const quitar = async (req, res) => {
    try {
        const eliminado = await service.quitarKit(
            req.params.idObra,
            req.user?.idTrabajador
        );

        if (!eliminado) {
            return res.status(404).json({ error: "La obra no tiene kit asignado" });
        }

        res.json({ message: "Kit removido de la obra" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PATCH /obras/:idObra/kit/checklist/:idChecklistItem
const marcarChecklist = async (req, res) => {
    try {
        const { marcado } = req.body;

        if (!req.params.idChecklistItem || typeof marcado !== 'boolean') {
            return res.status(400).json({
                error: "idChecklistItem y marcado son requeridos"
            });
        }

        await service.marcarChecklist({
            idChecklistItem: req.params.idChecklistItem,
            idTrabajador: req.user?.idTrabajador ?? 1,
            marcado
        });

        res.json({ message: "Checklist actualizado" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { asignar, getByObra, quitar, marcarChecklist };
