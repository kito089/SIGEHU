import { getConnection } from "../config/db.js";

// ─── CREATE: asignar material a obra ─────────────────────────────────────────
const asignarMaterial = async ({ idObra, idMaterial, cantidad, medida, notas }) => {
    const db = await getConnection();

    await db.execute(
        `INSERT INTO Obras_has_Materiales (Obras_idObra, Materiales_idMaterial, Cantidad, Medida, Notas)
         VALUES (?, ?, ?, ?, ?)`,
        [idObra, idMaterial, cantidad ?? null, medida ?? null, notas ?? null]
    );

    return true;
};

// ─── GET materiales de una obra ──────────────────────────────────────────────
const getMaterialesByObra = async (idObra) => {
    const db = await getConnection();

    return await db.query(
        `SELECT om.*, m.Nombre, m.UnidadMedida
         FROM Obras_has_Materiales om
         JOIN Materiales m ON m.idMaterial = om.Materiales_idMaterial
         WHERE om.Obras_idObra = ?`,
        [idObra]
    );
};

// ─── GET una asignación específica ───────────────────────────────────────────
const getAsignacion = async (idObra, idMaterial) => {
    const db = await getConnection();

    const rows = await db.query(
        "SELECT * FROM Obras_has_Materiales WHERE Obras_idObra = ? AND Materiales_idMaterial = ?",
        [idObra, idMaterial]
    );

    return rows[0] ?? null;
};

// ─── UPDATE: editar cantidad/medida/notas ────────────────────────────────────
const actualizarAsignacion = async (idObra, idMaterial, { cantidad, medida, notas }) => {
    const db = await getConnection();

    const existe = await getAsignacion(idObra, idMaterial);
    if (!existe) return null;

    await db.execute(
        `UPDATE Obras_has_Materiales
         SET Cantidad = ?, Medida = ?, Notas = ?
         WHERE Obras_idObra = ? AND Materiales_idMaterial = ?`,
        [cantidad ?? null, medida ?? null, notas ?? null, idObra, idMaterial]
    );

    return true;
};

// ─── DELETE: quitar material de la obra (hard, sin Activo) ──────────────────
const quitarMaterial = async (idObra, idMaterial) => {
    const db = await getConnection();

    const existe = await getAsignacion(idObra, idMaterial);
    if (!existe) return null;

    await db.execute(
        "DELETE FROM Obras_has_Materiales WHERE Obras_idObra = ? AND Materiales_idMaterial = ?",
        [idObra, idMaterial]
    );

    return true;
};

export default {
    asignarMaterial,
    getMaterialesByObra,
    getAsignacion,
    actualizarAsignacion,
    quitarMaterial
};