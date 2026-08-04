import { getConnection } from "../config/db.js";

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
            (SELECT COUNT(*) FROM Kits_has_Materiales km WHERE km.Kits_Instalacion_idKit = k.idKit) AS TotalMateriales
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

        const descBuffer = Descripcion != null ? Buffer.from(String(Descripcion), "utf8") : null;
        await tx.execute(
            `UPDATE Kits_Instalacion
             SET Nombre = ?, Descripcion = ?
             WHERE idKit = ?`,
            [Nombre, descBuffer, id]
        );

        if (materiales !== undefined) {
            await tx.execute(
                "DELETE FROM Kits_has_Materiales WHERE Kits_Instalacion_idKit = ?",
                [id]
            );

            if (materiales && materiales.length > 0) {
                for (const m of materiales) {
                    const notasBuffer = m.Notas != null ? Buffer.from(String(m.Notas), "utf8") : null;
                    await tx.execute(
                        `INSERT INTO Kits_has_Materiales
                         (Kits_Instalacion_idKit, Materiales_idMaterial, Cantidad, Notas)
                         VALUES (?, ?, ?, ?)`,
                        [id, m.idMaterial, m.Cantidad ?? null, notasBuffer]
                    );
                }
            }
        }

        await tx.commit();
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