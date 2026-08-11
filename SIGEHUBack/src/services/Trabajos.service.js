import { getConnection } from "../config/db.js";

// ─── INSERT Trabajo ───────────────────────────────────────────────────────────
// Crea un trabajo (grupo de obras) asociado a un cliente. Requiere el cliente
// existente y activo. La transacción de inserción se hace vía SP_INSERTAR_TRABAJO
// para mantener el contexto de auditoría (RDB$SET_CONTEXT) coherente.
const createTrabajo = async ({ idCliente, nombre, descripcion, direccion, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();

    // 1. Validar que el cliente existe y está activo
    const clientes = await db.query(
        `SELECT idCliente FROM Clientes WHERE idCliente = ? AND Activo = TRUE`,
        [idCliente]
    );
    if (!clientes || clientes.length === 0) {
        throw new Error("El cliente asociado no existe o está inactivo");
    }

    const txInsert = await db.transaction();
    let nuevoId;
    try {
        await txInsert.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const descBuffer = descripcion != null ? Buffer.from(String(descripcion), "utf8") : null;
        const dirBuffer = direccion != null ? Buffer.from(String(direccion), "utf8") : null;

        const rows = await txInsert.query(
            `SELECT * FROM SP_INSERTAR_TRABAJO (?, ?, ?, ?)`,
            [idCliente, nombre, descBuffer, dirBuffer]
        );
        nuevoId = rows?.[0]?.OIDTRABAJO;

        if (!nuevoId) {
            throw new Error("No se pudo crear el trabajo: el procedimiento no devolvió un id válido");
        }

        await txInsert.commit();
    } catch (err) {
        await txInsert.rollback();
        throw err;
    }

    return nuevoId;
};

// ─── UPDATE Trabajo ───────────────────────────────────────────────────────────
const updateTrabajo = async (id, { nombre, descripcion, direccion, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();

    const txRead = await db.transaction();
    let existe;
    try {
        const rows = await txRead.query(
            "SELECT idTrabajo FROM TRABAJO WHERE idTrabajo = ?",
            [id]
        );
        await txRead.commit();
        existe = rows && rows.length > 0;
    } catch (err) {
        await txRead.rollback();
        throw err;
    }

    if (!existe) return null;

    const txUpdate = await db.transaction();
    try {
        await txUpdate.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const descBuffer = descripcion != null ? Buffer.from(String(descripcion), "utf8") : null;
        const dirBuffer = direccion != null ? Buffer.from(String(direccion), "utf8") : null;

        await txUpdate.execute(
            `UPDATE TRABAJO
             SET Nombre = ?, Descripcion = ?, Direccion = ?
             WHERE idTrabajo = ?`,
            [nombre, descBuffer, dirBuffer, id]
        );

        await txUpdate.commit();
    } catch (err) {
        await txUpdate.rollback();
        throw err;
    }

    return true;
};

// ─── GET Trabajo por ID ───────────────────────────────────────────────────────
const getTrabajoById = async (id) => {
    const db = await getConnection();
    const rows = await db.query(
        `SELECT t.idTrabajo, t.Nombre, t.Descripcion, t.Direccion, t.FechaCreacion,
                t.Clientes_idCliente, c.NombreCompleto AS NombreCliente
         FROM TRABAJO t
         JOIN Clientes c ON c.idCliente = t.Clientes_idCliente
         WHERE t.idTrabajo = ?`,
        [id]
    );
    return rows[0] ?? null;
};

// ─── GET Obras asociadas a un Trabajo ─────────────────────────────────────────
const getObrasByTrabajo = async (idTrabajo) => {
    const db = await getConnection();
    return await db.query(
        `SELECT o.idObra, o.Nombre, o.Direccion, o.Ancho, o.Alto, o.Profundidad,
                o.FechaCreacion, o.FechaUltimaActualizacion,
                e.Nombre AS EstadoObra, o.EstadosObra_idEstadoObra
         FROM Obras o
         JOIN EstadosObra e ON e.idEstadoObra = o.EstadosObra_idEstadoObra
         WHERE o.TRABAJOS_IDTRABAJO = ? AND o.Activo = TRUE
         ORDER BY o.Nombre`,
        [idTrabajo]
    );
};

// ─── Agrupar obras bajo un trabajo (UPDATE TRABAJOS_IDTRABAJO) ────────────────
// Recibe el idTrabajo y la lista de idObra. Valida que cada obra exista y (si
// se indica) que pertenezca al mismo cliente del trabajo para no mezclar
// clientes. También permite actualizar la dirección del trabajo si la usa como
// "dirección unificada" (punto 5 del checklist de agrupación).
const agruparObrasEnTrabajo = async (idTrabajo, idsObras, { actualizarDireccionTrabajo = null, idTrabajadorCtx = 1 } = {}) => {
    const db = await getConnection();

    const trabajos = await db.query(
        "SELECT t.idTrabajo, t.Clientes_idCliente FROM TRABAJO t WHERE t.idTrabajo = ?",
        [idTrabajo]
    );
    if (!trabajos || trabajos.length === 0) {
        throw new Error("El trabajo no existe");
    }
    const idClienteTrabajo = trabajos[0].CLIENTES_IDCLIENTE;

    const obras = await db.query(
        `SELECT idObra, Clientes_idCliente FROM Obras WHERE idObra = ?`,
        [idsObras]
    );
    // node-fb / node-firebird devuelve arrays; idsObras puede ser un array o un número.
    const lista = Array.isArray(idsObras) ? idsObras : [idsObras];
    if (lista.length === 0) {
        throw new Error("Se requiere al menos una obra para agrupar");
    }

    const txUpdate = await db.transaction();
    try {
        await txUpdate.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        for (const idObra of lista) {
            const rows = await txUpdate.query(
                "SELECT Clientes_idCliente FROM Obras WHERE idObra = ? AND Activo = TRUE",
                [idObra]
            );
            if (!rows || rows.length === 0) {
                throw new Error(`La obra ${idObra} no existe o está inactiva`);
            }
            if (String(rows[0].CLIENTES_IDCLIENTE) !== String(idClienteTrabajo)) {
                throw new Error(`La obra ${idObra} no pertenece al cliente del trabajo`);
            }
            await txUpdate.execute(
                "UPDATE Obras SET TRABAJOS_IDTRABAJO = ?, FechaUltimaActualizacion = CURRENT_TIMESTAMP WHERE idObra = ?",
                [idTrabajo, idObra]
            );
        }

        // Si el flujo de agrupación eligió una dirección unificada.
        if (actualizarDireccionTrabajo != null) {
            const dirBuffer = Buffer.from(String(actualizarDireccionTrabajo), "utf8");
            await txUpdate.execute(
                "UPDATE TRABAJO SET Direccion = ? WHERE idTrabajo = ?",
                [dirBuffer, idTrabajo]
            );
        }

        await txUpdate.commit();
    } catch (err) {
        await txUpdate.rollback();
        throw err;
    }

    return true;
};

export default {
    createTrabajo,
    updateTrabajo,
    getTrabajoById,
    getObrasByTrabajo,
    agruparObrasEnTrabajo
};