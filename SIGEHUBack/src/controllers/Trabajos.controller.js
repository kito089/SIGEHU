import service from "../services/Trabajos.service.js";

// POST /Obras/trabajos  → crea un trabajo (usamos /Obras para aglutinar
// trabajos y obras bajo el mismo molde del checkout "Trabajos/Obras").
const create = async (req, res) => {
    try {
        const { idCliente, Nombre, Descripcion, Direccion } = req.body;

        const datos = { idCliente, Nombre };
        const faltantes = Object.entries(datos)
            .filter(([_, valor]) => valor == null || valor === '')
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }

        const idTrabajo = await service.createTrabajo({
            idCliente,
            nombre: Nombre,
            descripcion: Descripcion ?? null,
            direccion: Direccion ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        res.status(201).json({ message: "Trabajo creado", idTrabajo });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Obras/trabajos/:id
const getById = async (req, res) => {
    try {
        const trabajo = await service.getTrabajoById(req.params.id);
        if (!trabajo) {
            return res.status(404).json({ error: "Trabajo no encontrado" });
        }
        res.json(trabajo);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /Obras/trabajos/:id/obras
const getObras = async (req, res) => {
    try {
        const obras = await service.getObrasByTrabajo(req.params.id);
        res.json(obras);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /Obras/trabajos/:id
const update = async (req, res) => {
    try {
        const { Nombre, Descripcion, Direccion } = req.body;

        if (!Nombre) {
            return res.status(400).json({ error: "El campo Nombre es requerido" });
        }

        const actualizado = await service.updateTrabajo(req.params.id, {
            nombre: Nombre,
            descripcion: Descripcion ?? null,
            direccion: Direccion ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        if (!actualizado) {
            return res.status(404).json({ error: "Trabajo no encontrado" });
        }

        res.json({ message: "Trabajo actualizado" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /Obras/trabajos/:id/obras   → agrupa obras bajo un trabajo
const agrupar = async (req, res) => {
    try {
        const { idsObras, actualizarDireccionTrabajo } = req.body;

        if (!Array.isArray(idsObras) || idsObras.length === 0) {
            return res.status(400).json({ error: "idsObras debe ser un array con al menos una obra" });
        }

        await service.agruparObrasEnTrabajo(req.params.id, idsObras, {
            actualizarDireccionTrabajo: actualizarDireccionTrabajo ?? null,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        res.json({ message: "Obras agrupadas en el trabajo" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { create, getById, getObras, update, agrupar };