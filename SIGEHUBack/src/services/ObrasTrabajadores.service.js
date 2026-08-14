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

// ─── CREATE: asignar trabajador a obra ───────────────────────────────────────
// Evita duplicados por (Obra, Trabajador, Etapa) y valida que el trabajador
// exista, esté activo y NO sea Propietario (el admin jamás se asigna como
// trabajador de obra). Devuelve:
//   - número  → idDetalleAsignacion (asignado correctamente)
//   - { duplicado: true } → ya estaba asignado a esa etapa
//   - { invalido: true }  → trabajador inactivo/inexistente o con rol Propietario
const asignarTrabajador = async ({ idObra, idTrabajador, idEstadoObra }) => {
    const db = await getConnection();

    const existe = await db.query(
        `SELECT 1 FROM Obras_has_Trabajadores
         WHERE Obras_idObra = ? AND Trabajadores_idTrabajador = ? AND EstadosObra_idEstadoObra = ?`,
        [idObra, idTrabajador, idEstadoObra]
    );
    if (existe && existe.length > 0) return { duplicado: true };

    const trabajador = await db.query(
        `SELECT 1 FROM Trabajadores
         WHERE idTrabajador = ? AND Activo = TRUE AND TiposUsuarios_idTipoUsuario <> 1`,
        [idTrabajador]
    );
    if (!trabajador || trabajador.length === 0) return { invalido: true };

    const rows = await db.executeReturning(
        `INSERT INTO Obras_has_Trabajadores (Obras_idObra, Trabajadores_idTrabajador, EstadosObra_idEstadoObra)
         VALUES (?, ?, ?)
         RETURNING idDetalleAsignacion`,
        [idObra, idTrabajador, idEstadoObra]
    );

    return extractReturningValue(rows, 'IDDETALLEASIGNACION');
};

