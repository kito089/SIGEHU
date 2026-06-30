import service from "../services/Obras.service.js";

// GET /obras
const getAll = async (req, res) => {
    try {
        const obras = await service.getObras();
        res.json(obras);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /obras
const create = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "El cuerpo de la solicitud está vacío" });
        }

        const { idCliente, Nombre, Direccion } = req.body;

        const datos = { idCliente, Nombre };
        const faltantes = Object.entries(datos)
            .filter(([_, valor]) => valor == null || valor === '')
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }

        const nuevoId = await service.createObra({
            idCliente,
            Nombre,
            Direccion,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        res.status(201).json({ message: "Obra creada", idObra: nuevoId });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /obras/:id
const update = async (req, res) => {
    try {
        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).json({ error: "El cuerpo de la solicitud está vacío" });
        }

        const { Nombre, Direccion, Ancho, Alto, Profundidad } = req.body;

        const datos = { Nombre };
        const faltantes = Object.entries(datos)
            .filter(([_, valor]) => valor == null || valor === '')
            .map(([clave]) => clave);

        if (faltantes.length > 0) {
            return res.status(400).json({
                error: `Faltan campos requeridos: ${faltantes.join(', ')}`
            });
        }

        const actualizado = await service.updateObra(req.params.id, {
            Nombre,
            Direccion,
            Ancho,
            Alto,
            Profundidad,
            idTrabajadorCtx: req.user?.idTrabajador
        });

        if (!actualizado) {
            return res.status(404).json({ error: "Obra no encontrada" });
        }

        res.json({ message: "Obra actualizada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /obras/:id
const remove = async (req, res) => {
    try {
        const eliminado = await service.deleteObra(req.params.id, req.user?.idTrabajador);

        if (!eliminado) {
            return res.status(404).json({ error: "Obra no encontrada o ya estaba inactiva" });
        }

        res.json({ message: "Obra eliminada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PATCH /obras/:id/estado
const cambiarEstado = async (req, res) => {
    try {
        const { idEstado } = req.body;

        if (!idEstado) {
            return res.status(400).json({ error: "idEstado es requerido" });
        }

        const resultado = await service.cambiarEstado(
            req.params.id,
            idEstado,
            req.user?.idTrabajador
        );

        if (!resultado) {
            return res.status(404).json({ error: "Obra no encontrada" });
        }

        res.json({ message: "Estado actualizado", resultado });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { getAll, create, update, remove, cambiarEstado };