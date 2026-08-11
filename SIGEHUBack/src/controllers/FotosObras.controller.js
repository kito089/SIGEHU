import service from "../services/FotosObras.service.js";
import fs from "node:fs/promises";

// La app móvil sube fotos indicando la ETAPA con `tipo` (Levantamiento,
// Fabricacion, Instalacion) en lugar de idEstadoObra + idTrabajador. Se
// mapean a los idEstadoObra del catálogo oficial (Levantamiento=2,
// En fabricacion=3, Instalado=5) y se toma el trabajador del token.
const MAPA_TIPO_ESTADO = {
    'levantamiento': 2,
    'fabricacion': 3,
    'instalacion': 5
};

// POST /obras/:idObra/fotos
const upload = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No se recibió ninguna imagen" });
        }

        let { idEstadoObra, idTrabajador, tipo } = req.body;

        if (!idEstadoObra && tipo) {
            idEstadoObra = MAPA_TIPO_ESTADO[String(tipo).toLowerCase().trim()];
        }
        idTrabajador = idTrabajador ?? req.user?.idTrabajador;

        if (!idEstadoObra || !idTrabajador) {
            // Si falta info, borra el archivo que Multer ya guardó para no dejar basura
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ error: "idEstadoObra e idTrabajador son requeridos (o tipo)" });
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