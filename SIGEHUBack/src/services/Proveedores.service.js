import { getConnection } from "../config/db.js";
import audit from "./Auditoria.service.js";
import materiales from "./Materiales.service.js"

// Vincular y desvincular material

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

// ─── GET trabajador por ID ──────────────────────────────────────────────────── Catalogo_Proveedores_Materiales
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
        const rows = await txInsert.query(
            `SELECT * FROM SP_INSERTAR_TRABAJADOR (?, ?, ?, ?, ?)`,
            [Usuario, Contra, Nombre, Telefono ?? null, Tipo]
        );

        await txInsert.commit();
        console.log("nuevoId: ", rows)
        nuevoId = rows[0].OIDTRABAJADOR; // nombre en mayúsculas, Firebird normaliza

    } catch (err) {
        await txInsert.rollback();
        throw err;
    }

    const idAuditoria = await audit.createAuditoria({
        pIdTrabajador: 1, 
        pTabla: "Trabajadores", 
        pAccion: "INSERT", 
        pDescripcion: `Se agregó el trabajador ${Usuario}`, 
        pRegistroAfectado: nuevoId
    });

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

    // ── 2. Ejecutar el UPDATE ────────────────────────────────────────────────
    const txUpdate = await db.transaction();

    try {
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

    // ── 3. Determinar qué cambió ─────────────────────────────────────────────
    const comparacion = [
        { campo: 'NombreUsuario', anterior: anterior.NOMBREUSUARIO, nuevo: Usuario },
        { campo: 'NombreCompleto', anterior: anterior.NOMBRECOMPLETO, nuevo: Nombre },
        { campo: 'Telefono', anterior: anterior.TELEFONO, nuevo: Telefono ?? null },
        { campo: 'Tipo', anterior: anterior.TIPOSUSUARIOS_IDTIPOUSUARIO, nuevo: Tipo },
    ];

    const cambios = comparacion.filter(
        ({ anterior, nuevo }) => String(anterior ?? '') !== String(nuevo ?? '')
    );

    // ── 4. Registrar auditoría solo si hubo cambios ──────────────────────────
    if (cambios.length > 0) {
        const idAuditoria = await audit.createAuditoria({
            pIdTrabajador: 1,
            pTabla: 'Trabajadores',
            pAccion: 'UPDATE',
            pDescripcion: `Se actualizó el trabajador ${Usuario}`,
            pRegistroAfectado: id
        });

        if (idAuditoria) {
            for (const { campo, anterior: ant, nuevo } of cambios) {
                await audit.createAuditoriaDetalle({
                    pIdAuditoria: idAuditoria,
                    pCampo: campo,
                    pValorAnterior: String(ant ?? ''),
                    pValorNuevo: String(nuevo ?? '')
                });
            }
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
            "UPDATE Trabajadores SET Activo = FALSE WHERE IdTrabajador = ?",
            [id]
        );

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    const txRead = await db.transaction();
    let Usuario;
    try {
        const rows = await txRead.query(
            `SELECT NombreUsuario FROM Trabajadores WHERE idTrabajador = ?`,
            [id]
        );

        if (!rows || rows.length === 0) return null; // no existe
        console.log("Usuario desactivado: ", rows)
        Usuario = rows[0].NOMBREUSUARIO;
        console.log(Usuario)

        await txRead.commit();
    } catch (err) {
        await txRead.rollback();
        throw err;
    }

    const idAuditoria = await audit.createAuditoria({
        pIdTrabajador: 1, 
        pTabla: "Trabajadores", 
        pAccion: "DELETE", 
        pDescripcion: `Se eliminó el trabajador ${Usuario}`, 
        pRegistroAfectado: id
    });

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