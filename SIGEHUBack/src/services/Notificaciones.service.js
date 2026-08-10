// =============================================================================
// NOTIFICACIONES — Servicio de persistencia (por cuenta, multidispositivo).
// -----------------------------------------------------------------------------
// CRUD sobre la tabla Notificaciones. Toda operación recibe el idTrabajador del
// usuario AUTENTICADO (req.user) — nunca un id enviado por el cliente — lo que
// garantiza el aislamiento por cuenta: un usuario solo puede leer/crear/eliminar
// SUS propias notificaciones.
// =============================================================================

import { getConnection } from "../config/db.js";

export const MAX_NOTIFICACIONES = 100;

const TIPOS = new Set(["success", "warning", "error", "info"]);

// Convierte una fila Firebird (columnas UPPERCASE, TIMESTAMP) a AppNotification.
function normalize(row) {
    const raw = row.CREADOEN ?? row.CreadoEn;
    const ts = raw instanceof Date
        ? raw.getTime()
        : (raw != null ? new Date(raw).getTime() : Date.now());

    return {
        id: Number(row.IDNOTIFICACION ?? row.IdNotificacion),
        type: String(row.TIPO ?? row.Tipo ?? "info").toLowerCase(),
        message: String(row.MENSAJE ?? row.Mensaje ?? ""),
        createdAt: Number.isFinite(ts) ? ts : Date.now()
    };
}

// Extrae el id devuelto por INSERT/DELETE ... RETURNING de forma tolerante.
// La API del driver puede devolver array de arrays, array de objetos o escalar.
function returningId(rows) {
    let v = rows;
    if (Array.isArray(rows)) {
        v = rows[0];
    }
    if (Array.isArray(v)) {
        v = v[0];
    }
    if (v && typeof v === "object") {
        v = v.IDNOTIFICACION ?? v.IdNotificacion;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
}

// Lista las notificaciones de un trabajador (más recientes primero, máx. 100).
const list = async (idTrabajador) => {
    const db = await getConnection();

    const rows = await db.query(
        `SELECT IdNotificacion, Tipo, Mensaje, CreadoEn
         FROM Notificaciones
         WHERE Trabajadores_idTrabajador = ?
         ORDER BY CreadoEn DESC, IdNotificacion DESC
         ROWS ${MAX_NOTIFICACIONES}`,
        [idTrabajador]
    );

    return (rows || []).map(normalize);
};

// Crea una notificación para el trabajador y poda las que exceden el máximo,
// manteniendo acotada la tabla (equivalente al recorte de MAX en el frontend).
const create = async (idTrabajador, { tipo, mensaje }) => {
    const db = await getConnection();

    const rows = await db.executeReturning(
        `INSERT INTO Notificaciones (Trabajadores_idTrabajador, Tipo, Mensaje)
         VALUES (?, ?, ?)
         RETURNING IdNotificacion`,
        [idTrabajador, tipo, mensaje]
    );

    const id = returningId(rows);
    if (id == null) throw new Error("No se pudo registrar la notificación");

    // Poda: conserva solo las MAX más recientes por cuenta.
    await db.execute(
        `DELETE FROM Notificaciones
         WHERE Trabajadores_idTrabajador = ?
           AND IdNotificacion < (
             SELECT MIN(IdNotificacion) FROM (
               SELECT IdNotificacion FROM Notificaciones
               WHERE Trabajadores_idTrabajador = ?
               ORDER BY CreadoEn DESC, IdNotificacion DESC
               ROWS ${MAX_NOTIFICACIONES}
             )
           )`,
        [idTrabajador, idTrabajador]
    );

    return { id, type: tipo, message: mensaje, createdAt: Date.now() };
};

// Elimina UNA notificación del trabajador. Devuelve el id eliminado o null si
// no existía o pertenecía a otra cuenta (aislamiento por cuenta).
// Nota: se verifica la existencia ANTES de borrar porque el driver lanza
// excepción cuando `DELETE ... RETURNING` afecta 0 filas.
const remove = async (idTrabajador, idNotificacion) => {
    const db = await getConnection();

    const existe = await db.query(
        `SELECT IdNotificacion FROM Notificaciones
         WHERE IdNotificacion = ? AND Trabajadores_idTrabajador = ?`,
        [idNotificacion, idTrabajador]
    );
    if (!existe || existe.length === 0) return null;

    await db.execute(
        "DELETE FROM Notificaciones WHERE IdNotificacion = ?",
        [idNotificacion]
    );

    return idNotificacion;
};

// Elimina TODAS las notificaciones del trabajador.
const clearAll = async (idTrabajador) => {
    const db = await getConnection();

    await db.execute(
        "DELETE FROM Notificaciones WHERE Trabajadores_idTrabajador = ?",
        [idTrabajador]
    );
};

export default {
    list,
    create,
    remove,
    clearAll,
    MAX_NOTIFICACIONES,
    isValidType: (tipo) => TIPOS.has(String(tipo).toLowerCase())
};