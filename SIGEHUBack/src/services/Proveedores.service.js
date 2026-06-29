import { getConnection } from "../config/db.js";
import audit from "./Auditoria.service.js";
import materiales from "./Materiales.service.js"

// ─── GET todos los Proveedores ───────────────────────────────────────────────
const getProveedores = async () => {
    const db = await getConnection();

    const proveedores = await db.query("SELECT * FROM Proveedores");

    const proveedoresConMateriales = await Promise.all(
        proveedores.map(async (proveedor) => {
            const materiales = await db.query(
                `SELECT m.* FROM Materiales m
                JOIN Proveedores_has_Materiales pm ON pm.Materiales_idMaterial = m.idMaterial
                WHERE pm.Proveedores_idProveedor = ?`,
                [proveedor.IDPROVEEDOR]
            );

            return {
                ...proveedor,
                MATERIALES: materiales
            };
        })
    );

    return proveedoresConMateriales;
};

// ─── GET Proveedor por ID ────────────────────────────────────────────────────
// Pasar el objeto filtrado por id desde el front (getProveedores ya retorna toda la info necesaria)

// ─── INSERT ───────────────────────────────────────────────────────────────────
const createProveedor = async ({ Nombre, Direccion, Telefono, Correo, Notas }) => {
    const db = await getConnection();

    // ── Transacción 1: insertar Proveedor ──────────────────────────────────
    const txInsert = await db.transaction();

    let nuevoId;
    try {
        await txInsert.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await txInsert.query(
            `SELECT * FROM SP_INSERTAR_PROVEEDOR (?, ?, ?, ?, ?)`,
            [Nombre, Direccion ?? null, Telefono ?? null, Correo ?? null, Notas ?? null]
        );

        await txInsert.commit();
    } catch (err) {
        await txInsert.rollback();
        throw err;
    }

    return nuevoId;
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
const updateProveedor = async (id, { Nombre, Direccion, Telefono, Correo, Notas }) => {
    const db = await getConnection();

    // ── 1. Leer el registro actual ANTES de modificar ───────────────────────
    const txRead = await db.transaction();
    let anterior;

    try {
        const rows = await txRead.query(
            `SELECT Nombre, Direccion, Telefono, Correo, Notas
             FROM Proveedores WHERE IdProveedor = ?`,
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
        await txUpdate.procedure(
            `EXECUTE SP_ACTUALIZAR_PROVEEDOR (?, ?, ?, ?, ?, ?)`,
            [id, Nombre, Direccion ?? null, Telefono ?? null, Correo ?? null, Notas ?? null]
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
        { campo: 'Nombre',    anterior: anterior.NOMBRE,    nuevo: Nombre },
        { campo: 'Direccion', anterior: anterior.DIRECCION, nuevo: Direccion ?? null },
        { campo: 'Telefono',  anterior: anterior.TELEFONO,  nuevo: Telefono ?? null },
        { campo: 'Correo',    anterior: anterior.CORREO,    nuevo: Correo ?? null },
        { campo: 'Notas',     anterior: anterior.NOTAS,     nuevo: Notas ?? null },
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
const deleteProveedor = async (id) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await transaction.execute(
            "UPDATE Proveedores SET Activo = FALSE WHERE IdProveedor = ?",
            [id]
        );

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return true;
};

// ─── INSERT (Material a Proveedor) ────────────────────────────────────────────────────────────
const vincularMaterial = async (idProveedor, idMaterial, precio, notas) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await transaction.procedure(
            "EXECUTE SP_VINCULAR_MATERIAL_PROVEEDOR (?, ?, ?, ?)",
            [idProveedor, idMaterial, precio ?? null, notas ?? null]
        );

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return true;
};

// ─── UPDATE (Material a Proveedor) ────────────────────────────────────────────────────────────
const updateMaterial = async (idProveedor, idMaterial, { precio, notas }) => {
    const db = await getConnection();

    // ── 1. Leer el registro actual ANTES de modificar ───────────────────────
    const txRead = await db.transaction();
    let anterior;

    try {
        const rows = await txRead.query(
            `SELECT precio, notas
             FROM Proveedores_has_Materiales 
             WHERE Proveedores_idProveedor = ? AND Materiales_idMaterial = ?`,
            [idProveedor, idMaterial]
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
            `UPDATE Proveedores_has_Materiales
             SET precio = ?, notas = ?
             WHERE Proveedores_idProveedor = ? AND Materiales_idMaterial = ?`,
            [precio ?? null, notas ?? null, idProveedor, idMaterial]
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
        { campo: 'Precio', anterior: anterior.PRECIO, nuevo: precio ?? null },
        { campo: 'Notas',  anterior: anterior.NOTAS,  nuevo: notas ?? null },
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

// ─── DELETE (Material a Proveedor) ────────────────────────────────────────────────────────────
const desvincularMaterial = async (idProveedor, idMaterial) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await transaction.procedure(
            "EXECUTE SP_DESVINCULAR_MATERIAL_PROVEEDOR (?, ?)",
            [idProveedor, idMaterial]
        );

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return true;
};

export default {
    getProveedores,
    createProveedor,
    updateProveedor,
    deleteProveedor,
    vincularMaterial,
    updateMaterial,
    desvincularMaterial
};