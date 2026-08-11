import { getConnection } from "../config/db.js";
import fs from "node:fs";
import path from "node:path";
import { getDataRoot } from "../config/paths.js";

// ─── AUDITORIA ───────────────────────────────────────────────────────────────
const createAuditoria = async ({ pIdTrabajador, pTabla, pAccion, pDescripcion, pRegistroAfectado }) => {
    const db = await getConnection();
    const txAudit = await db.transaction();
    const descripcionBuffer = Buffer.from(
        pDescripcion ?? "",
        "utf8"
    );
    try {
        const rows = await txAudit.query(
            `SELECT * FROM SP_INSERTAR_AUDITORIA (?, ?, ?, ?, ?)`,
            [pIdTrabajador, pTabla, pAccion, descripcionBuffer, pRegistroAfectado]
        );

        await txAudit.commit();
        console.log("OIDAUDITORIA", rows)
        return rows[0]?.OIDAUDITORIA ?? null;

    } catch (err) {
        await txAudit.rollback();
        console.error("Error al registrar auditoría:", err.message);
    }
};

// ─── AUDITORIA DETALLE ───────────────────────────────────────────────────────
const createAuditoriaDetalle = async ({ pIdAuditoria, pCampo, pValorAnterior, pValorNuevo }) => {
    const db = await getConnection();
    const txDetalle = await db.transaction();
    const ValorAnterior = Buffer.from(
        pValorAnterior ?? "",
        "utf8"
    );
    const ValorNuevo = Buffer.from(
        pValorNuevo ?? "",
        "utf8"
    );

    try {
        await txDetalle.procedure(
            `EXECUTE PROCEDURE SP_INSERTAR_AUDITORIA_DETALLE (?, ?, ?, ?)`,
            [pIdAuditoria, pCampo, ValorAnterior ?? null, ValorNuevo ?? null]
        );

        await txDetalle.commit();

    } catch (err) {
        await txDetalle.rollback();
        console.error("Error al registrar auditoría detalle:", err.message);
    }
};

// ─── HISTORIAL POR CLIENTE ───────────────────────────────────────────────────
const getAuditoriaByCliente = async (idCliente, limit = 50) => {
    const db = await getConnection();

    return await db.query(
        `SELECT a.idAuditoria AS ID_AUDITORIA, a.Fecha AS FECHA,
                a.Tabla AS ENTIDAD, a.Accion AS ACCION, a.Descripcion,
                a.RegistroAfectado AS ID_ENTIDAD,
                t.NombreCompleto AS USUARIO,
                (SELECT LIST(Campo || ': ' ||
                    COALESCE(ValorAnterior, '(nuevo)') || ' -> ' ||
                    COALESCE(ValorNuevo, '(' || a.Accion || ')')
                ) FROM AuditoriasDetalles ad
                WHERE ad.Auditorias_idAuditoria = a.idAuditoria
                ) AS DETALLES_CAMBIOS
         FROM Auditorias a
         JOIN Trabajadores t ON t.idTrabajador = a.Trabajadores_idTrabajador
         WHERE UPPER(a.Tabla) = 'CLIENTES'
           AND CAST(a.RegistroAfectado AS VARCHAR(20)) = ?
         ORDER BY a.Fecha DESC
         ROWS ?`,
        [String(idCliente), limit]
    );
};

// ─── ACTIVIDAD RECIENTE (RF-33) ─────────────────────────────────────────────
// Cabeceras de auditoría más recientes. La descripción amigable ya está
// construida por los triggers (Auditorias.Descripcion).
const getActividad = async (limit = 20) => {
    const db = await getConnection();

    return await db.query(
        `SELECT a.idAuditoria AS IDAUDITORIA, a.Fecha AS FECHA,
                a.Tabla AS TABLA, a.Accion AS ACCION, a.Descripcion AS DESCRIPCION,
                a.RegistroAfectado AS REGISTROAFECTADO,
                t.NombreCompleto AS TRABAJADOR
         FROM Auditorias a
         JOIN Trabajadores t ON t.idTrabajador = a.Trabajadores_idTrabajador
         ORDER BY a.Fecha DESC
         ROWS ?`,
        [limit]
    );
};

// ─── HISTORIAL COMPLETO (con filtro opcional por día) ────────────────────────
const getAuditorias = async ({ dia = null, limit = 500 }) => {
    const db = await getConnection();
    const params = [];
    let where = '';

    if (dia) {
        where = 'WHERE CAST(a.Fecha AS DATE) = CAST(? AS DATE)';
        params.push(dia);
    }
    params.push(limit);

    return await db.query(
        `SELECT a.idAuditoria AS IDAUDITORIA, a.Fecha AS FECHA,
                a.Tabla AS TABLA, a.Accion AS ACCION, a.Descripcion AS DESCRIPCION,
                a.RegistroAfectado AS REGISTROAFECTADO,
                t.NombreCompleto AS TRABAJADOR
         FROM Auditorias a
         JOIN Trabajadores t ON t.idTrabajador = a.Trabajadores_idTrabajador
         ${where}
         ORDER BY a.Fecha DESC
         ROWS ?`,
        params
    );
};

// ─── DETALLES DE UNA AUDITORÍA (AuditoriasDetalles) ──────────────────────────
// Para el campo RutaDocumentoIMSS se incluye el flag `existeDocumento`: true
// solo si el archivo está físicamente presente en uploads/imss. El frontend usa
// ese flag para mostrar el botón "Ver documento" y así evitar enlaces a
// archivos eliminados. Nunca se exponen rutas físicas del servidor.
function archivoImssExiste(rutaRelativa) {
    if (!rutaRelativa || !String(rutaRelativa).startsWith("uploads/imss/")) {
        return false;
    }
    const dataRoot = getDataRoot();
    const uploadsRoot = path.join(dataRoot, "uploads");
    const ruta = path.join(dataRoot, String(rutaRelativa));
    if (!ruta.startsWith(uploadsRoot)) return false;
    try {
        return fs.existsSync(ruta);
    } catch {
        return false;
    }
}

const getAuditoriaDetalles = async (idAuditoria) => {
    const db = await getConnection();

    const rows = await db.query(
        `SELECT idAuditoriaDetalle AS IDAUDITORIADETALLE,
                Campo AS CAMPO, ValorAnterior AS VALORANTERIOR, ValorNuevo AS VALORNUEVO
         FROM AuditoriasDetalles
         WHERE Auditorias_idAuditoria = ?
         ORDER BY idAuditoriaDetalle`,
        [idAuditoria]
    );

    return rows.map(r => ({
        IDAUDITORIADETALLE: r.IDAUDITORIADETALLE,
        CAMPO: r.CAMPO,
        VALORANTERIOR: r.VALORANTERIOR,
        VALORNUEVO: r.VALORNUEVO,
        EXISTEDOCUMENTO: r.CAMPO === "RutaDocumentoIMSS"
            ? archivoImssExiste(r.VALORNUEVO)
            : null,
    }));
};

export default {
    createAuditoria,
    createAuditoriaDetalle,
    getAuditoriaByCliente,
    getActividad,
    getAuditorias,
    getAuditoriaDetalles,
}