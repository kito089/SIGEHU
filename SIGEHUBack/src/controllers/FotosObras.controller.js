import service from "../services/FotosObras.service.js";
import fs from "node:fs/promises";

// POST /obras/:idObra/fotos
const upload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se recibió ninguna imagen" });
        }

        const { idEstadoObra, idTrabajador } = req.body;

        if (!idEstadoObra || !idTrabajador) {
            // Si falta info, borra el archivo que Multer ya guardó para no dejar basura
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ error: "idEstadoObra e idTrabajador son requeridos" });
        }

        const resultado = await service.createFotoObra({
            idObra: req.params.idObra,
            idEstadoObra,
            idTrabajador,
            nombreArchivo: req.file.filename
        });

        res.status(201).json({
            message: "Foto guardada",
            ...resultado
        });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// GET /obras/:idObra/fotos
const getByObra = async (req, res) => {
    try {
        const fotos = await service.getFotosByObra(req.params.idObra);
        res.json(fotos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /fotos/:id
const remove = async (req, res) => {
    try {
        const eliminado = await service.deleteFotoObra(req.params.id);

        if (!eliminado) {
            return res.status(404).json({ error: "Foto no encontrada" });
        }

        res.json({ message: "Foto eliminada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { upload, getByObra, remove };