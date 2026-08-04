import { getConnection } from "../config/db.js";

const getCompras = async (idTrabajadorCtx = 1) => {
    const db = await getConnection();

    return await db.query(
        `SELECT c.*, t.NombreCompleto AS NombreTrabajador
         FROM Compras c
         JOIN Trabajadores t ON c.Trabajadores_idTrabajador = t.idTrabajador
         WHERE c.Activo = TRUE
         ORDER BY c.FechaCompra DESC`,
        []
    );
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
        ...compra[0],
        Detalles: detalles
    };
};

const createCompra = async ({
    idTrabajador, Notas, detalles, idTrabajadorCtx = 1
}) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const rows = await tx.query(
            `INSERT INTO Compras (Trabajadores_idTrabajador, Notas)
             VALUES (?, ?)
             RETURNING idCompra`,
            [idTrabajador ?? idTrabajadorCtx, Notas ?? null]
        );

        const nuevoId = rows[0]?.IDCOMPRA;

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
        FechaCompra: compra[0].FECHACOMPRA,
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
    getCompraChofer,
    esChoferAsignado,
    marcarRecibida,
    deleteCompra
};