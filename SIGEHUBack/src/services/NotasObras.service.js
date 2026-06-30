import { getConnection } from "../config/db.js";

// ─── CREATE ─────────────────────────────────────────────────────────────────
const createNota = async ({ idObra, idEstadoObra, idTrabajador, nota }) => {
    const db = await getConnection();

    const rows = await db.query(
        `INSERT INTO NotasObras (Obras_idObra, EstadosObra_idEstadoObra, Trabajadores_idTrabajador, Nota)
         VALUES (?, ?, ?, ?)
         RETURNING idNotaObra`,
        [idObra, idEstadoObra, idTrabajador, nota]
    );

    return rows[0]?.IDNOTAOBRA;
};

// ─── GET por obra ────────────────────────────────────────────────────────────
const getNotasByObra = async (idObra) => {
    const db = await getConnection();

    return await db.query(
        "SELECT * FROM NotasObras WHERE Obras_idObra = ? ORDER BY FechaCreacion DESC",
        [idObra]
    );
};

// ─── GET por ID ──────────────────────────────────────────────────────────────
const getNotaById = async (id) => {
    const db = await getConnection();

    const rows = await db.query(
        "SELECT * FROM NotasObras WHERE idNotaObra = ?",
        [id]
    );

    return rows[0] ?? null;
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
const updateNota = async (id, { nota }) => {
    const db = await getConnection();

    const existe = await getNotaById(id);
    if (!existe) return null;

    await db.execute(
        "UPDATE NotasObras SET Nota = ? WHERE idNotaObra = ?",
        [nota, id]
    );

    return true;
};

// ─── DELETE (hard, no tiene Activo) ──────────────────────────────────────────
const deleteNota = async (id) => {
    const db = await getConnection();

    const existe = await getNotaById(id);
    if (!existe) return null;

    await db.execute(
        "DELETE FROM NotasObras WHERE idNotaObra = ?",
        [id]
    );

    return true;
};

export default {
    createNota,
    getNotasByObra,
    getNotaById,
    updateNota,
    deleteNota
};