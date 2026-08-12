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
    // Estado intermedio del flujo de doble validación (RF-13/RF-17): el
    // trabajador finaliza una etapa → "Pendiente de aceptación" (8) y el
    // propietario la acepta vía SP_CAMBIAR_ESTADO_OBRA hacia el siguiente
    // estado oficial.
    'pendiente de aceptacion': 8,
    'levantamiento finalizado': 8,
    'fabricacion finalizada': 8,
    // Etapas "Pendiente de Validación" del flujo de doble validación →
    // siguiente estado oficial que el Propietario aprobaría (compatibilidad).
    'levantamiento pendiente de validacion': 3,
    'fabricacion pendiente de validacion': 4,
    'instalacion pendiente de validacion': 5
};

// Etapa ORIGEN y aviso de cada finalización del flujo móvil. La nota de
// finalización se registra con la etapa origen (levantamiento=2, fabricacion=3,
// instalacion=4) para que la aceptación del propietario pueda resolver el
// estado destino.
const ETAPAS_FINALIZACION = {
    'levantamiento finalizado': { etapa: 2, aviso: 'El trabajador {nombre} terminó el levantamiento' },
    'fabricacion finalizada': { etapa: 3, aviso: 'El trabajador {nombre} terminó la fabricación' },
    'instalacion finalizada': { etapa: 4, aviso: 'El trabajador {nombre} terminó la instalación' }
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
    estado, Nombre, Direccion, Ancho, Alto, Profundidad, nota,
    idTrabajadorCtx = 1, nombreTrabajador = 'asignado'
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
        const finalizacion = estado ? ETAPAS_FINALIZACION[normalizarEstado(estado)] : null;
        let notificacion = null;

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

            // Flujo de finalización (doble validación): el trabajador deja la
            // obra en "Pendiente de aceptación" (8). Se valida que esté asignado
            // a la etapa, que tenga permiso para confirmar y que la obra esté en
            // la etapa correcta (evita doble finalización y saltos indebidos).
            if (finalizacion) {
                const asignacion = await tx.query(
                    `SELECT 1 FROM Obras_has_Trabajadores
                     WHERE Obras_idObra = ? AND Trabajadores_idTrabajador = ? AND EstadosObra_idEstadoObra = ?`,
                    [id, idTrabajadorCtx, finalizacion.etapa]
                );
                if (!asignacion || asignacion.length === 0) {
                    await tx.rollback();
                    return { error: 'El trabajador no está asignado a esta etapa de la obra' };
                }

                const permiso = await tx.query(
                    `SELECT 1 FROM PermisosGranularesObras pgo
                     JOIN CamposPermiso cp ON cp.idCampoPermiso = pgo.CamposPermiso_idCampoPermiso
                     WHERE pgo.Obras_idObra = ? AND pgo.Trabajadores_idTrabajador = ? AND cp.NombreCampo = 'confirmar_actividad'`,
                    [id, idTrabajadorCtx]
                );
                if (!permiso || permiso.length === 0) {
                    await tx.rollback();
                    return { error: 'Sin permiso para confirmar la finalización de la etapa' };
                }

                if (Number(estadoActual) === 8) {
                    await tx.rollback();
                    return { error: 'La obra ya está pendiente de aceptación' };
                }
                if (Number(estadoActual) !== finalizacion.etapa) {
                    await tx.rollback();
                    return { error: 'La obra no se encuentra en la etapa correspondiente' };
                }

                // Finalización de instalación (RF-23): se exige que TODO el
                // checklist del kit asignado esté marcado antes de poder
                // finalizar la etapa. Si no hay kit asignado se admite (la obra
                // puede no requerir kit), pero si lo hay debe estar completo.
                if (finalizacion.etapa === 4) {
                    const kitRows = await tx.query(
                        `SELECT ok.idObraKit
                         FROM Obras_has_Kits ok
                         WHERE ok.Obras_idObra = ?`,
                        [id]
                    );
                    if (kitRows && kitRows.length > 0) {
                        const idObraKit = kitRows[0].IDOBRAKIT ?? kitRows[0].idObraKit;
                        const incomplete = await tx.query(
                            `SELECT COUNT(*) AS CNT
                             FROM Obras_Kits_Checklist
                             WHERE Obras_has_Kits_idObraKit = ? AND Marcado = FALSE`,
                            [idObraKit]
                        );
                        const pendientes = Number(incomplete?.[0]?.CNT ?? 0);
                        if (pendientes > 0) {
                            await tx.rollback();
                            return {
                                error: `Debes completar el checklist del kit antes de finalizar la instalación (${pendientes} faltan)`
                            };
                        }
                    }
                }

                const sp = await tx.query(
                    'SELECT * FROM SP_CAMBIAR_ESTADO_OBRA (?, ?)',
                    [id, idEstadoDestino]
                );
                const res = sp?.[0];
                if (res && Number(res.OEXITO) === 0) {
                    await tx.rollback();
                    return { error: res.OMENSAJE || 'Transición de estado no permitida' };
                }

                notificacion = {
                    mensaje: finalizacion.aviso.replace('{nombre}', nombreTrabajador),
                    tipo: 'info'
                };
            } else {
                // Comportamiento previo (etapas "X Pendiente de Validación"):
                // avanza progresivamente hacia el siguiente estado oficial.
                const transicion = await transicionarProgresivo(
                    tx, id, Number(estadoActual) || 0, idEstadoDestino
                );

                if (!transicion.ok) {
                    await tx.rollback();
                    return { error: transicion.mensaje };
                }
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

        // 3. Registrar la nota de avance. En las finalizaciones se conserva la
        //    etapa ORIGEN (levantamiento=2, fabricacion=3) en el registro, de
        //    modo que la aceptación del propietario resuelve el estado destino.
        if (nota && String(nota).trim() !== '') {
            const idEstadoNota = finalizacion
                ? finalizacion.etapa
                : (resolverEstadoObra(estado) ?? Number(estadoActual)) || 1;
            await tx.execute(
                `INSERT INTO NotasObras (Obras_idObra, EstadosObra_idEstadoObra, Trabajadores_idTrabajador, Nota)
                 VALUES (?, ?, ?, ?)`,
                [id, idEstadoNota, idTrabajadorCtx, String(nota)]
            );
        }

        await tx.commit();
        return { ok: true, notificacion };
    } catch (err) {
        await tx.rollback();
        throw err;
    }
};

