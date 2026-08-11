import { getConnection } from "../config/db.js";
import audit from "./Auditoria.service.js";

// ─── Resolución de estado de obra por nombre (app móvil) ─────────────────
// La app móvil envía nombres amigables de etapa ("X Pendiente de Validación")
// que NO existen en el catálogo EstadosObra (solo 7 estados oficiales). Se
// mapean a la siguiente etapa oficial según la máquina de estados del SRS.
const MAPA_ESTADOS_OBRA = {
    'solicitud recibida': 1,
    'levantamiento pendiente': 2,
    'en fabricacion': 3,
    'instalacion programada': 4,
    'instalado': 5,
    'garantia': 6,
    'finalizado': 7,
    // Etapas "Pendiente de Validación" del flujo de doble validación →
    // siguiente estado oficial que el Propietario aprobaría.
    'levantamiento pendiente de validacion': 3,
    'fabricacion pendiente de validacion': 4,
    'instalacion pendiente de validacion': 5
};

const normalizarEstado = (nombre) =>
    String(nombre || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim();

const resolverEstadoObra = (nombre) =>
    MAPA_ESTADOS_OBRA[normalizarEstado(nombre)] ?? null;

// Aplica la máquina de estados paso a paso vía SP_CAMBIAR_ESTADO_OBRA desde el
// estado actual hasta el destino. Cada paso es validado por el SP.
const transicionarProgresivo = async (tx, idObra, estadoActual, destino) => {
    for (let paso = estadoActual + 1; paso <= destino; paso++) {
        const rows = await tx.query(
            'SELECT * FROM SP_CAMBIAR_ESTADO_OBRA (?, ?)',
            [idObra, paso]
        );
        const res = rows?.[0];
        if (res && Number(res.OEXITO) === 0) {
            return { ok: false, mensaje: res.OMENSAJE || 'Transición de estado no permitida' };
        }
    }
    return { ok: true };
};

// ─── GET todos los Obras ───────────────────────────────────────────────
const getObras = async (rol = null, idTrabajador = null, search = null) => {
    const db = await getConnection();

    try {
        if (rol === 'Trabajador' && idTrabajador) {
            let sql = 'SELECT * FROM VW_OBRAS_TRABAJADOR WHERE Trabajadores_idTrabajador = ?';
            const params = [idTrabajador];

            if (search && search.trim() !== '') {
                sql += ' AND UPPER(NombreObra) LIKE ?';
                params.push(`%${search.trim().toUpperCase()}%`);
            }

            const Obras = await db.query(sql, params);
            return Obras;
        }

        let sql = 'SELECT * FROM Obras';
        const params = [];

        if (search && search.trim() !== '') {
            sql += ' WHERE UPPER(Nombre) LIKE ?';
            params.push(`%${search.trim().toUpperCase()}%`);
        }

        const Obras = await db.query(sql, params);

        const ObrasConMateriales = await Promise.all(
            Obras.map(async (Obra) => {
                const materiales = await db.query(
                    `SELECT m.* FROM Materiales m
                    JOIN Obras_has_Materiales pm ON pm.Materiales_idMaterial = m.idMaterial
                    WHERE pm.Obras_idObra = ?`,
                    [Obra.IDOBRA]
                );

                return {
                    ...Obra,
                    MATERIALES: materiales
                };
            })
        );

        return ObrasConMateriales;
    } catch (error) {
        console.error("Error al obtener los Obras:", error);
        throw error;
    }
    return error;
};

// ─── GET Obra por ID ────────────────────────────────────────────────────
const getObraById = async (id) => {
    const db = await getConnection();
    try {
        const rows = await db.query("SELECT * FROM Obras WHERE idObra = ?", [id]);
        return rows[0] ?? null;
    } catch (error) {
        console.error(`Error al obtener la Obra con ID ${id}:`, error);
        throw error;
    }
    return error;
};

// ─── GET Detalle de obra (vista VW_DETALLE_OBRA) ────────────────────────
// Devuelve la obra con cliente y datos de contacto en un solo objeto, sin
// alterar el shape de getObraById (que se usa en el form de edición).
const getDetalleObra = async (id) => {
    const db = await getConnection();
    const rows = await db.query("SELECT * FROM VW_DETALLE_OBRA WHERE idObra = ?", [id]);
    return rows[0] ?? null;
};

// ─── INSERT ───────────────────────────────────────────────────────────────────
const createObra = async ({ idCliente, Nombre, Direccion, idTrabajo = null, FechaInicio = null, Ancho = null, Alto = null, Profundidad = null, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();

    // ── 1. Validar que el cliente existe y está activo ────────────────────────
    const clientes = await db.query(
        `SELECT idCliente FROM Clientes WHERE idCliente = ? AND Activo = TRUE`,
        [idCliente]
    );

    if (!clientes || clientes.length === 0) {
        throw new Error("El cliente asociado no existe o está inactivo");
    }

    // ── 2. Validar que el trabajo (si se indica) pertenece al mismo cliente ──
    if (idTrabajo) {
        const trabajos = await db.query(
            `SELECT idTrabajo FROM TRABAJO WHERE idTrabajo = ? AND Clientes_idCliente = ?`,
            [idTrabajo, idCliente]
        );
        if (!trabajos || trabajos.length === 0) {
            throw new Error("El tipo de trabajo no pertenece al cliente seleccionado");
        }
    }

    const txInsert = await db.transaction();

    let nuevoId;
    try {
        await txInsert.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const fechaInicioDb = FechaInicio
            ? (FechaInicio instanceof Date ? FechaInicio : new Date(FechaInicio))
            : null;
        const direccionDb = Direccion != null ? Buffer.from(String(Direccion), "utf8") : null;

        const rows = await txInsert.query(
            `SELECT * FROM SP_INSERTAR_OBRA (?, ?, ?, ?, ?, ?, ?, ?)`,
            [idCliente, Nombre, direccionDb, idTrabajo ?? null, fechaInicioDb,
             Ancho ?? null, Alto ?? null, Profundidad ?? null]
        );

        nuevoId = rows[0]?.OIDOBRA; // ajustar nombre del parámetro RETURNS según tu SP

        await txInsert.commit();
    } catch (err) {
        await txInsert.rollback();
        throw err;
    }

    return nuevoId;
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
const updateObra = async (id, { Nombre, Direccion, Ancho, Alto, Profundidad, idTrabajadorCtx = 1 }) => {
    const db = await getConnection();

    // ── 1. Leer el registro actual ANTES de modificar ───────────────────────
    const txRead = await db.transaction();
    let anterior;

    try {
        const rows = await txRead.query(
            `SELECT Nombre, Direccion, Ancho, Alto, Profundidad
             FROM Obras WHERE IdObra = ?`,
            [id]
        );

        await txRead.commit();

        if (!rows || rows.length === 0) return null; // no existe

        anterior = rows[0];

    } catch (err) {
        await txRead.rollback();
        throw err;
    }

    // ── 2. Ejecutar el UPDATE ────────────────────────────────────────────────
    const txUpdate = await db.transaction();

    try {
        await txUpdate.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        await txUpdate.execute(
            `UPDATE Obras
             SET Nombre = ?,
                 Direccion = ?,
                 Ancho = ?,
                 Alto = ?,
                 Profundidad = ?
             WHERE idObra = ?`,
            [Nombre, Direccion ?? null, Ancho ?? null, Alto ?? null, Profundidad ?? null, id]
        );

        await txUpdate.commit();

    } catch (err) {
        await txUpdate.rollback();
        throw err;
    }

    // ── 3. Recuperar el idAuditoria que el trigger dejó en el contexto ──────
    const txAudit = await db.transaction();
    let idAudit;

    try {
        const rows = await txAudit.query(`
            SELECT
                RDB$GET_CONTEXT('USER_SESSION', 'LAST_AUDIT_ID') AS ID
            FROM RDB$DATABASE
        `);

        idAudit = rows[0]?.ID;

        await txAudit.commit();
    } catch (err) {
        await txAudit.rollback();
        throw err;
    }

    // ── 4. Comparar y registrar el detalle de los cambios ───────────────────
    const comparacion = [
        { campo: 'Nombre', anterior: anterior.NOMBRE, nuevo: Nombre },
        { campo: 'Direccion', anterior: anterior.DIRECCION, nuevo: Direccion ?? null },
        { campo: 'Ancho', anterior: anterior.ANCHO, nuevo: Ancho ?? null },
        { campo: 'Alto', anterior: anterior.ALTO, nuevo: Alto ?? null },
        { campo: 'Profundidad', anterior: anterior.PROFUNDIDAD, nuevo: Profundidad ?? null }
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
const deleteObra = async (id, idTrabajadorCtx = 1) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const rows = await transaction.query(
            "SELECT idObra FROM Obras WHERE idObra = ? AND Activo = TRUE",
            [id]
        );

        if (!rows || rows.length === 0) {
            await transaction.rollback();
            return null;
        }

        await transaction.execute(
            "UPDATE Obras SET Activo = FALSE WHERE IdObra = ?",
            [id]
        );

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return true;
};

// ─── UPDATE de etapa desde la app móvil (doble validación) ──────────────────
// El trabajador marca una etapa como "Pendiente de Validación" y aporta medidas
// y/o una nota. En una sola transacción:
//   1) Avanza el estado oficial vía SP_CAMBIAR_ESTADO_OBRA (máquina de estados).
//   2) Actualiza las medidas que haya enviado.
//   3) Registra la nota de avance en NotasObras (con el estado resultante).
const completarEtapa = async (id, {
    estado, Nombre, Direccion, Ancho, Alto, Profundidad, nota, idTrabajadorCtx = 1
}) => {
    const db = await getConnection();
    const tx = await db.transaction();

    try {
        // 0. Leer la obra y su estado actual
        const obras = await tx.query(
            `SELECT o.EstadosObra_idEstadoObra AS EstadoActual
             FROM Obras o WHERE o.idObra = ? AND o.Activo = TRUE`,
            [id]
        );

        if (!obras || obras.length === 0) {
            await tx.rollback();
            return null;
        }

        const estadoActual = obras[0].ESTADOACTUAL ?? obras[0].EstadoActual;

        // 1. Resolver y aplicar transición de estado si viene `estado`
        if (estado) {
            const idEstadoDestino = resolverEstadoObra(estado);
            if (idEstadoDestino == null) {
                await tx.rollback();
                return { error: `Estado "${estado}" no reconocido` };
            }

            await tx.execute(
                "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
                [String(idTrabajadorCtx)]
            );

            const transicion = await transicionarProgresivo(
                tx, id, Number(estadoActual) || 0, idEstadoDestino
            );

            if (!transicion.ok) {
                await tx.rollback();
                return { error: transicion.mensaje };
            }
        }

        // 2. Actualizar medidas/campos opcionales (solo los que lleguen)
        const campos = [];
        const valores = [];
        const agregar = (columna, valor) => {
            if (valor != null && String(valor).trim() !== '') {
                campos.push(columna);
                valores.push(valor);
            }
        };

        agregar('Nombre', Nombre);
        agregar('Direccion', Direccion != null ? Buffer.from(String(Direccion), "utf8") : null);
        agregar('Ancho', Ancho);
        agregar('Alto', Alto);
        agregar('Profundidad', Profundidad);

        if (campos.length > 0) {
            await tx.execute(
                `UPDATE Obras SET ${campos.map(c => `${c} = ?`).join(', ')} WHERE idObra = ?`,
                [...valores, id]
            );
        }

        // 3. Registrar la nota de avance con el estado resultante
        if (nota && String(nota).trim() !== '') {
            await tx.execute(
                `INSERT INTO NotasObras (Obras_idObra, EstadosObra_idEstadoObra, Trabajadores_idTrabajador, Nota)
                 VALUES (?, ?, ?, ?)`,
                [id, (resolverEstadoObra(estado) ?? Number(estadoActual)) || 1, idTrabajadorCtx, String(nota)]
            );
        }

        await tx.commit();
        return { ok: true };
    } catch (err) {
        await tx.rollback();
        throw err;
    }
};

// ─── UPDATE (Cambiar de Estado) ────────────────────────────────────────────────────────────
const cambiarEstado = async (idObra, idEstado, idTrabajadorCtx = 1) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    let result;

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const rows = await transaction.query(
            `SELECT * FROM SP_CAMBIAR_ESTADO_OBRA (?, ?)`,
            [idObra, idEstado]
        );

        result = rows[0];

        await transaction.commit();
    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return result;
};

// ─── GET catálogo de estados de obra ────────────────────────────────────
const getEstados = async () => {
    const db = await getConnection();
    return await db.query(
        `SELECT IDESTADOOBRA AS idEstadoObra, NOMBRE AS nombre
         FROM EstadosObra
         ORDER BY idEstadoObra`
    );
};

export default {
    getObras,
    getObraById,
    getDetalleObra,
    createObra,
    updateObra,
    deleteObra,
    cambiarEstado,
    completarEtapa,
    resolverEstadoObra,
    getEstados
};