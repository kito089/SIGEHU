import { getConnection } from "../config/db.js";

// ─── CREATE: asignar material a obra ─────────────────────────────────────────
// Valida que la obra y el material existan y estén activos (defensa en profundidad).
const asignarMaterial = async ({ idObra, idMaterial, cantidad, medida, notas }) => {
    const db = await getConnection();

    const obra = await db.query(
        "SELECT 1 FROM Obras WHERE idObra = ? AND Activo = TRUE",
        [idObra]
    );
    if (!obra || obra.length === 0) {
        const err = new Error("La obra no existe o está inactiva");
        err.status = 400;
        throw err;
    }

    const material = await db.query(
        "SELECT 1 FROM Materiales WHERE idMaterial = ? AND Activo = TRUE",
        [idMaterial]
    );
    if (!material || material.length === 0) {
        const err = new Error("El material no existe o está inactivo");
        err.status = 400;
        throw err;
    }

    const notasBuffer = notas != null ? Buffer.from(String(notas), "utf8") : null;

    await db.execute(
        `INSERT INTO Obras_has_Materiales (Obras_idObra, Materiales_idMaterial, Cantidad, Medida, Notas)
         VALUES (?, ?, ?, ?, ?)`,
        [idObra, idMaterial, cantidad ?? null, medida ?? null, notasBuffer]
    );

    return true;
};

// ─── GET materiales de una obra ──────────────────────────────────────────────
const getMaterialesByObra = async (idObra) => {
    const db = await getConnection();

    return await db.query(
        `SELECT om.*, m.Nombre, m.UnidadMedida
         FROM Obras_has_Materiales om
         JOIN Materiales m ON m.idMaterial = om.Materiales_idMaterial
         WHERE om.Obras_idObra = ?`,
        [idObra]
    );
};

// ─── GET una asignación específica ───────────────────────────────────────────
const getAsignacion = async (idObra, idMaterial) => {
    const db = await getConnection();

    const rows = await db.query(
        "SELECT * FROM Obras_has_Materiales WHERE Obras_idObra = ? AND Materiales_idMaterial = ?",
        [idObra, idMaterial]
    );

    return rows[0] ?? null;
};

// ─── UPDATE: editar cantidad/medida/notas ────────────────────────────────────
const actualizarAsignacion = async (idObra, idMaterial, { cantidad, medida, notas }) => {
    const db = await getConnection();

    const existe = await getAsignacion(idObra, idMaterial);
    if (!existe) return null;

    await db.execute(
        `UPDATE Obras_has_Materiales
         SET Cantidad = ?, Medida = ?, Notas = ?
         WHERE Obras_idObra = ? AND Materiales_idMaterial = ?`,
        [cantidad ?? null, medida ?? null, notas ?? null, idObra, idMaterial]
    );

    return true;
};

// ─── DELETE: quitar material de la obra (hard, sin Activo) ──────────────────
const quitarMaterial = async (idObra, idMaterial) => {
    const db = await getConnection();

    const existe = await getAsignacion(idObra, idMaterial);
    if (!existe) return null;

    await db.execute(
        "DELETE FROM Obras_has_Materiales WHERE Obras_idObra = ? AND Materiales_idMaterial = ?",
        [idObra, idMaterial]
    );

    return true;
};

// ─── BATCH: aplicar lote de materiales a la obra ─────────────────────────────
// El Detalle de Obra mantiene materiales pendientes (agregar/editar/quitar) en
// memoria hasta que el Propietario pulsa "Guardar". Este endpoint aplica todo
// el lote en una sola transacción:
//   agregar:   [{ idMaterial, cantidad, medida, notas }]  → inserta (omite duplicados)
//   actualizar:[{ idMaterial, cantidad, medida, notas }]  → edita cantidad/medida/notas
//   quitar:    [idMaterial, ...]                          → elimina
// Notas es BLOB SUB_TYPE TEXT: el driver exige Buffer, no string.
const aplicarBatchMateriales = async ({ idObra, agregar, actualizar, quitar, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const resultados = { agregados: 0, actualizados: 0, eliminados: 0, omitidos: 0 };

        for (const m of agregar ?? []) {
            if (!m?.idMaterial) continue;
            const existe = await tx.query(
                "SELECT 1 FROM Obras_has_Materiales WHERE Obras_idObra = ? AND Materiales_idMaterial = ?",
                [idObra, m.idMaterial]
            );
            if (existe && existe.length > 0) {
                resultados.omitidos += 1;
                continue;
            }
            const notasBuffer = m.notas != null ? Buffer.from(String(m.notas), "utf8") : null;
            await tx.execute(
                `INSERT INTO Obras_has_Materiales (Obras_idObra, Materiales_idMaterial, Cantidad, Medida, Notas)
                 VALUES (?, ?, ?, ?, ?)`,
                [idObra, m.idMaterial, m.cantidad ?? null, m.medida ?? null, notasBuffer]
            );
            resultados.agregados += 1;
        }

        for (const m of actualizar ?? []) {
            if (!m?.idMaterial) continue;
            const notasBuffer = m.notas != null ? Buffer.from(String(m.notas), "utf8") : null;
            await tx.execute(
                `UPDATE Obras_has_Materiales
                 SET Cantidad = ?, Medida = ?, Notas = ?
                 WHERE Obras_idObra = ? AND Materiales_idMaterial = ?`,
                [m.cantidad ?? null, m.medida ?? null, notasBuffer, idObra, m.idMaterial]
            );
            resultados.actualizados += 1;
        }

        for (const idMaterial of quitar ?? []) {
            if (idMaterial == null) continue;
            await tx.execute(
                "DELETE FROM Obras_has_Materiales WHERE Obras_idObra = ? AND Materiales_idMaterial = ?",
                [idObra, idMaterial]
            );
            resultados.eliminados += 1;
        }

        await tx.commit();
        return resultados;
    } catch (err) {
        await tx.rollback();
        throw err;
    }
};

export default {
    asignarMaterial,
    getMaterialesByObra,
    getAsignacion,
    actualizarAsignacion,
    quitarMaterial,
    aplicarBatchMateriales
};