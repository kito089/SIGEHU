import { getConnection } from "../config/db.js";
import fs from "node:fs/promises";
import path from "node:path";
import { getDataRoot } from "../config/paths.js";
import { uploadDir } from "../middlewares/upload.middleware.js";

// ─── INSERT: guardar el registro de la foto ya subida por Multer ─────────────
const createFotoObra = async ({ idObra, idEstadoObra, idTrabajador, nombreArchivo }) => {
    const db = await getConnection();

    // Guardamos la ruta relativa, no la absoluta — evita romper si el proyecto se mueve
    const rutaRelativa = path.join("uploads", "obras", nombreArchivo);

    const rows = await db.query(
        `INSERT INTO FotosObras (Obras_idObra, EstadosObra_idEstadoObra, Trabajadores_idTrabajador, RutaArchivo)
         VALUES (?, ?, ?, ?)
         RETURNING idFotoObra`,
        [idObra, idEstadoObra, idTrabajador, rutaRelativa]
    );

    return {
        idFotoObra: rows[0]?.IDFOTOOBRA,
        rutaArchivo: rutaRelativa
    };
};

// ─── GET fotos por obra ────────────────────────────────────────────────────────
// Incluye la procedencia (nombre y rol de quien subió la foto) para poder
// ordenar en el móvil: asignadas por el propietario primero, luego las del
// levantamiento, y preservar la autoría en la vista de fabricación.
const getFotosByObra = async (idObra) => {
    const db = await getConnection();

    return await db.query(
        `SELECT f.*, t.NombreCompleto AS SubioNombre, tu.Nombre AS RolSubio
         FROM FotosObras f
         JOIN Trabajadores t ON t.idTrabajador = f.Trabajadores_idTrabajador
         LEFT JOIN TiposUsuarios tu ON tu.idTipoUsuario = t.TiposUsuarios_idTipoUsuario
         WHERE f.Obras_idObra = ?
         ORDER BY f.FechaCreacion DESC, f.idFotoObra DESC`,
        [idObra]
    );
};

// ─── DELETE: borra el registro Y el archivo físico ─────────────────────────────
const deleteFotoObra = async (idFotoObra) => {
    const db = await getConnection();

    // 1. Obtener la ruta antes de borrar el registro
    const rows = await db.query(
        "SELECT RutaArchivo FROM FotosObras WHERE idFotoObra = ?",
        [idFotoObra]
    );

    if (!rows || rows.length === 0) {
        return null; // no existe
    }

    const rutaRelativa = rows[0].RUTAARCHIVO;

    // 2. Borrar el registro de la base de datos
    await db.execute(
        "DELETE FROM FotosObras WHERE idFotoObra = ?",
        [idFotoObra]
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
    createFotoObra,
    getFotosByObra,
    deleteFotoObra
};