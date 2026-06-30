import { getConnection } from "../config/db.js";
import audit from "./Auditoria.service.js";

// ─── GET todos los Tipos de Usuarios ───────────────────────────────────────────────
const getTiposUsuarios = async () => {
    const db = await getConnection();
    
    const result = await db.query(
        "SELECT * FROM TiposUsuarios",
        []
    );

    return result;
};

// ─── GET todos los trabajadores ───────────────────────────────────────────────
const getTrabajadores = async () => {
    const db = await getConnection();

    const result = await db.query(
        "SELECT * FROM Trabajadores",
        []
    );

    return result;
};

// ─── GET trabajador por ID ────────────────────────────────────────────────────
const getTrabajadorById = async (id) => {
    const db = await getConnection();

    const result = await db.query(
        "SELECT * FROM Trabajadores WHERE idTrabajador = ?",
        [id]
    );

    return result[0] ?? null;
};

// ─── INSERT ───────────────────────────────────────────────────────────────────
const createTrabajador = async ({ Usuario, Contra, Nombre, Telefono, Tipo }) => {
    const db = await getConnection();

    // ── Transacción 1: insertar trabajador ──────────────────────────────────
    const txInsert = await db.transaction();

    let nuevoId;
    console.log("Datos recibidos 2: ",{ Usuario, Contra, Nombre, Telefono, Tipo });
    try {
        await txInsert.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        const rows = await txInsert.query(
            `SELECT * FROM SP_INSERTAR_TRABAJADOR (?, ?, ?, ?, ?)`,
            [Usuario, Contra, Nombre, Telefono ?? null, Tipo]
        );
        console.log("nuevoId: ", rows)
        nuevoId = rows[0].OIDTRABAJADOR; // nombre en mayúsculas, Firebird normaliza
        await txInsert.commit();
        
    } catch (err) {
        await txInsert.rollback();
        throw err;
    }

    return nuevoId;
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
const updateTrabajador = async (id, { Usuario, Contra, Nombre, Telefono, Tipo }) => {
    const db = await getConnection();

    // ── 1. Leer el registro actual ANTES de modificar ───────────────────────
    const txRead = await db.transaction();
    let anterior;

    try {
        const rows = await txRead.query(
            `SELECT NombreUsuario, NombreCompleto, Telefono, TiposUsuarios_idTipoUsuario
             FROM Trabajadores WHERE IdTrabajador = ?`,
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
            `UPDATE Trabajadores
             SET NombreUsuario = ?,
                 Contra = COALESCE(?, Contra),
                 NombreCompleto = ?,
                 Telefono = ?,
                 TiposUsuarios_idTipoUsuario = ?
             WHERE IdTrabajador  = ?`,
            [Usuario, Contra ?? null, Nombre, Telefono ?? null, Tipo, id]
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
        { campo: 'NombreUsuario', anterior: anterior.NOMBREUSUARIO, nuevo: Usuario },
        { campo: 'NombreCompleto', anterior: anterior.NOMBRECOMPLETO, nuevo: Nombre },
        { campo: 'Telefono', anterior: anterior.TELEFONO, nuevo: Telefono ?? null },
        { campo: 'Tipo', anterior: anterior.TIPOSUSUARIOS_IDTIPOUSUARIO, nuevo: Tipo },
    ];

    const cambios = comparacion.filter(
        ({ anterior, nuevo }) => String(anterior ?? '') !== String(nuevo ?? '')
    );
    if (Contra){      
        await audit.createAuditoriaDetalle({
            pIdAuditoria: idAudit,
            pCampo: "Contra",
        })
    }
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
const deleteTrabajador = async (id) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await transaction.execute(
            "UPDATE Trabajadores SET Activo = FALSE WHERE IdTrabajador = ?",
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
    getTiposUsuarios,
    getTrabajadores,
    getTrabajadorById,
    createTrabajador,
    updateTrabajador,
    deleteTrabajador,
};