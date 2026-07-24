import { getConnection } from "../config/db.js";

// ─── CREATE ─────────────────────────────────────────────────────────────────
const createContacto = async ({ idCliente, nombre, telefono, correo, observaciones }) => {
    const db = await getConnection();
    const txInsert = await db.transaction();
    try {
        await txInsert.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await txInsert.execute(
            `INSERT INTO ContactosClientes (Clientes_idCliente, NombreCompleto, Telefono, Correo, Observaciones)
            VALUES (?, ?, ?, ?, ?)`,
            [idCliente, nombre, telefono ?? null, correo ?? null, observaciones ?? null]
        );
        
        await txInsert.commit();
    } catch (err) {
        await txInsert.rollback();
        throw err;
    }

    return true;
};

// ─── GET contactos por cliente ────────────────────────────────────────────────────────────
const getContactosByCliente = async (idCliente) => {
    const db = await getConnection();

    return await db.query(
        "SELECT * FROM ContactosClientes WHERE Clientes_idCliente = ?",
        [idCliente]
    );
};

// ─── GET por ID ──────────────────────────────────────────────────────────────
const getContactoById = async (id) => {
    const db = await getConnection();

    const rows = await db.query(
        "SELECT * FROM ContactosClientes WHERE idContactoCliente = ?",
        [id]
    );

    return rows[0] ?? null;
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
const updateContacto = async (id, { nombre, telefono, correo, observaciones }) => {
    const db = await getConnection();

    // ── 1. Leer el registro actual ANTES de modificar ───────────────────────
        const txRead = await db.transaction();
        let anterior;
    
        try {
            const rows = await txRead.query(
                `SELECT nombre, telefono, correo, observaciones
                 FROM ContactosClientes WHERE idContactoCliente = ?`,
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
                `UPDATE ContactosClientes
                 SET nombre = ?, telefono = ?, correo = ?, observaciones = ?
                 WHERE idContactoCliente = ?`,
                [nombre, telefono ?? null, correo ?? null, observaciones ?? null, id]
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
            { campo: 'Nombre', anterior: anterior.NOMBRE, nuevo: nombre },
            { campo: 'Telefono', anterior: anterior.TELEFONO, nuevo: telefono ?? null },
            { campo: 'Correo', anterior: anterior.CORREO, nuevo: correo ?? null },
            { campo: 'Observaciones', anterior: anterior.OBSERVACIONES, nuevo: observaciones ?? null }
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

// ─── DELETE (hard, no tiene Activo) ──────────────────────────────────────────
const deleteContacto = async (id) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await transaction.execute(
            "DELETE FROM ContactosClientes WHERE idContactoCliente = ?",
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
    createContacto,
    getContactosByCliente,
    getContactoById,
    updateContacto,
    deleteContacto
};