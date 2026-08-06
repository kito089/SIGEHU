import { getConnection } from "../config/db.js";
import audit from "./Auditoria.service.js";
import materiales from "./Materiales.service.js";

// ─── GET todos los Proveedores ───────────────────────────────────────────────
const getProveedores = async (search = null) => {
    const db = await getConnection();

    let sql = 'SELECT * FROM Proveedores';
    const params = [];

    if (search && search.trim() !== '') {
        sql += ' WHERE UPPER(Nombre) LIKE ?';
        params.push(`%${search.trim().toUpperCase()}%`);
    }

    sql += ' ORDER BY Nombre';

    const proveedores = await db.query(sql, params);

    const proveedoresConMateriales = await Promise.all(
        proveedores.map(async (proveedor) => {
            const materiales = await db.query(
                `SELECT m.*, pm.PRECIOUNITARIO AS PRECIO, pm.NOTAS AS NOTASPROVEEDOR
                FROM Materiales m
                JOIN Proveedores_has_Materiales pm ON pm.Materiales_idMaterial = m.idMaterial
                WHERE pm.Proveedores_idProveedor = ?`,
                [proveedor.IDPROVEEDOR]
            );

            return {
                ...proveedor,
                MATERIALES: materiales
            };
        })
    );

    return proveedoresConMateriales;
};

// ─── GET Proveedor por ID ────────────────────────────────────────────────────
// Pasar el objeto filtrado por id desde el front (getProveedores ya retorna toda la info necesaria)

