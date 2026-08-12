import { getConnection } from "../config/db.js";
import fs from "node:fs/promises";
import path from "node:path";
import { getDataRoot } from "../config/paths.js";
import { uploadDir } from "../middlewares/upload.middleware.js";

// ─── INSERT: guardar el registro de la foto ya subida por Multer ─────────────
const createFotoGarantia = async ({ idGarantia, idEstadoGarantia, idTrabajador, nombreArchivo }) => {
    const db = await getConnection();

    // Guardamos la ruta relativa, no la absoluta — evita romper si el proyecto se mueve
    const rutaRelativa = path.join("uploads", "Garantias", nombreArchivo);

    const rows = await db.executeReturning(
        `INSERT INTO FotosGarantias (Garantias_idGarantia, EstadosGarantia_idEstadoGarantia, Trabajadores_idTrabajador, RutaArchivo)
         VALUES (?, ?, ?, ?)
         RETURNING idFotoGarantia`,
        [idGarantia, idEstadoGarantia, idTrabajador, rutaRelativa]
    );

    // El driver devuelve el valor RETURNING como escalar, array u objeto según el
    // tipo de conexión; se extrae de forma segura.
    let raw = Array.isArray(rows) && rows.length > 0 ? rows[0] : rows;
    if (raw != null && typeof raw === 'object') {
        raw = raw.IDFOTOGARANTIA ?? raw.PhotoId;
    }

    return {
        idFotoGarantia: raw,
        rutaArchivo: rutaRelativa
    };
};

// ─── GET fotos por Garantia ────────────────────────────────────────────────────────
const getFotosByGarantia = async (idGarantia) => {
    const db = await getConnection();

    return await db.query(
        "SELECT * FROM FotosGarantias WHERE Garantias_idGarantia = ?",
        [idGarantia]
    );
};

// ─── DELETE: borra el registro Y el archivo físico ─────────────────────────────
const deleteFotoGarantia = async (idFotoGarantia) => {
    const db = await getConnection();

    // 1. Obtener la ruta antes de borrar el registro
    const rows = await db.query(
        "SELECT RutaArchivo FROM FotosGarantias WHERE idFotoGarantia = ?",
        [idFotoGarantia]
    );

    if (!rows || rows.length === 0) {
        return null; // no existe
    }

    const rutaRelativa = rows[0].RUTAARCHIVO;

    // 2. Borrar el registro de la base de datos
    await db.execute(
        "DELETE FROM FotosGarantias WHERE idFotoGarantia = ?",
        [idFotoGarantia]
    );

    // 3. Borrar el archivo físico
    const rutaAbsoluta = path.join(getDataRoot(), rutaRelativa);

    try {
        await fs.unlink(rutaAbsoluta);
    } catch (err) {
        // Si el archivo ya no existe en disco, no rompas la operación —
        // el registro en BD ya se eliminó, que es lo importante
        if (err.code !== "ENOENT") {
            console.error("Error al eliminar archivo físico:", err.message);
        }
    }

    return true;
};

export default {
    createFotoGarantia,
    getFotosByGarantia,
    deleteFotoGarantia
};