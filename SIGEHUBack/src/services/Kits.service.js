import { getConnection } from "../config/db.js";
import audit from "./Auditoria.service.js";

// Extrae de forma segura el valor devuelto por una sentencia INSERT...RETURNING,
// independientemente de si el driver la entrega como valor escalar, objeto o array.
const extractReturningValue = (rows, alias) => {
    let raw = Array.isArray(rows) && rows.length > 0 ? rows[0] : rows;
    if (raw != null && typeof raw === 'object') {
        return raw[alias];
    }
    return raw;
};

const getKits = async () => {
    const db = await getConnection();
    return await db.query(
        `SELECT k.*,
            (SELECT COUNT(*) FROM Kits_has_Materiales km WHERE km.Kits_Instalacion_idKit = k.idKit) AS TotalMateriales,
            (SELECT COALESCE(SUM(km.Cantidad), 0) FROM Kits_has_Materiales km WHERE km.Kits_Instalacion_idKit = k.idKit) AS TotalUnidades
         FROM Kits_Instalacion k
         WHERE k.Activo = TRUE`,
        []
    );
};

const getKitById = async (id) => {
    const db = await getConnection();

    const kit = await db.query(
        "SELECT * FROM Kits_Instalacion WHERE idKit = ?",
        [id]
    );

    if (!kit || kit.length === 0) return null;

    const materiales = await db.query(
        `SELECT m.idMaterial, m.Nombre, m.UnidadMedida, m.Descripcion, m.Activo,
                kh.Cantidad, kh.Notas AS NotasKit
         FROM Kits_has_Materiales kh
         JOIN Materiales m ON m.idMaterial = kh.Materiales_idMaterial
         WHERE kh.Kits_Instalacion_idKit = ?`,
        [id]
    );

    return {
        ...kit[0],
        Materiales: materiales
    };
};

const createKit = async ({ Nombre, Descripcion, materiales, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const descBuffer = Descripcion != null ? Buffer.from(String(Descripcion), "utf8") : null;
        const rows = await tx.executeReturning(
            `INSERT INTO Kits_Instalacion (Nombre, Descripcion)
             VALUES (?, ?)
             RETURNING idKit`,
            [Nombre, descBuffer]
        );

        const nuevoId = await extractReturningValue(rows, 'IDKIT');

        if (materiales && materiales.length > 0) {
            for (const m of materiales) {
                const notasBuffer = m.Notas != null ? Buffer.from(String(m.Notas), "utf8") : null;
                await tx.execute(
                    `INSERT INTO Kits_has_Materiales
                     (Kits_Instalacion_idKit, Materiales_idMaterial, Cantidad, Notas)
                     VALUES (?, ?, ?, ?)`,
                    [nuevoId, m.idMaterial, m.Cantidad ?? null, notasBuffer]
                );
            }
        }

        await tx.commit();
    } catch (err) {
        await tx.rollback();
        throw err;
    }

    return true;
};

