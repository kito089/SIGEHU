import { getConnection } from '../config/db.js';
import audit from './Auditoria.service.js';

// ─── GET todas las Garantias ───────────────────────────────────────────────
const getGarantias = async () => {
    const db = await getConnection();
    try {
        const Garantias = await db.query('SELECT * FROM Garantias');
        return Garantias;
    } catch (error) {
        console.error('Error al obtener las Garantias:', error);
        throw error;
    }
    return error;
}

// ─── GET Garantia por ID ───────────────────────────────────────────────────
const getGarantiaById = async (id) => {
    const db = await getConnection();
    try {
        const rows = await db.query('SELECT * FROM Garantias WHERE idGarantia = ?', [id]);
        return rows[0] ?? null;
    } catch (error) {
        console.error(`Error al obtener la Garantia con ID ${id}:`, error);
        throw error;
    }
    return error;
}

// ─── INSERT ────────────────────────────────────────────────────────────────
const createGarantia = async ({ idObra, descripcion}) => {
    const db = await getConnection();
    const txInsert = await db.transaction();
    let nuevoId;
    try {
        await txInsert.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        
        const rows = await txInsert.query(
            `SELECT * FROM SP_ABRIR_GARANTIA (?, ?)`,
            [idObra, descripcion ?? null]
        );
        nuevoId = rows[0]?.IDGARANTIA;
        await txInsert.commit();
    } catch (error) {
        await txInsert.rollback();
        console.error('Error al crear la Garantia:', error);
        throw error;
    }
    return nuevoId;
}

// ─── UPDATE ────────────────────────────────────────────────────────────────
const updateGarantia = async (id, { descripcion, idEstado, resolucion, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();
    const txRead = await db.transaction();
    let anterior;

    try {
        const rows = await txRead.query(
            `SELECT Descripcion, EstadosGarantia_idEstadoGarantia, 
            DescripcionResolucion FROM Garantias WHERE idGarantia = ?`,
            [id]
        );
        await txRead.commit();

        anterior = rows[0] ?? null;
    } catch (error) {
        await txRead.rollback();
        console.error(`Error al obtener la Garantia con ID ${id} para auditoría:`, error);
        throw error;
    }

    const txUpdate = await db.transaction();

    try {
        await txUpdate.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const rows = await txUpdate.execute(
            `UPDATE Garantias
             SET Descripcion = ?, EstadosGarantia_idEstadoGarantia = ?, 
             DescripcionResolucion = ? WHERE idGarantia = ?`,
            [descripcion ?? null, idEstado, resolucion ?? null, id]
        );

        await txUpdate.commit();
    } catch (error) {
        await txUpdate.rollback();
        console.error(`Error al actualizar la Garantia con ID ${id}:`, error);
        throw error;
    }

    const txAudit = await db.transaction();
    let idAuditoria;
    try {
        const rows = await txAudit.query(`
            SELECT
                RDB$GET_CONTEXT('USER_SESSION', 'LAST_AUDIT_ID') AS ID
            FROM RDB$DATABASE
        `);

        idAudit = rows[0]?.ID;

        await txAudit.commit();
    } catch (err) {
        await txAudit.rollback();
        throw err;
    }

    const comparacion = [
        { campo: 'Descripcion', anterior: anterior?.DESCRIPCION, nuevo: descripcion ?? null },
        { campo: 'EstadosGarantia_idEstadoGarantia', anterior: anterior?.ESTADOSGARANTIA_IDESTADOGARANTIA, nuevo: idEstado },
        { campo: 'DescripcionResolucion', anterior: anterior?.DESCRIPCIONRESOLUCION, nuevo: resolucion ?? null }
    ];

    const cambios = comparacion.filter(
        ({ anterior, nuevo }) => String(anterior ?? '') !== String(nuevo ?? '')
    );

    if (idAudit && cambios.length > 0) {
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
}

// ─── DELETE ────────────────────────────────────────────────────────────────
const deleteGarantia = async (id) => {
    const db = await getConnection();
    const txDelete = await db.transaction();

    try {
        await txDelete.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );

        const rows = await txDelete.execute(
            "SELECT idGarantia FROM Garantias WHERE idGarantia = ? AND Activo = TRUE",
            [id]
        );
        
        if (!rows || rows.length === 0) {
            await txDelete.rollback();
            return null;
        }

        await txDelete.execute(
            "UPDATE Garantias SET Activo = FALSE WHERE idGarantia = ?",
            [id]
        );

        await txDelete.commit();

    } catch (error) {
        await txDelete.rollback();
        console.error(`Error al eliminar la Garantia con ID ${id}:`, error);
        throw error;
    }

    return true;
};

export default {
    getGarantias,
    getGarantiaById,
    createGarantia,
    updateGarantia,
    deleteGarantia
};