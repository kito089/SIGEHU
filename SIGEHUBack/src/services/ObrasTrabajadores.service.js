import { getConnection } from "../config/db.js";

// ─── CREATE: asignar trabajador a obra ───────────────────────────────────────
const asignarTrabajador = async ({ idObra, idTrabajador, idEstadoObra }) => {
    const db = await getConnection();

    const rows = await db.query(
        `INSERT INTO Obras_has_Trabajadores (Obras_idObra, Trabajadores_idTrabajador, EstadosObra_idEstadoObra)
         VALUES (?, ?, ?)
         RETURNING idDetalleAsignacion`,
        [idObra, idTrabajador, idEstadoObra]
    );

    return rows[0]?.IDDETALLEASIGNACION;
};

// ─── GET trabajadores asignados a una obra ───────────────────────────────────
const getTrabajadoresByObra = async (idObra) => {
    const db = await getConnection();

    return await db.query(
        `SELECT oht.*, t.NombreUsuario, t.NombreCompleto
         FROM Obras_has_Trabajadores oht
         JOIN Trabajadores t ON t.idTrabajador = oht.Trabajadores_idTrabajador
         WHERE oht.Obras_idObra = ?`,
        [idObra]
    );
};

// ─── DELETE: quitar trabajador de la obra (hard, sin Activo) ────────────────
const quitarTrabajador = async (idDetalleAsignacion) => {
    const db = await getConnection();

    const rows = await db.query(
        "SELECT * FROM Obras_has_Trabajadores WHERE idDetalleAsignacion = ?",
        [idDetalleAsignacion]
    );

    if (!rows || rows.length === 0) return null;

    await db.execute(
        "DELETE FROM Obras_has_Trabajadores WHERE idDetalleAsignacion = ?",
        [idDetalleAsignacion]
    );

    return true;
};

// ─── PERMISOS: asignar varios permisos a un trabajador en una obra ──────────
const asignarPermisos = async ({ idObra, idTrabajador, camposPermiso }) => {
    // camposPermiso: array de IDs, ej. [1, 2, 5]
    const db = await getConnection();

    const resultados = [];

    for (const idCampoPermiso of camposPermiso) {
        try {
            await db.execute(
                `INSERT INTO PermisosGranularesObras (CamposPermiso_idCampoPermiso, Obras_idObra, Trabajadores_idTrabajador)
                 VALUES (?, ?, ?)`,
                [idCampoPermiso, idObra, idTrabajador]
            );
            resultados.push({ idCampoPermiso, asignado: true });
        } catch (err) {
            // Si ya existe (UNIQUE constraint), lo marcamos pero seguimos con los demás
            resultados.push({ idCampoPermiso, asignado: false, error: err.message });
        }
    }

    return resultados;
};

// ─── PERMISOS: obtener permisos de un trabajador en una obra ────────────────
const getPermisos = async (idObra, idTrabajador) => {
    const db = await getConnection();

    return await db.query(
        `SELECT pgo.*, cp.NombreCampo
         FROM PermisosGranularesObras pgo
         JOIN CamposPermiso cp ON cp.idCampoPermiso = pgo.CamposPermiso_idCampoPermiso
         WHERE pgo.Obras_idObra = ? AND pgo.Trabajadores_idTrabajador = ?`,
        [idObra, idTrabajador]
    );
};

// ─── PERMISOS: revocar uno o varios permisos ─────────────────────────────────
const revocarPermisos = async ({ idObra, idTrabajador, camposPermiso }) => {
    const db = await getConnection();

    for (const idCampoPermiso of camposPermiso) {
        await db.execute(
            `DELETE FROM PermisosGranularesObras
             WHERE Obras_idObra = ? AND Trabajadores_idTrabajador = ? AND CamposPermiso_idCampoPermiso = ?`,
            [idObra, idTrabajador, idCampoPermiso]
        );
    }

    return true;
};

// ─── PAGO: registrar un pago para la obra ────────────────────────────────────
const registrarPago = async ({ idObra, idTipoPago, idTrabajador, idEstadoObra, monto, idFormaPago }) => {
    const db = await getConnection();

    const rows = await db.query(
        `INSERT INTO DetallesPagos
            (Obras_idObra, TiposPago_idTipoPago, Trabajadores_idTrabajador, EstadosObra_idEstadoObra, Monto, FormasPago_idFormaPago)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING idDetallePago`,
        [idObra, idTipoPago, idTrabajador, idEstadoObra, monto, idFormaPago]
    );

    return rows[0]?.IDDETALLEPAGO;
};

// ─── GET pagos de una obra ───────────────────────────────────────────────────
const getPagosByObra = async (idObra) => {
    const db = await getConnection();

    return await db.query(
        "SELECT * FROM DetallesPagos WHERE Obras_idObra = ? ORDER BY FechaRegistro DESC",
        [idObra]
    );
};

export default {
    asignarTrabajador,
    getTrabajadoresByObra,
    quitarTrabajador,
    asignarPermisos,
    getPermisos,
    revocarPermisos,
    registrarPago,
    getPagosByObra
};