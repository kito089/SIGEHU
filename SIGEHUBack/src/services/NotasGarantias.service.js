import { getConnection } from "../config/db.js";

// ─── CREATE ─────────────────────────────────────────────────────────────────
const createNota = async ({ idGarantia, idEstadoGarantia, idTrabajador, nota }) => {
    const db = await getConnection();

    const rows = await db.query(
        `INSERT INTO NotasGarantias (Garantias_idGarantia, EstadosGarantia_idEstadoGarantia, Trabajadores_idTrabajador, Nota)
         VALUES (?, ?, ?, ?)
         RETURNING idNotaGarantia`,
        [idGarantia, idEstadoGarantia, idTrabajador, nota]
    );

    return rows[0]?.IDNOTAGarantia;
};

// ─── GET por Garantia ────────────────────────────────────────────────────────────
const getNotasByGarantia = async (idGarantia) => {
    const db = await getConnection();

    return await db.query(
        "SELECT * FROM NotasGarantias WHERE Garantias_idGarantia = ? ORDER BY FechaCreacion DESC",
        [idGarantia]
    );
};

// ─── GET por ID ──────────────────────────────────────────────────────────────
const getNotaById = async (id) => {
    const db = await getConnection();

    const rows = await db.query(
        "SELECT * FROM NotasGarantias WHERE idNotaGarantia = ?",
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
        "UPDATE NotasGarantias SET Nota = ? WHERE idNotaGarantia = ?",
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
        "DELETE FROM NotasGarantias WHERE idNotaGarantia = ?",
        [id]
    );

    return true;
};

export default {
    createNota,
    getNotasByGarantia,
    getNotaById,
    updateNota,
    deleteNota
};