const updateKit = async (id, { Nombre, Descripcion, materiales, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();

    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        // Lee el estado previo de la cabecera y los materiales para comparar.
        const existe = await tx.query(
            "SELECT 1 AS X FROM Kits_Instalacion WHERE idKit = ? AND Activo = TRUE",
            [id]
        );
        if (!existe || existe.length === 0) {
            await tx.rollback();
            return null;
        }

        const anteriorRows = await tx.query(
            `SELECT Nombre, Descripcion FROM Kits_Instalacion WHERE idKit = ?`,
            [id]
        );
        const anterior = anteriorRows?.[0] ?? {};

        const materialesAnt = await tx.query(
            `SELECT Materiales_idMaterial, Cantidad, Notas
             FROM Kits_has_Materiales WHERE Kits_Instalacion_idKit = ?`,
            [id]
        );

        const descBuffer = Descripcion != null ? Buffer.from(String(Descripcion), "utf8") : null;
        await tx.execute(
            `UPDATE Kits_Instalacion
             SET Nombre = ?, Descripcion = ?
             WHERE idKit = ?`,
            [Nombre, descBuffer, id]
        );

        // Recupera el idAuditoria del UPDATE de cabecera antes de tocar los
        // materiales; Kits_has_Materiales no genera auditorías independientes.
        const auditRows = await tx.query(`
            SELECT RDB$GET_CONTEXT('USER_SESSION', 'LAST_AUDIT_ID') AS ID
            FROM RDB$DATABASE
        `);
        const idAudit = auditRows?.[0]?.ID ?? null;

        // Sincronización diferencial de materiales: solo cambia lo necesario.
        const porAnt = new Map();
        for (const m of materialesAnt ?? []) {
            porAnt.set(String(m.MATERIALES_IDMATERIAL ?? m.Materiales_idMaterial ?? ''), m);
        }

        const consumidos = new Set();
        const agregados = [];
        const cambiados = [];
        const eliminados = [];

        if (materiales !== undefined) {
        for (const m of materiales ?? []) {
            const key = String(m.idMaterial ?? '');
            const existente = porAnt.get(key);
            if (!existente) {
                const notasBuffer = m.Notas != null ? Buffer.from(String(m.Notas), "utf8") : null;
                await tx.execute(
                    `INSERT INTO Kits_has_Materiales
                     (Kits_Instalacion_idKit, Materiales_idMaterial, Cantidad, Notas)
                     VALUES (?, ?, ?, ?)`,
                    [id, m.idMaterial, m.Cantidad ?? null, notasBuffer]
                );
                consumidos.add(key);
                agregados.push({ idMaterial: m.idMaterial, cantidad: m.Cantidad ?? 0 });
                continue;
            }

            consumidos.add(key);

            const mismaCantidad = Number(existente.CANTIDAD ?? existente.Cantidad ?? 0) === Number(m.Cantidad ?? 0);
            const notasAnt = existente.NOTAS != null
                ? (Buffer.isBuffer(existente.NOTAS) ? existente.NOTAS.toString("utf8") : String(existente.NOTAS))
                : '';
            const notasNueva = m.Notas != null ? String(m.Notas) : '';
            const mismasNotas = notasAnt === notasNueva;

            if (!mismaCantidad || !mismasNotas) {
                const notasBuffer = m.Notas != null ? Buffer.from(String(m.Notas), "utf8") : null;
                await tx.execute(
                    `UPDATE Kits_has_Materiales
                     SET Cantidad = ?, Notas = ?
                     WHERE Kits_Instalacion_idKit = ? AND Materiales_idMaterial = ?`,
                    [m.Cantidad ?? null, notasBuffer, id, m.idMaterial]
                );
                cambiados.push({ idMaterial: m.idMaterial, cantidadAnterior: existente.CANTIDAD ?? 0, cantidadNueva: m.Cantidad ?? 0, notasAnterior: notasAnt, notasNueva });
            }
        }

        for (const m of materialesAnt ?? []) {
            const key = String(m.MATERIALES_IDMATERIAL ?? m.Materiales_idMaterial ?? '');
            if (!consumidos.has(key)) {
                await tx.execute(
                    "DELETE FROM Kits_has_Materiales WHERE Kits_Instalacion_idKit = ? AND Materiales_idMaterial = ?",
                    [id, Number(key)]
                );
                eliminados.push({ idMaterial: Number(key), cantidad: m.CANTIDAD ?? 0 });
            }
        }
        }

        await tx.commit();

        if (idAudit) {
            const nombreAnt = anterior.NOMBRE ?? '';
            const descAnt = anterior.DESCRIPCION != null
                ? (Buffer.isBuffer(anterior.DESCRIPCION) ? anterior.DESCRIPCION.toString("utf8") : String(anterior.DESCRIPCION))
                : '';
            const descNueva = Descripcion != null ? String(Descripcion) : '';

            const comparacion = [
                { campo: 'Nombre', anterior: nombreAnt, nuevo: Nombre ?? '' },
                { campo: 'Descripcion', anterior: descAnt, nuevo: descNueva }
            ];

            for (const { campo, anterior: ant, nuevo } of comparacion) {
                if (String(ant ?? '') !== String(nuevo ?? '')) {
                    await audit.createAuditoriaDetalle({
                        pIdAuditoria: idAudit,
                        pCampo: campo,
                        pValorAnterior: String(ant ?? ''),
                        pValorNuevo: String(nuevo ?? '')
                    });
                }
            }

            for (const m of agregados) {
                await audit.createAuditoriaDetalle({
                    pIdAuditoria: idAudit,
                    pCampo: 'Material agregado',
                    pValorAnterior: '',
                    pValorNuevo: `Material ${m.idMaterial} | Cantidad ${String(m.cantidad ?? '')}`
                });
            }

            for (const m of cambiados) {
                if (String(m.cantidadAnterior ?? '') !== String(m.cantidadNueva ?? '')) {
                    await audit.createAuditoriaDetalle({
                        pIdAuditoria: idAudit,
                        pCampo: 'Cantidad',
                        pValorAnterior: `Material ${m.idMaterial} (${m.cantidadAnterior})`,
                        pValorNuevo: `Material ${m.idMaterial} (${m.cantidadNueva})`
                    });
                }
                if (String(m.notasAnterior ?? '') !== String(m.notasNueva ?? '')) {
                    await audit.createAuditoriaDetalle({
                        pIdAuditoria: idAudit,
                        pCampo: 'Notas material',
                        pValorAnterior: `Material ${m.idMaterial} (${m.notasAnterior})`,
                        pValorNuevo: `Material ${m.idMaterial} (${m.notasNueva})`
                    });
                }
            }

            for (const m of eliminados) {
                await audit.createAuditoriaDetalle({
                    pIdAuditoria: idAudit,
                    pCampo: 'Material eliminado',
                    pValorAnterior: `Material ${m.idMaterial} | Cantidad ${String(m.cantidad ?? '')}`,
                    pValorNuevo: ''
                });
            }
        }
    } catch (err) {
        await tx.rollback();
        throw err;
    }

    return true;
};

