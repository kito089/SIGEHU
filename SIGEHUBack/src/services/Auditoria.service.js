import { getConnection } from "../config/db.js";

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
            [pIdAuditoria, pCampo, ValorAnterior, ValorNuevo]
        );

        await txDetalle.commit();

    } catch (err) {
        await txDetalle.rollback();
        console.error("Error al registrar auditoría detalle:", err.message);
    }
};

export default {
    createAuditoria,
    createAuditoriaDetalle,
}