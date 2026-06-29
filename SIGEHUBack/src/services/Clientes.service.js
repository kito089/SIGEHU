import { getConnection } from "../config/db.js";
import audit from "./Auditoria.service.js";

// ─── GET todos los Regimentes Fiscales ───────────────────────────────────────────────
const getRegimenesFiscales = async () => {
    const db = await getConnection();
    const result = await db.query(
        "SELECT * FROM RegimenesFiscales",
        []
    );

    return result;
}

// ─── GET todos los Usos del CFDI ───────────────────────────────────────────────
const getUsosCFDI = async () => {
    const db = await getConnection();
    const result = await db.query(
        "SElECT * FROM UsosCFDI",
        []
    );

    return result;
}

// ─── GET todos los Clientes ───────────────────────────────────────────────
const getClientes = async () => {
    const db = await getConnection();
    const result = await db.query(
        `VIEW VW_CLIENTES_CON_OBRAS`, // clientes con su contador de obras
        []
    );

    return result;
};

// ─── GET Cliente por ID ────────────────────────────────────────────────────
const getClienteById = async (id) => {
    const db = await getConnection();

    const Clientes = await db.query(
        "SELECT * FROM Clientes WHERE idCliente = ?",
        [id]
    );

    const Obras = await db.query(
        "SELECT * FROM Obras WHERE Clientes_idCliente = ?",
        [id]
    )

    return {
        ...clientes[0],
        Obras: Obras
    };
};

// ─── INSERT ───────────────────────────────────────────────────────────────────
const createCliente = async ({ 
    NombreCompleto, Telefono, Correo, 
    Direccion, RFC, idRegimenFiscal, CodigoPostal, 
    idUsoCFDI, Observaciones
}) => {
    const db = await getConnection();

    // ── Transacción 1: insertar Cliente ──────────────────────────────────
    const txInsert = await db.transaction();

    let nuevoId;
    try {
        await txInsert.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await txInsert.execute(
            `INSERT INTO Clientes ()
            VALUES (?)`,
            [NombreCompleto, Telefono, Correo ?? null, 
            Direccion ?? null, RFC ?? null, idRegimenFiscal ?? null, 
            CodigoPostal ?? null, idUsoCFDI ?? null, Observaciones ?? null]
        );

        await txInsert.commit();
    } catch (err) {
        await txInsert.rollback();
        throw err;
    }

    return nuevoId;
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
const updateCliente = async (id, { NombreCompleto, Telefono, Correo, 
                                    Direccion, RFC, idRegimenFiscal, CodigoPostal, 
                                    idUsoCFDI, Observaciones }) => {
    const db = await getConnection();

    // ── 1. Leer el registro actual ANTES de modificar ───────────────────────
    const txRead = await db.transaction();
    let anterior;

    try {
        const rows = await txRead.query(
            `SELECT NombreCompleto, Telefono, Correo, 
                    Direccion, RFC, idRegimenFiscal, CodigoPostal, 
                    idUsoCFDI, Observaciones
             FROM Clientes WHERE IdCliente = ?`,
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
            `UPDATE Clientes
             SET NombreCompleto = ?, Telefono = ?, Correo = ?, 
                Direccion = ?, RFC = ?, idRegimenFiscal = ?, CodigoPostal = ?, 
                idUsoCFDI = ?, Observaciones = ?
             WHERE IdCliente = ?`,
            [NombreCompleto, Telefono, Correo ?? null, 
            Direccion ?? null, RFC ?? null, idRegimenFiscal ?? null, 
            CodigoPostal ?? null, idUsoCFDI ?? null, Observaciones ?? null, id]
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
        { campo: 'NombreCompleto', anterior: anterior.NOMBRECOMPLETO, nuevo: NombreCompleto },
        { campo: 'Telefono', anterior: anterior.TELEFONO, nuevo: Telefono },
        { campo: 'Correo', anterior: anterior.CORREO, nuevo: Correo ?? null },
        { campo: 'Direccion', anterior: anterior.DIRECCION, nuevo: Direccion ?? null },
        { campo: 'RFC', anterior: anterior.RFC, nuevo: RFC ?? null },
        { campo: 'RegimenesFiscales_idRegimenFiscal', anterior: anterior.REGIMENESFISCALES_IDREGIMENFISCAL, nuevo: idRegimenFiscal ?? null },
        { campo: 'CodigoPostal', anterior: anterior.CODIGOPOSTAL, nuevo: CodigoPostal ?? null },
        { campo: 'UsosCFDI_idUsoCFDI', anterior: anterior.USOSCFDI_IDUSOCFDI, nuevo: idUsoCFDI ?? null },
        { campo: 'Observaciones', anterior: anterior.OBSERVACIONES, nuevo: Observaciones ?? null },
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
const deleteCliente = async (id) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await transaction.execute(
            "UPDATE Clientes SET Activo = FALSE WHERE IdCliente = ?",
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
    getRegimenesFiscales,
    getUsosCFDI,
    getClientes,
    getClienteById,
    createCliente,
    updateCliente,
    deleteCliente,
};