const deleteKit = async (id, idTrabajadorCtx = 1) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        await tx.execute(
            "DELETE FROM Kits_has_Materiales WHERE Kits_Instalacion_idKit = ?",
            [id]
        );

        await tx.execute(
            "DELETE FROM Kits_Instalacion WHERE idKit = ?",
            [id]
        );

        await tx.commit();
    } catch (err) {
        await tx.rollback();
        throw err;
    }

    return true;
};

// ─── Añade o actualiza un material dentro de un kit (relación individual) ───
const addMaterialToKit = async (idKit, { idMaterial, Cantidad, Notas, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );
        const notasBuffer = Notas != null ? Buffer.from(String(Notas), "utf8") : null;
        await tx.execute(
            `MERGE INTO Kits_has_Materiales T
             USING (SELECT CAST(? AS INTEGER) AS K, CAST(? AS INTEGER) AS M FROM RDB$DATABASE) S
                ON (T.Kits_Instalacion_idKit = S.K AND T.Materiales_idMaterial = S.M)
             WHEN MATCHED THEN UPDATE SET Cantidad = ?, Notas = ?
             WHEN NOT MATCHED THEN INSERT
                (Kits_Instalacion_idKit, Materiales_idMaterial, Cantidad, Notas)
                VALUES (S.K, S.M, ?, ?)`,
            [idKit, idMaterial, Cantidad ?? null, notasBuffer, Cantidad ?? null, notasBuffer]
        );

        await tx.commit();
    } catch (err) {
        await tx.rollback();
        throw err;
    }

    return true;
};

// ─── Actualiza un material dentro de un kit ──────────────────────────────────
const updateMaterialInKit = async (idKit, idMaterial, { Cantidad, Notas, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );
        const notasBuffer = Notas != null ? Buffer.from(String(Notas), "utf8") : null;
        await tx.execute(
            `UPDATE Kits_has_Materiales
             SET Cantidad = ?, Notas = ?
             WHERE Kits_Instalacion_idKit = ? AND Materiales_idMaterial = ?`,
            [Cantidad ?? null, notasBuffer, idKit, idMaterial]
        );

        await tx.commit();
    } catch (err) {
        await tx.rollback();
        throw err;
    }

    return true;
};

// ─── Desvincula un material de un kit ────────────────────────────────────────
const removeMaterialFromKit = async (idKit, idMaterial, idTrabajadorCtx = 1) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );
        await tx.execute(
            "DELETE FROM Kits_has_Materiales WHERE Kits_Instalacion_idKit = ? AND Materiales_idMaterial = ?",
            [idKit, idMaterial]
        );

        await tx.commit();
    } catch (err) {
        await tx.rollback();
        throw err;
    }

    return true;
};

export default {
    getKits,
    getKitById,
    createKit,
    updateKit,
    deleteKit,
    addMaterialToKit,
    updateMaterialInKit,
    removeMaterialFromKit
};