import { getConnection } from "../config/db.js";
import audit from "./Auditoria.service.js";
import fs from "node:fs";
import path from "node:path";

function getRootPath() {
    if (process.env.NODE_ENV === "production") {
        return path.dirname(process.execPath);
    }
    return process.cwd();
}

function eliminarArchivoImss(rutaRelativa) {
    if (!rutaRelativa) return;
    const ruta = path.join(getRootPath(), rutaRelativa);
    if (!ruta.startsWith(path.join(getRootPath(), "uploads"))) return;
    try {
        if (fs.existsSync(ruta)) {
            fs.unlinkSync(ruta);
        }
    } catch (err) {
        console.error("No se pudo eliminar el archivo IMSS:", ruta, err.message);
    }
}

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
        "SELECT * FROM Trabajadores WHERE Activo = TRUE",
        []
    );

    return result;
};

// ─── GET trabajador por ID ────────────────────────────────────────────────────
const getTrabajadorById = async (id) => {
    const db = await getConnection();

    const result = await db.query(
        "SELECT * FROM Trabajadores WHERE idTrabajador = ? AND Activo = TRUE",
        [id]
    );

    return result[0] ?? null;
};

const getTrabajadorByUsuario = async (usuario) => {
    const db = await getConnection();

    const result = await db.query(
        `SELECT t.*, tu.Nombre AS TipoUsuario
         FROM Trabajadores t
         JOIN TiposUsuarios tu ON t.TiposUsuarios_idTipoUsuario = tu.idTipoUsuario
         WHERE t.NombreUsuario = ? AND t.Activo = TRUE`,
        [usuario]
    );

    return result[0] ?? null;
};

// ─── GET existe usuario (para validación de unicidad) ────────────────────────
const checkUsername = async (usuario, idExcluir = null) => {
    const db = await getConnection();

    let result;
    if (idExcluir) {
        result = await db.query(
            "SELECT idTrabajador FROM Trabajadores WHERE NombreUsuario = ? AND idTrabajador <> ?",
            [usuario, idExcluir]
        );
    } else {
        result = await db.query(
            "SELECT idTrabajador FROM Trabajadores WHERE NombreUsuario = ?",
            [usuario]
        );
    }

    return (result || []).length > 0;
};

// ─── UPDATE ruta documento IMSS ───────────────────────────────────────────────
const updateRutaImss = async (id, rutaImss, idTrabajadorCtx = 1) => {
    const db = await getConnection();

    const transaction = await db.transaction();

    try {
        const prev = await transaction.query(
            "SELECT RutaDocumentoIMSS FROM Trabajadores WHERE idTrabajador = ?",
            [id]
        );
        const rutaAnterior = prev[0]?.RUTADOCUMENTOIMSS ?? prev[0]?.rutaDocumentoIMSS ?? null;

        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );
        await transaction.execute(
            "EXECUTE PROCEDURE SP_ACTUALIZAR_RUTA_IMSS (?, ?)",
            [id, rutaImss]
        );
        await transaction.commit();

        if (rutaAnterior && rutaAnterior !== rutaImss) {
            eliminarArchivoImss(rutaAnterior);
        }
    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return true;
};

// ─── CREATE ───────────────────────────────────────────────────────────────────
const createTrabajador = async ({ Usuario, Contra, Nombre, Telefono, Tipo, RutaDocumentoIMSS, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();

    const txInsert = await db.transaction();

    let nuevoId;
    console.log("Datos recibidos 2: ",{ Usuario, Contra, Nombre, Telefono, Tipo });
    try {
        await txInsert.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
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
const updateTrabajador = async (id, { Usuario, Contra, Nombre, Telefono, Tipo, RutaDocumentoIMSS, deleteImss = false, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();

    // ── 1. Leer el registro actual ANTES de modificar ───────────────────────
    const txRead = await db.transaction();
    let anterior;

    try {
        const rows = await txRead.query(
            `SELECT NombreUsuario, NombreCompleto, Telefono, TiposUsuarios_idTipoUsuario, RutaDocumentoIMSS
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

    const rutaAnterior = anterior.RUTADOCUMENTOIMSS ?? anterior.rutaDocumentoImss ?? null;

    const txUpdate = await db.transaction();

    try {
        await txUpdate.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );
        await txUpdate.execute(
            `UPDATE Trabajadores
             SET NombreUsuario = ?,
                 Contra = COALESCE(?, Contra),
                 NombreCompleto = ?,
                 Telefono = ?,
                 RutaDocumentoIMSS = COALESCE(?, RutaDocumentoIMSS),
                 TiposUsuarios_idTipoUsuario = ?
             WHERE IdTrabajador  = ?`,
            [Usuario, Contra ?? null, Nombre, Telefono ?? null, RutaDocumentoIMSS ?? null, Tipo, id]
        );

        if (deleteImss) {
            await txUpdate.execute(
                "UPDATE Trabajadores SET RutaDocumentoIMSS = NULL WHERE IdTrabajador = ?",
                [id]
            );
        }

        await txUpdate.commit();

        if (deleteImss && rutaAnterior) {
            eliminarArchivoImss(rutaAnterior);
        } else if (RutaDocumentoIMSS && rutaAnterior && rutaAnterior !== RutaDocumentoIMSS) {
            eliminarArchivoImss(rutaAnterior);
        }

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
const deleteTrabajador = async (id, idTrabajadorCtx = 1) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        const rows = await transaction.query(
            "SELECT RutaDocumentoIMSS FROM Trabajadores WHERE IdTrabajador = ?",
            [id]
        );
        const rutaImss = rows[0]?.RUTADOCUMENTOIMSS ?? rows[0]?.rutaDocumentoImss ?? null;

        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );
        await transaction.execute(
            "UPDATE Trabajadores SET Activo = FALSE WHERE IdTrabajador = ?",
            [id]
        );

        await transaction.commit();

        if (rutaImss) {
            eliminarArchivoImss(rutaImss);
        }

    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return true;
};

// ─── PATCH activo (toggle switch) ─────────────────────────────────────────────
const cambiarActivo = async (id, activo, idTrabajadorCtx = 1) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );
        await transaction.execute(
            "UPDATE Trabajadores SET Activo = ? WHERE IdTrabajador = ?",
            [activo ? 1 : 0, id]
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
    getTrabajadorByUsuario,
    checkUsername,
    updateRutaImss,
    createTrabajador,
    updateTrabajador,
    deleteTrabajador,
    cambiarActivo,
};