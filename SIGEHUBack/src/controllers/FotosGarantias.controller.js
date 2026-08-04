import service from "../services/FotosGarantias.service.js";
import fs from "node:fs/promises";

// POST /Garantias/:idGarantia/fotos
const upload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se recibió ninguna imagen" });
        }

        const { idEstadoGarantia, idTrabajador } = req.body;

        if (!idEstadoGarantia || !idTrabajador) {
            // Si falta info, borra el archivo que Multer ya guardó para no dejar basura
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ error: "idEstadoGarantia e idTrabajador son requeridos" });
        }

        const resultado = await service.createFotoGarantia({
            idGarantia: req.params.idGarantia,
            idEstadoGarantia,
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

// GET /Garantias/:idGarantia/fotos
const getByGarantia = async (req, res) => {
    try {
        const fotos = await service.getFotosByGarantia(req.params.idGarantia);
        res.json(fotos);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// DELETE /fotos/:id
const remove = async (req, res) => {
    try {
        const eliminado = await service.deleteFotoGarantia(req.params.id);

        if (!eliminado) {
            return res.status(404).json({ error: "Foto no encontrada" });
        }

        res.json({ message: "Foto eliminada" });

    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

export default { upload, getByGarantia, remove };