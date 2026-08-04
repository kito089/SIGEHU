import { getConnection } from "../config/db.js";

// ─── CREATE: asignar trabajador a Garantia ───────────────────────────────────────
const asignarTrabajador = async ({ idGarantia, idTrabajador }) => {
    const db = await getConnection();

    const rows = await db.query(
        `INSERT INTO Garantias_has_Trabajadores (Garantias_idGarantia, Trabajadores_idTrabajador)
         VALUES (?, ?)
         RETURNING idDetalleAsignacion`,
        [idGarantia, idTrabajador]
    );

    return rows[0]?.IDDETALLEASIGNACION;
};

// ─── GET trabajadores asignados a una Garantia ───────────────────────────────────
const getTrabajadoresByGarantia = async (idGarantia) => {
    const db = await getConnection();

    return await db.query(
        `SELECT oht.*, t.NombreUsuario, t.NombreCompleto
         FROM Garantias_has_Trabajadores oht
         JOIN Trabajadores t ON t.idTrabajador = oht.Trabajadores_idTrabajador
         WHERE oht.Garantias_idGarantia = ?`,
        [idGarantia]
    );
};

// ─── DELETE: quitar trabajador de la Garantia (hard, sin Activo) ────────────────
const quitarTrabajador = async (idDetalleAsignacion) => {
    const db = await getConnection();

    const rows = await db.query(
        "SELECT * FROM Garantias_has_Trabajadores WHERE idDetalleAsignacion = ?",
        [idDetalleAsignacion]
    );

    if (!rows || rows.length === 0) return null;

    await db.execute(
        "DELETE FROM Garantias_has_Trabajadores WHERE idDetalleAsignacion = ?",
        [idDetalleAsignacion]
    );

    return true;
};

export default {
    asignarTrabajador,
    getTrabajadoresByGarantia,
    quitarTrabajador
};