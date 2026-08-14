import { getConnection } from "../config/db.js";

// Extrae de forma segura el valor devuelto por una sentencia INSERT...RETURNING,
// independientemente de si el driver la entrega como valor escalar, objeto o array.
// query() abre un cursor (inválido para INSERT...RETURNING), por eso estos
// INSERT usan executeReturning y este extractor.
const extractReturningValue = (rows, alias) => {
    let raw = Array.isArray(rows) && rows.length > 0 ? rows[0] : rows;
    if (raw != null && typeof raw === 'object') {
        return raw[alias];
    }
    return raw;
};

// ─── GET kit asignado a una obra (incluye checklist) ─────────────────────────
const getKitByObra = async (idObra) => {
    const db = await getConnection();

    const rows = await db.query(
        `SELECT ok.idObraKit, ok.FechaAsignacion, k.idKit, k.Nombre, k.Descripcion,
                t.NombreCompleto AS AsignadoPor
         FROM Obras_has_Kits ok
         JOIN Kits_Instalacion k ON k.idKit = ok.Kits_Instalacion_idKit
         JOIN Trabajadores t ON t.idTrabajador = ok.Trabajadores_idTrabajador
         WHERE ok.Obras_idObra = ?`,
        [idObra]
    );

    if (!rows || rows.length === 0) return null;

    const kit = rows[0];

    const items = await db.query(
        `SELECT oc.idChecklistItem, oc.Marcado, oc.FechaMarcado,
                m.idMaterial, m.Nombre AS NombreMaterial, m.UnidadMedida, m.Activo,
                km.Cantidad, km.Notas AS NotasKit
         FROM Obras_Kits_Checklist oc
         JOIN Materiales m ON m.idMaterial = oc.Materiales_idMaterial
         JOIN Kits_has_Materiales km
              ON km.Kits_Instalacion_idKit = ? AND km.Materiales_idMaterial = oc.Materiales_idMaterial
         WHERE oc.Obras_has_Kits_idObraKit = ?`,
        [kit.IDOBRAKIT ?? kit.idObraKit, kit.IDOBRAKIT ?? kit.idObraKit]
    );

    return {
        ...kit,
        Materiales: items
    };
};

// ─── POST: asignar kit a obra + crear checklist ──────────────────────────────
// Si la obra ya tiene un kit asignado, se REEMPLAZA de forma transaccional:
// se eliminan el checklist y la asignación previa y se asigna el nuevo kit.
// Así el Detalle de Obra permite "editar/cambiar el kit" sin errores de
// duplicado (requisito de edición de kit en obra-detalle).
const asignarKit = async ({ idObra, idKit, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        // Reemplazo: quita el kit actual (checklist + asignación) si existe.
        const existing = await tx.query(
            "SELECT idObraKit FROM Obras_has_Kits WHERE Obras_idObra = ?",
            [idObra]
        );
        if (existing && existing.length > 0) {
            const idObraKitAnterior = existing[0]?.IDOBRAKIT ?? existing[0]?.idObraKit;
            await tx.execute(
                "DELETE FROM Obras_Kits_Checklist WHERE Obras_has_Kits_idObraKit = ?",
                [idObraKitAnterior]
            );
            await tx.execute(
                "DELETE FROM Obras_has_Kits WHERE idObraKit = ?",
                [idObraKitAnterior]
            );
        }

        const rows = await tx.executeReturning(
            `INSERT INTO Obras_has_Kits (Obras_idObra, Kits_Instalacion_idKit, Trabajadores_idTrabajador)
             VALUES (?, ?, ?)
             RETURNING idObraKit`,
            [idObra, idKit, idTrabajadorCtx]
        );

        const idObraKit = extractReturningValue(rows, 'IDOBRAKIT');

        const materiales = await tx.query(
            "SELECT Materiales_idMaterial FROM Kits_has_Materiales WHERE Kits_Instalacion_idKit = ?",
            [idKit]
        );

        if (materiales && materiales.length > 0) {
            for (const m of materiales) {
                await tx.execute(
                    `INSERT INTO Obras_Kits_Checklist (Obras_has_Kits_idObraKit, Materiales_idMaterial)
                     VALUES (?, ?)`,
                    [idObraKit, m.MATERIALES_IDMATERIAL ?? m.Materiales_idMaterial]
                );
            }
        }

        await tx.commit();
        return { idObraKit };
    } catch (err) {
        await tx.rollback();
        throw err;
    }
};

// ─── DELETE: quitar kit de obra (incluye checklist) ──────────────────────────
const quitarKit = async (idObra, idTrabajadorCtx = 1) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const rows = await tx.query(
            "SELECT idObraKit FROM Obras_has_Kits WHERE Obras_idObra = ?",
            [idObra]
        );

        if (!rows || rows.length === 0) {
            await tx.rollback();
            return null;
        }

        const idObraKit = rows[0].IDOBRAKIT;

        await tx.execute(
            "DELETE FROM Obras_Kits_Checklist WHERE Obras_has_Kits_idObraKit = ?",
            [idObraKit]
        );
        await tx.execute(
            "DELETE FROM Obras_has_Kits WHERE idObraKit = ?",
            [idObraKit]
        );

        await tx.commit();
        return true;
    } catch (err) {
        await tx.rollback();
        throw err;
    }
};

// ─── PATCH: marcar/desmarcar ítem del checklist (app móvil) ───────────────────
const marcarChecklist = async ({ idChecklistItem, idTrabajador = 1, marcado }) => {
    const db = await getConnection();
    const tx = await db.transactionWithUser(idTrabajador);

    try {
        await tx.execute(
            "EXECUTE PROCEDURE SP_MARCAR_CHECKLIST_KIT(?, ?, ?)",
            [idChecklistItem, idTrabajador, marcado ? 1 : 0]
        );
        await tx.commit();
        return true;
    } catch (err) {
        await tx.rollback();
        throw err;
    }
};

export default {
    getKitByObra,
    asignarKit,
    quitarKit,
    marcarChecklist
};
