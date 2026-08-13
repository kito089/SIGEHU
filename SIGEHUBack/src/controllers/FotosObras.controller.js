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

        // Defensa en profundidad: obra/estado/trabajador deben existir. Si algo
        // falla se borra el archivo temporal subido por Multer.
        const errorValidacion = await service.validarContextoFoto({
            idObra: req.params.idObra,
            idEstadoObra,
            idTrabajador
        });
        if (errorValidacion) {
            await fs.unlink(req.file.path).catch(() => {});
            return res.status(400).json({ error: errorValidacion });
        }

        // Lee el buffer para guardar el BLOB binario en la BD (además de la
        // ruta relativa para el servido estático vía /uploads).
        let buffer = null;
        try {
            buffer = await fs.readFile(req.file.path);
        } catch {
            // Si el archivo no se puede leer se guarda igual el registro (fotos
            // previas guardaban solo la ruta).
        }

        const resultado = await service.createFotoObra({
            idObra: req.params.idObra,
            idEstadoObra,
            idTrabajador,
            nombreArchivo: req.file.filename,
            buffer,
            contentType: req.file.mimetype
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

// GET /obras/fotos/:id/archivo — devuelve el BLOB binario de la foto
const getArchivo = async (req, res) => {
    try {
        const foto = await service.getFotoById(req.params.id);
        if (!foto) {
            return res.status(404).json({ error: "Foto no encontrada" });
        }

        const contentType = String(foto.CONTENTTYPE ?? foto.ContentType ?? 'image/jpeg');
        const blob = foto.FOTO;

        if (blob != null) {
            const buffer = Buffer.isBuffer(blob)
                ? blob
                : Buffer.from(String(blob), 'binary');
            res.setHeader('Content-Type', contentType);
            res.setHeader('Cache-Control', 'public, max-age=86400');
            return res.send(buffer);
        }

        // Fotografía antigua sin BLOB: responder 301 hacia el archivo estático.
        const rutaArchivo = String(foto.RUTAARCHIVO ?? foto.RutaArchivo ?? '');
        if (rutaArchivo) {
            res.redirect('/' + rutaArchivo.replace(/^[\\/]+/, ''));
        } else {
            res.status(404).json({ error: "Foto sin contenido" });
        }
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

export default { upload, getByObra, getArchivo, remove };