// ─── INSERT ───────────────────────────────────────────────────────────────────
const createProveedor = async ({ Nombre, Direccion, Telefono, Correo, GiroPrincipal, ContactoCompras, Notas, materiales }) => {
    const db = await getConnection();

    const dirBuffer = Direccion != null ? Buffer.from(String(Direccion), "utf8") : null;
    const notasBuffer = Notas != null ? Buffer.from(String(Notas), "utf8") : null;

    // ── Transacción 1: insertar Proveedor ──────────────────────────────────
    const txInsert = await db.transaction();

    let nuevoId;
    try {
        await txInsert.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        const rows = await txInsert.query(
            `SELECT * FROM SP_INSERTAR_PROVEEDOR (?, ?, ?, ?, ?, ?, ?)`,
            [Nombre, dirBuffer, Telefono ?? null, Correo ?? null, GiroPrincipal ?? null, ContactoCompras ?? null, notasBuffer]
        );
        nuevoId = rows[0].OIDPROVEEDOR;
        await txInsert.commit();
    } catch (err) {
        await txInsert.rollback();
        throw err;
    }

    // ── Vinculación de materiales (secuencial, un SP por material) ─────────
    if (materiales && materiales.length > 0) {
        for (const m of materiales) {
            await vincularMaterial(nuevoId, m.idMaterial, m.precio, m.notas);
        }
    }

    return nuevoId;
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
const updateProveedor = async (id, { Nombre, Direccion, Telefono, Correo, GiroPrincipal, ContactoCompras, Notas, materiales, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();

    // ── 1. Leer el registro actual ANTES de modificar ───────────────────────
    const txRead = await db.transaction();
    let anterior;

    try {
        const rows = await txRead.query(
            `SELECT Nombre, Direccion, Telefono, Correo, GiroPrincipal, ContactoCompras, Notas
             FROM Proveedores WHERE IdProveedor = ?`,
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

    const dirBuffer = Direccion != null ? Buffer.from(String(Direccion), "utf8") : null;
    const notasBuffer = Notas != null ? Buffer.from(String(Notas), "utf8") : null;
    let idAudit = null;

    try {
        await txUpdate.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );
        await txUpdate.procedure(
            `EXECUTE PROCEDURE SP_ACTUALIZAR_PROVEEDOR (?, ?, ?, ?, ?, ?, ?, ?)`,
            [id, Nombre, dirBuffer, Telefono ?? null, Correo ?? null, GiroPrincipal ?? null, ContactoCompras ?? null, notasBuffer]
        );

        // Recupera el idAuditoria del UPDATE de cabecera ANTES de tocar los
        // materiales, porque sus triggers reutilizan LAST_AUDIT_ID.
        const auditRows = await txUpdate.query(`
            SELECT RDB$GET_CONTEXT('USER_SESSION', 'LAST_AUDIT_ID') AS ID
            FROM RDB$DATABASE
        `);
        idAudit = auditRows?.[0]?.ID ?? null;

        await txUpdate.commit();

    } catch (err) {
        await txUpdate.rollback();
        throw err;
    }

    // ── 2. Sincronizar materiales del proveedor (diferencial) ───────────────
    // Solo se tocan las filas que realmente cambiaron; las que no cambian no
    // se borran ni se vuelven a insertar, evitando auditorías masivas.
    if (materiales !== undefined && materiales !== null) {
        const db2 = await getConnection();
        const txMaterials = await db2.transaction();
        try {
            await txMaterials.execute(
                "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
                [String(idTrabajadorCtx ?? 1)]
            );

            // Desactiva la auditoría independiente de la tabla puente mientras se
            // sincronizan los materiales; los cambios se registrarán como
            // AuditoriasDetalles de la propia entidad Proveedores.
            await txMaterials.execute(
                "SELECT RDB$SET_CONTEXT('USER_SESSION', 'SUPRIMIR_AUDITORIA_PUENTE', '1') FROM RDB$DATABASE"
            );

            const existentes = await txMaterials.query(
                `SELECT Materiales_idMaterial, PrecioUnitario, Notas
                 FROM Proveedores_has_Materiales WHERE Proveedores_idProveedor = ?`,
                [id]
            );
            const porMaterial = new Map();
            for (const e of existentes ?? []) {
                const k = String(e.MATERIALES_IDMATERIAL ?? e.Materiales_idMaterial ?? '');
                porMaterial.set(k, e);
            }

            const consumidos = new Set();
            const entrantes = Array.isArray(materiales) ? materiales : [];
            const vinculados = [];
            const modificados = [];
            const desvinculados = [];

            for (const m of entrantes) {
                const key = String(m.idMaterial ?? '');
                const existente = porMaterial.get(key);
                if (!existente) {
                    // Material nuevo: vincular (INSERT).
                    await txMaterials.procedure(
                        "EXECUTE PROCEDURE SP_VINCULAR_MATERIAL_PROVEEDOR (?, ?, ?, ?)",
                        [id, m.idMaterial, m.precio ?? null, m.notas != null ? Buffer.from(String(m.notas), "utf8") : null]
                    );
                    consumidos.add(key);
                    vinculados.push(m);
                    continue;
                }

                consumidos.add(key);

                const precioIgual = Number(existente.PRECIOUNITARIO ?? 0) === Number(m.precio ?? 0);
                const notasExistentes = existente.NOTAS != null && !Buffer.isBuffer(existente.NOTAS)
                    ? String(existente.NOTAS)
                    : (Buffer.isBuffer(existente.NOTAS) ? existente.NOTAS.toString("utf8") : '');
                const notasIgual = notasExistentes === String(m.notas ?? '');

                if (!precioIgual || !notasIgual) {
                    // Solo se actualiza si efectivamente cambió.
                    await txMaterials.procedure(
                        "EXECUTE PROCEDURE SP_VINCULAR_MATERIAL_PROVEEDOR (?, ?, ?, ?)",
                        [id, m.idMaterial, m.precio ?? null, m.notas != null ? Buffer.from(String(m.notas), "utf8") : null]
                    );
                    modificados.push({ idMaterial: m.idMaterial, precioAnterior: existente.PRECIOUNITARIO ?? 0, precioNuevo: m.precio ?? 0, notasAnterior: notasExistentes, notasNuevo: m.notas ?? '' });
                }
            }

            // Elimina los materiales que ya no están en la lista.
            for (const e of existentes ?? []) {
                const key = String(e.MATERIALES_IDMATERIAL ?? e.Materiales_idMaterial ?? '');
                if (!consumidos.has(key)) {
                    await txMaterials.execute(
                        "DELETE FROM Proveedores_has_Materiales WHERE Proveedores_idProveedor = ? AND Materiales_idMaterial = ?",
                        [id, Number(key)]
                    );
                    desvinculados.push({ idMaterial: Number(key), precio: e.PRECIOUNITARIO ?? 0, notas: e.NOTAS });
                }
            }

            // Reactiva la auditoría independiente para el resto de operaciones.
            await txMaterials.execute(
                "SELECT RDB$SET_CONTEXT('USER_SESSION', 'SUPRIMIR_AUDITORIA_PUENTE', '') FROM RDB$DATABASE"
            );

            await txMaterials.commit();

            if (idAudit) {
                for (const m of vinculados ?? []) {
                    await audit.createAuditoriaDetalle({
                        pIdAuditoria: idAudit,
                        pCampo: 'Material vinculado',
                        pValorAnterior: '',
                        pValorNuevo: `Material ${m.idMaterial} | Precio ${String(m.precio ?? '')}`
                    });
                }
                for (const m of modificados ?? []) {
                    if (String(m.precioAnterior ?? '') !== String(m.precioNuevo ?? '')) {
                        await audit.createAuditoriaDetalle({
                            pIdAuditoria: idAudit,
                            pCampo: 'Precio',
                            pValorAnterior: `Material ${m.idMaterial} (${m.precioAnterior})`,
                            pValorNuevo: `Material ${m.idMaterial} (${m.precioNuevo})`
                        });
                    }
                    if (String(m.notasAnterior ?? '') !== String(m.notasNuevo ?? '')) {
                        await audit.createAuditoriaDetalle({
                            pIdAuditoria: idAudit,
                            pCampo: 'Notas material',
                            pValorAnterior: `Material ${m.idMaterial} (${m.notasAnterior})`,
                            pValorNuevo: `Material ${m.idMaterial} (${m.notasNuevo})`
                        });
                    }
                }
                for (const m of desvinculados ?? []) {
                    await audit.createAuditoriaDetalle({
                        pIdAuditoria: idAudit,
                        pCampo: 'Material desvinculado',
                        pValorAnterior: `Material ${m.idMaterial} | Precio ${String(m.precio ?? '')}`,
                        pValorNuevo: ''
                    });
                }
            }
        } catch (err) {
            await txMaterials.rollback();
            throw err;
        }
    }

    const comparacion = [
        { campo: 'Nombre',          anterior: anterior.NOMBRE,          nuevo: Nombre },
        { campo: 'Direccion',       anterior: anterior.DIRECCION,       nuevo: Direccion ?? null },
        { campo: 'Telefono',        anterior: anterior.TELEFONO,        nuevo: Telefono ?? null },
        { campo: 'Correo',          anterior: anterior.CORREO,          nuevo: Correo ?? null },
        { campo: 'GiroPrincipal',   anterior: anterior.GIROPRINCIPAL,   nuevo: GiroPrincipal ?? null },
        { campo: 'ContactoCompras', anterior: anterior.CONTACTOCOMPRAS, nuevo: ContactoCompras ?? null },
        { campo: 'Notas',           anterior: anterior.NOTAS,           nuevo: Notas ?? null },
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
};

// ─── DELETE (soft) ────────────────────────────────────────────────────────────
const deleteProveedor = async (id) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await transaction.execute(
            "UPDATE Proveedores SET Activo = FALSE WHERE IdProveedor = ?",
            [id]
        );

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return true;
};

// ─── INSERT (Material a Proveedor) ────────────────────────────────────────────────────────────
const vincularMaterial = async (idProveedor, idMaterial, precio, notas) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await transaction.procedure(
            "EXECUTE PROCEDURE SP_VINCULAR_MATERIAL_PROVEEDOR (?, ?, ?, ?)",
            [idProveedor, idMaterial, precio ?? null, notas != null ? Buffer.from(String(notas), "utf8") : null]
        );

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return true;
};

// ─── UPDATE (Material a Proveedor) ────────────────────────────────────────────────────────────
const updateMaterial = async (idProveedor, idMaterial, { precio, notas }) => {
    const db = await getConnection();

    // ── 1. Leer el registro actual ANTES de modificar ───────────────────────
    const txRead = await db.transaction();
    let anterior;

    try {
        const rows = await txRead.query(
            `SELECT PrecioUnitario, Notas
             FROM Proveedores_has_Materiales 
             WHERE Proveedores_idProveedor = ? AND Materiales_idMaterial = ?`,
            [idProveedor, idMaterial]
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
            `UPDATE Proveedores_has_Materiales
             SET PrecioUnitario = ?, Notas = ?
             WHERE Proveedores_idProveedor = ? AND Materiales_idMaterial = ?`,
            [precio ?? null, notas != null ? Buffer.from(String(notas), "utf8") : null, idProveedor, idMaterial]
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
        { campo: 'Precio', anterior: anterior.PRECIOUNITARIO, nuevo: precio ?? null },
        { campo: 'Notas',  anterior: anterior.NOTAS,  nuevo: notas ?? null },
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

// ─── DELETE (Material a Proveedor) ────────────────────────────────────────────────────────────
const desvincularMaterial = async (idProveedor, idMaterial) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            ["1"]
        );
        await transaction.procedure(
            "EXECUTE PROCEDURE SP_DESVINCULAR_MATERIAL_PROVEEDOR (?, ?)",
            [idProveedor, idMaterial]
        );

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return true;
};

export default {
    getProveedores,
    createProveedor,
    updateProveedor,
    deleteProveedor,
    vincularMaterial,
    updateMaterial,
    desvincularMaterial
};