// ─── UPDATE (Cambiar de Estado) ────────────────────────────────────────────────────────────
// Aceptación de la doble validación: cuando la obra está en "Pendiente de
// aceptación" (8) y se pide aceptarla (destino 8), el estado destino real se
// resuelve desde la última nota registrada (etapa origen + 1): levantamiento →
// En fabricacion (3), fabricacion → Instalacion programada (4). El resto de
// solicitudes se pasan tal cual al SP_CAMBIAR_ESTADO_OBRA.
const cambiarEstado = async (idObra, idEstado, idTrabajadorCtx = 1) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    let result;
    let destino = Number(idEstado);

    try {
        if (destino === 8) {
            const obraRows = await transaction.query(
                "SELECT EstadosObra_idEstadoObra AS EstadoActual FROM Obras WHERE idObra = ?",
                [idObra]
            );
            const estadoActual = Number(obraRows?.[0]?.ESTADOACTUAL ?? obraRows?.[0]?.EstadoActual);

            if (estadoActual === 8) {
                const notaRows = await transaction.query(
                    `SELECT FIRST 1 EstadosObra_idEstadoObra AS Etapa
                     FROM NotasObras WHERE Obras_idObra = ?
                     ORDER BY FechaCreacion DESC, idNotaObra DESC`,
                    [idObra]
                );
                const etapa = Number(notaRows?.[0]?.ETAPA ?? notaRows?.[0]?.Etapa);
                destino = (etapa >= 2 && etapa <= 4) ? etapa + 1 : null;

                if (!destino) {
                    await transaction.rollback();
                    return { error: 'No se pudo resolver el estado destino de la aceptación' };
                }
            }
        }

        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const rows = await transaction.query(
            `SELECT * FROM SP_CAMBIAR_ESTADO_OBRA (?, ?)`,
            [idObra, destino]
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