import { getConnection } from "../config/db.js";

// Firebird 5 physical DB uses TIMESTAMP WITH TIME ZONE for FechaCompra /
// FechaCreacion. El driver node-firebird-driver espera un objeto ZonedDate
// { date, timeZone, offset } para ese tipo; nunca una cadena (rompe con
// "Cannot read properties of undefined (reading 'getUTCFullYear')").
const LOCAL_TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Mexico_City';

const pad = (n) => String(n).padStart(2, '0');

// Convierte "YYYY-MM-DD HH:MM[:SS]" (valor del datetime-local) en el objeto
// ZonedDate que el driver necesita para escribir un TIMESTAMP WITH TIME ZONE.
function toZonedDate(value) {
    if (value == null) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/.exec(String(value).trim());
    if (!m) return null;
    const [, y, mo, d, h, mi, s] = m;
    const date = new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s || 0)));
    return {
        date,
        timeZone: LOCAL_TIME_ZONE,
        offset: -new Date().getTimezoneOffset(),
    };
}

// Normaliza a cadena "YYYY-MM-DD HH:MM" el ZonedDate que devuelve el driver al
// leer un TIMESTAMP WITH TIME ZONE (y tolera cadenas planas existentes).
function normalizeDate(value) {
    if (value == null) return null;
    const d = (typeof value === 'object' && value.date) ? new Date(value.date) : new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

function normalizeCompraRow(row) {
    return {
        ...row,
        FechaCompra: normalizeDate(row.FECHACOMPRA ?? row.FechaCompra ?? null),
        FechaCreacion: normalizeDate(row.FECHACREACION ?? row.FechaCreacion ?? null),
    };
}

const getCompras = async (idTrabajadorCtx = 1) => {
    const db = await getConnection();

    const rows = await db.query(
        `SELECT c.*, t.NombreCompleto AS NombreTrabajador
         FROM Compras c
         JOIN Trabajadores t ON c.Trabajadores_idTrabajador = t.idTrabajador
         WHERE c.Activo = TRUE
         ORDER BY c.FechaCompra DESC`,
        []
    );

    return rows.map(normalizeCompraRow);
};

const getCompraById = async (id) => {
    const db = await getConnection();

    const compra = await db.query(
        `SELECT c.*, t.NombreCompleto AS NombreTrabajador
         FROM Compras c
         JOIN Trabajadores t ON c.Trabajadores_idTrabajador = t.idTrabajador
         WHERE c.idCompra = ? AND c.Activo = TRUE`,
        [id]
    );

    if (!compra || compra.length === 0) return null;

    const detalles = await db.query(
        `SELECT dc.*,
                m.Nombre AS NombreMaterial, m.UnidadMedida,
                p.Nombre AS NombreProveedor, p.Direccion AS DireccionProveedor,
                p.Telefono AS TelefonoProveedor
         FROM DetallesCompras dc
         JOIN Proveedores_has_Materiales phm
             ON phm.Proveedores_idProveedor = dc.Proveedores_has_Materiales_Proveedores_idProveedor
             AND phm.Materiales_idMaterial = dc.Proveedores_has_Materiales_Materiales_idMaterial
         JOIN Materiales m ON m.idMaterial = phm.Materiales_idMaterial
         JOIN Proveedores p ON p.idProveedor = phm.Proveedores_idProveedor
         WHERE dc.Compras_idCompra = ?`,
        [id]
    );

    return {
        ...normalizeCompraRow(compra[0]),
        Detalles: detalles
    };
};

// Extrae de forma segura el valor devuelto por una sentencia INSERT...RETURNING,
// independientemente de si el driver la entrega como valor escalar, objeto o array.
const extractReturningValue = (rows, alias) => {
    let raw = Array.isArray(rows) && rows.length > 0 ? rows[0] : rows;
    if (raw != null && typeof raw === 'object') {
        return raw[alias];
    }
    return raw;
};

const createCompra = async ({
    idTrabajador, FechaCompra, Notas, detalles, idTrabajadorCtx = 1
}) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const rows = await tx.executeReturning(
            `INSERT INTO Compras (Trabajadores_idTrabajador, FechaCompra, Notas)
             VALUES (?, COALESCE(CAST(? AS TIMESTAMP WITH TIME ZONE), CURRENT_TIMESTAMP), ?)
             RETURNING idCompra`,
            [idTrabajador ?? idTrabajadorCtx, toZonedDate(FechaCompra), Notas != null ? Buffer.from(String(Notas), "utf8") : null]
        );

        const nuevoId = await extractReturningValue(rows, 'IDCOMPRA');

        if (detalles && detalles.length > 0) {
            for (const d of detalles) {
                await tx.execute(
                    `INSERT INTO DetallesCompras
                     (Compras_idCompra, Proveedores_has_Materiales_Proveedores_idProveedor,
                      Cantidad, Medida, Proveedores_has_Materiales_Materiales_idMaterial)
                     VALUES (?, ?, ?, ?, ?)`,
                    [nuevoId, d.idProveedor, d.Cantidad, d.Medida ?? null, d.idMaterial]
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

const updateCompra = async ({
    id, idTrabajador, FechaCompra, Notas, detalles, idTrabajadorCtx = 1
}) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        const exists = await tx.query(
            "SELECT 1 AS X FROM Compras WHERE idCompra = ? AND Activo = TRUE",
            [id]
        );

        if (!exists || exists.length === 0) {
            await tx.rollback();
            return null;
        }

        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        await tx.execute(
            `UPDATE Compras
             SET Trabajadores_idTrabajador = ?,
                 FechaCompra = COALESCE(CAST(? AS TIMESTAMP WITH TIME ZONE), FechaCompra),
                 Notas = ?
             WHERE idCompra = ? AND Activo = TRUE`,
            [idTrabajador ?? idTrabajadorCtx, toZonedDate(FechaCompra), Notas != null ? Buffer.from(String(Notas), "utf8") : null, id]
        );

        // Reemplaza el conjunto de detalles (patrón idéntico a Proveedores/Kits).
        await tx.execute(
            "DELETE FROM DetallesCompras WHERE Compras_idCompra = ?",
            [id]
        );

        if (detalles && detalles.length > 0) {
            for (const d of detalles) {
                await tx.execute(
                    `INSERT INTO DetallesCompras
                     (Compras_idCompra, Proveedores_has_Materiales_Proveedores_idProveedor,
                      Cantidad, Medida, Proveedores_has_Materiales_Materiales_idMaterial)
                     VALUES (?, ?, ?, ?, ?)`,
                    [id, d.idProveedor, d.Cantidad, d.Medida ?? null, d.idMaterial]
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

const getCompraChofer = async (idCompra) => {
    const db = await getConnection();

    const compra = await db.query(
        `SELECT c.idCompra, c.FechaCompra, c.Notas, c.Recibida
         FROM Compras c
         WHERE c.idCompra = ? AND c.Activo = TRUE`,
        [idCompra]
    );

    if (!compra || compra.length === 0) return null;

    const detalles = await db.query(
        `SELECT dc.Cantidad, dc.Medida,
                p.Nombre AS NombreProveedor, p.Direccion AS DireccionProveedor, p.Telefono AS TelefonoProveedor,
                m.Nombre AS NombreMaterial, m.UnidadMedida
         FROM DetallesCompras dc
         JOIN Proveedores_has_Materiales ph
             ON ph.Proveedores_idProveedor = dc.Proveedores_has_Materiales_Proveedores_idProveedor
             AND ph.Materiales_idMaterial = dc.Proveedores_has_Materiales_Materiales_idMaterial
         JOIN Materiales m ON m.idMaterial = ph.Materiales_idMaterial
         JOIN Proveedores p ON p.idProveedor = ph.Proveedores_idProveedor
         WHERE dc.Compras_idCompra = ?`,
        [idCompra]
    );

    return {
        idCompra: compra[0].IDCOMPRA,
        FechaCompra: normalizeDate(compra[0].FECHACOMPRA ?? compra[0].FechaCompra ?? null),
        Notas: compra[0].NOTAS,
        Recibida: compra[0].RECIBIDA,
        Proveedores: detalles.map(d => ({
            NombreProveedor: d.NOMBREPROVEEDOR,
            DireccionProveedor: d.DIRECCIONPROVEDOR,
            TelefonoProveedor: d.TELEFONOPROVEEDOR,
            Materiales: [{
                NombreMaterial: d.NOMBREMATERIAL,
                UnidadMedida: d.UNIDADMEDIDA,
                Cantidad: d.CANTIDAD,
                Medida: d.MEDIDA
            }]
        }))
    };
};

const marcarRecibida = async (idCompra, idTrabajador, rol) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        const rows = await tx.query(
            `SELECT c.Trabajadores_idTrabajador, c.Recibida
             FROM Compras c
             WHERE c.idCompra = ? AND c.Activo = TRUE`,
            [idCompra]
        );

        if (!rows || rows.length === 0) {
            await tx.rollback();
            return { error: 'not_found' };
        }

        const compra = rows[0];

        if (rol !== 'Propietario' && compra.TRABAJADORES_IDTRABAJADOR !== Number(idTrabajador)) {
            await tx.rollback();
            return { error: 'forbidden' };
        }

        if (compra.RECIBIDA) {
            await tx.rollback();
            return { error: 'already' };
        }

        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajador ?? 1)]
        );

        await tx.execute(
            "UPDATE Compras SET Recibida = TRUE WHERE idCompra = ?",
            [idCompra]
        );

        await tx.commit();
    } catch (err) {
        await tx.rollback();
        throw err;
    }

    return { ok: true };
};

const deleteCompra = async (id, idTrabajadorCtx = 1) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        await tx.execute(
            "UPDATE Compras SET Activo = FALSE WHERE idCompra = ?",
            [id]
        );

        await tx.commit();
    } catch (err) {
        await tx.rollback();
        throw err;
    }

    return true;
};

const esChoferAsignado = async (idCompra, idTrabajador) => {
    const db = await getConnection();

    const rows = await db.query(
        `SELECT 1 FROM Compras
         WHERE idCompra = ? AND Trabajadores_idTrabajador = ? AND Activo = TRUE`,
        [idCompra, idTrabajador]
    );

    return rows && rows.length > 0;
};

export default {
    getCompras,
    getCompraById,
    createCompra,
    updateCompra,
    getCompraChofer,
    esChoferAsignado,
    marcarRecibida,
    deleteCompra
};