// ─── CREATE (lote): asignar varios trabajadores con sus permisos granulares ──
// Alta por lotes desde el modal del Detalle de Obra. En una sola transacción:
//   - si el trabajador ya está asignado a la etapa, NO se duplica la fila pero
//     SÍ se actualizan sus permisos granulares (reflejo de los checkboxes)
//   - valida que cada trabajador nuevo sea activo y no Propietario
//   - reemplaza los permisos granulares del trabajador en la obra por los
//     marcados en el modal (reflejo exacto de los checkboxes)
const asignarTrabajadoresBatch = async ({ idObra, idEstadoObra, trabajadores, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const resultados = [];

        for (const item of trabajadores ?? []) {
            const idTrabajador = Number(item?.idTrabajador);
            if (!idTrabajador) continue;

            const existe = await tx.query(
                `SELECT 1 FROM Obras_has_Trabajadores
                 WHERE Obras_idObra = ? AND Trabajadores_idTrabajador = ? AND EstadosObra_idEstadoObra = ?`,
                [idObra, idTrabajador, idEstadoObra]
            );
            const yaAsignado = existe && existe.length > 0;

            if (!yaAsignado) {
                const trabajador = await tx.query(
                    `SELECT 1 FROM Trabajadores
                     WHERE idTrabajador = ? AND Activo = TRUE AND TiposUsuarios_idTipoUsuario <> 1`,
                    [idTrabajador]
                );
                if (!trabajador || trabajador.length === 0) {
                    resultados.push({ idTrabajador, asignado: false, motivo: 'trabajador_invalido' });
                    continue;
                }

                const rows = await tx.executeReturning(
                    `INSERT INTO Obras_has_Trabajadores (Obras_idObra, Trabajadores_idTrabajador, EstadosObra_idEstadoObra)
                     VALUES (?, ?, ?) RETURNING idDetalleAsignacion`,
                    [idObra, idTrabajador, idEstadoObra]
                );
                resultados.push({ idTrabajador, asignado: true, yaAsignado: false, idDetalleAsignacion: extractReturningValue(rows, 'IDDETALLEASIGNACION') });
            } else {
                resultados.push({ idTrabajador, asignado: false, yaAsignado: true });
            }

            const permisos = Array.isArray(item?.permisos) ? item.permisos : [];
            await tx.execute(
                "DELETE FROM PermisosGranularesObras WHERE Obras_idObra = ? AND Trabajadores_idTrabajador = ?",
                [idObra, idTrabajador]
            );
            for (const idCampoPermiso of permisos) {
                await tx.execute(
                    `INSERT INTO PermisosGranularesObras (CamposPermiso_idCampoPermiso, Obras_idObra, Trabajadores_idTrabajador)
                     VALUES (?, ?, ?)`,
                    [idCampoPermiso, idObra, idTrabajador]
                );
            }
            resultados[resultados.length - 1].permisos = permisos;
        }

        await tx.commit();
        return resultados;
    } catch (err) {
        await tx.rollback();
        throw err;
    }
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

// ─── PERMISOS: catálogo de campos de permiso disponibles ────────────────────
const getCamposPermiso = async () => {
    const db = await getConnection();

    return await db.query(
        `SELECT idCampoPermiso, NombreCampo, Descripcion
         FROM CamposPermiso
         ORDER BY idCampoPermiso`,
        []
    );
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

    const rows = await db.executeReturning(
        `INSERT INTO DetallesPagos
            (Obras_idObra, TiposPago_idTipoPago, Trabajadores_idTrabajador, EstadosObra_idEstadoObra, Monto, FormasPago_idFormaPago)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING idDetallePago`,
        [idObra, idTipoPago, idTrabajador, idEstadoObra, monto, idFormaPago]
    );

    return extractReturningValue(rows, 'IDDETALLEPAGO');
};

// ─── GET pagos de una obra ───────────────────────────────────────────────────
// Devuelve cada pago con sus catálogos resueltos (Tipo de pago, Forma de pago,
// Estado de obra al que se asoció y el trabajador que lo registró) en claves
// UPPERCASE (TIPOPAGO, FORMAPAGO, ESTADOOBRA, TRABAJADORQUEREGISTRO) para que el
// frontend del Detalle de Obra pueda mapearlos sin transformaciones. Reutiliza
// los JOIN estándar del esquema (TiposPago / FormasPago / EstadosObra /
// Trabajadores) sin crear vistas/SP nuevos (RNF-05).
const getPagosByObra = async (idObra) => {
    const db = await getConnection();

    return await db.query(
        `SELECT
            dp.idDetallePago        AS IDDETALLEPAGO,
            dp.Obras_idObra         AS IDOBRA,
            dp.Monto                AS MONTO,
            dp.FechaRegistro        AS FECHAREGISTRO,
            tp.Nombre               AS TIPOPAGO,
            fp.Nombre               AS FORMAPAGO,
            eo.idEstadoObra         AS IDESTADOOBRA,
            eo.Nombre               AS ESTADOOBRA,
            t.idTrabajador          AS IDTRABAJADOR,
            t.NombreCompleto        AS TRABAJADORQUEREGISTRO
         FROM DetallesPagos dp
         JOIN TiposPago    tp ON tp.idTipoPago    = dp.TiposPago_idTipoPago
         JOIN FormasPago   fp ON fp.idFormaPago   = dp.FormasPago_idFormaPago
         JOIN EstadosObra  eo ON eo.idEstadoObra  = dp.EstadosObra_idEstadoObra
         LEFT JOIN Trabajadores t ON t.idTrabajador = dp.Trabajadores_idTrabajador
         WHERE dp.Obras_idObra = ?
         ORDER BY dp.FechaRegistro DESC, dp.idDetallePago DESC`,
        [idObra]
    );
};

export default {
    asignarTrabajador,
    asignarTrabajadoresBatch,
    getTrabajadoresByObra,
    quitarTrabajador,
    asignarPermisos,
    getPermisos,
    revocarPermisos,
    getCamposPermiso,
    registrarPago,
    getPagosByObra
};