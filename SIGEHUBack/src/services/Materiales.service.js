import { getConnection } from "../config/db.js";
import audit from "./Auditoria.service.js";

// ─── GET todos los materiales ───────────────────────────────────────────────
const getMateriales = async () => {
    const db = await getConnection();

    const result = await db.query(
        "SELECT * FROM Materiales",
        []
    );

    return result;
};

// ─── GET Material por ID ────────────────────────────────────────────────────
const getMaterialById = async (id) => {
    const db = await getConnection();

    const result = await db.query(
        "SELECT * FROM Materiales WHERE idMaterial = ?",
        [id]
    );

    return result[0] ?? null;
};

// ─── INSERT ───────────────────────────────────────────────────────────────────
const createMaterial = async ({ Nombre, UnidadMedida, Descripcion }) => {
    const db = await getConnection();

    // ── Transacción 1: insertar Material ──────────────────────────────────
    const txInsert = await db.transaction();

    let nuevoId;
    try {
        await txInsert.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        const rows = await txInsert.query(
            `SELECT * FROM SP_INSERTAR_MATERIAL (?, ?, ?)`,
            [Nombre, UnidadMedida, Descripcion ?? null]
        );

        await txInsert.commit();
        console.log("nuevoId: ", rows)
        nuevoId = rows[0].OIDMaterial; // nombre en mayúsculas, Firebird normaliza

    } catch (err) {
        await txInsert.rollback();
        throw err;
    }

    return nuevoId;
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
const updateMaterial = async (id, { Nombre, UnidadMedida, Descripcion }) => {
    const db = await getConnection();

    // ── 1. Leer el registro actual ANTES de modificar ───────────────────────
    const txRead = await db.transaction();
    let anterior;

    try {
        const rows = await txRead.query(
            `SELECT Nombre, UnidadMedida, Descripcion
             FROM Materiales WHERE IdMaterial = ?`,
            [id]
        );

        await txRead.commit();

        if (!rows || rows.length === 0) return null; // no existe

        anterior = rows[0];

    } catch (err) {
        await txRead.rollback();
        throw err;
    }

    const txUpdate = await db.transaction();

    try {
        await txUpdate.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await txUpdate.execute(
            `UPDATE Materiales
             SET Nombre = ?,
                 UnidadMedida = ?,
                 Descripcion = ?,
             WHERE IdMaterial  = ?`,
            [Nombre, UnidadMedida, Descripcion ?? null, id]
        );

        await txUpdate.commit();

    } catch (err) {
        await txUpdate.rollback();
        throw err;
    }
    const txAudit = await db.transaction();
    let idAudit;

    try {
        const rows = await db.query(`
            SELECT
                RDB$GET_CONTEXT(
                    'USER_SESSION',
                    'LAST_AUDIT_ID'
                ) AS ID
            FROM RDB$DATABASE
        `);

        idAudit = rows[0].ID;
        console.log("id: ", idAudit);
        await txAudit.commit();
    } catch (err) {
        await txAudit.rollback();
        throw err;
    } 
    const comparacion = [
        { campo: 'Nombre', anterior: anterior.NOMBRE, nuevo: Nombre },
        { campo: 'UnidadMedida', anterior: anterior.UNIDADMEDIDA, nuevo: UnidadMedida },
        { campo: 'Descripcion', anterior: anterior.DESCRIPCION, nuevo: Descripcion ?? null },
    ];

    const cambios = comparacion.filter(
        ({ anterior, nuevo }) => String(anterior ?? '') !== String(nuevo ?? '')
    );

    if (cambios.length > 0) {
        for (const { campo, anterior: ant, nuevo } of cambios) {
            await audit.createAuditoriaDetalle({
                pIdAuditoria: idAudit,
                pCampo: campo,
                pValorAnterior: String(ant ?? ''),
                pValorNuevo: String(nuevo ?? '')
            });
        }
    }

    return true;
};

// ─── DELETE (soft) ────────────────────────────────────────────────────────────
const deleteMaterial = async (id) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await transaction.execute(
            "UPDATE Materiales SET Activo = FALSE WHERE IdMaterial = ?",
            [id]
        );

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return true;
};

export default {
    getMateriales,
    getMaterialById,
    createMaterial,
    updateMaterial,
    deleteMaterial,
};