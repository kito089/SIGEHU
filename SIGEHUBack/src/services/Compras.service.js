import { getConnection } from "../config/db.js";
import audit from "./Auditoria.service.js";

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

        // Lee el estado previo de la cabecera para comparar campos cambiados.
        const anteriorRows = await tx.query(
            `SELECT Trabajadores_idTrabajador, FechaCompra, Notas
             FROM Compras WHERE idCompra = ?`,
            [id]
        );
        const anterior = anteriorRows?.[0] ?? {};

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

        // Recupera el idAuditoria del UPDATE de cabecera ANTES de tocar detalles,
        // porque los triggers de DetallesCompras reutilizan LAST_AUDIT_ID.
        const auditRows = await tx.query(`
            SELECT RDB$GET_CONTEXT('USER_SESSION', 'LAST_AUDIT_ID') AS ID
            FROM RDB$DATABASE
        `);
const idAudit = auditRows?.[0]?.ID ?? null;

        // Sincronización diferencial de detalles: solo se tocan las filas que
        // realmente cambiaron. Se desactiva la auditoría independiente de la
        // tabla puente (DetallesCompras) mientras se sincronizan, porque esos
        // cambios se registrarán como AuditoriasDetalles de la propia compra.
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'SUPRIMIR_AUDITORIA_PUENTE', '1') FROM RDB$DATABASE"
        );

        const existentes = await tx.query(
            `SELECT idDetalleCompra,
                    Proveedores_has_Materiales_Proveedores_idProveedor AS IdProveedor,
                    Proveedores_has_Materiales_Materiales_idMaterial AS IdMaterial,
                    Cantidad, Medida
             FROM DetallesCompras WHERE Compras_idCompra = ?`,
            [id]
        );

        const porClave = new Map();
        for (const e of existentes ?? []) {
            const clave = `${e.IDPROVEEDOR ?? e.IdProveedor}|${e.IDMATERIAL ?? e.IdMaterial}`;
            porClave.set(clave, e);
        }

        const consumidas = new Set();
        const nuevos = [];
        const cambios = [];
        const eliminados = [];
        for (const d of detalles ?? []) {
            const clave = `${d.idProveedor}|${d.idMaterial}`;
            const existente = porClave.get(clave);
            if (!existente) {
                nuevos.push(d);
                continue;
            }
            consumidas.add(clave);

            const mismaCantidad = Number(existente.CANTIDAD ?? existente.Cantidad ?? 0) === Number(d.Cantidad ?? 0);
            const mismaMedida = String(existente.MEDIDA ?? existente.Medida ?? '') === String(d.Medida ?? '');
            if (!mismaCantidad || !mismaMedida) {
                // Actualiza solo la cantidad/medida cambiada.
                const idDetalle = existente.IDDETALLECOMPRA ?? existente.idDetalleCompra;
                await tx.execute(
                    `UPDATE DetallesCompras
                     SET Cantidad = ?, Medida = ?
                     WHERE idDetalleCompra = ?`,
                    [d.Cantidad, d.Medida ?? null, idDetalle]
                );
                cambios.push({
                    idProveedor: d.idProveedor,
                    idMaterial: d.idMaterial,
                    cantidadAnterior: existente.CANTIDAD ?? existente.Cantidad ?? 0,
                    cantidadNueva: d.Cantidad ?? 0,
                    medidaAnterior: existente.MEDIDA ?? existente.Medida ?? '',
                    medidaNueva: d.Medida ?? ''
                });
            }
        }

        for (const e of existentes ?? []) {
            const clave = `${e.IDPROVEEDOR ?? e.IdProveedor}|${e.IDMATERIAL ?? e.IdMaterial}`;
            if (!consumidas.has(clave)) {
                const idDetalle = e.IDDETALLECOMPRA ?? e.idDetalleCompra;
                await tx.execute(
                    "DELETE FROM DetallesCompras WHERE idDetalleCompra = ?",
                    [idDetalle]
                );
                eliminados.push({
                    idProveedor: e.IDPROVEEDOR ?? e.IdProveedor,
                    idMaterial: e.IDMATERIAL ?? e.IdMaterial,
                    cantidad: e.CANTIDAD ?? e.Cantidad ?? 0,
                    medida: e.MEDIDA ?? e.Medida ?? ''
                });
            }
        }

        for (const d of nuevos) {
            await tx.execute(
                `INSERT INTO DetallesCompras
                 (Compras_idCompra, Proveedores_has_Materiales_Proveedores_idProveedor,
                  Cantidad, Medida, Proveedores_has_Materiales_Materiales_idMaterial)
                 VALUES (?, ?, ?, ?, ?)`,
                [id, d.idProveedor, d.Cantidad, d.Medida ?? null, d.idMaterial]
            );
        }

        // Reactiva la auditoría independiente de DetallesCompras para el resto.
        await tx.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'SUPRIMIR_AUDITORIA_PUENTE', '') FROM RDB$DATABASE"
        );

        await tx.commit();

        // Registra el detalle de los campos de cabecera que cambiaron.
        if (idAudit) {
            const fechaAnterior = normalizeDate(anterior.FECHACOMPRA ?? anterior.FechaCompra ?? null);
            const fechaNueva = normalizeDate(FechaCompra ?? null);
            const notasAnterior = anterior.NOTAS != null
                ? (Buffer.isBuffer(anterior.NOTAS) ? anterior.NOTAS.toString("utf8") : String(anterior.NOTAS))
                : '';
            const notasNueva = Notas != null ? String(Notas) : '';

            const comparacion = [
                { campo: 'Trabajadores_idTrabajador', anterior: String(anterior.TRABAJADORES_IDTRABAJADOR ?? anterior.Trabajadores_idTrabajador ?? ''), nuevo: String(idTrabajador ?? idTrabajadorCtx ?? '') },
                { campo: 'FechaCompra', anterior: fechaAnterior ?? '', nuevo: fechaNueva ?? '' },
                { campo: 'Notas', anterior: notasAnterior, nuevo: notasNueva }
            ];

            for (const { campo, anterior: ant, nuevo } of comparacion) {
                if (String(ant ?? '') !== String(nuevo ?? '')) {
                    await audit.createAuditoriaDetalle({
                        pIdAuditoria: idAudit,
                        pCampo: campo,
                        pValorAnterior: String(ant ?? ''),
                        pValorNuevo: String(nuevo ?? '')
                    });
                }
            }
        }

        // Registra como detalles el agregado/eliminación/cambio de materiales,
        // que ya no generan auditorías independientes por la tabla puente.
        if (idAudit) {
            for (const d of nuevos ?? []) {
                await audit.createAuditoriaDetalle({
                    pIdAuditoria: idAudit,
                    pCampo: 'Material agregado',
                    pValorAnterior: '',
                    pValorNuevo: `Proveedor ${d.idProveedor} | Material ${d.idMaterial} | Cantidad ${String(d.Cantidad ?? '')} | Medida ${String(d.Medida ?? '')}`
                });
            }

            for (const c of cambios ?? []) {
                if (String(c.cantidadAnterior ?? '') !== String(c.cantidadNueva ?? '')) {
                    await audit.createAuditoriaDetalle({
                        pIdAuditoria: idAudit,
                        pCampo: 'Cantidad',
                        pValorAnterior: `Material ${c.idMaterial} (${c.cantidadAnterior})`,
                        pValorNuevo: `Material ${c.idMaterial} (${c.cantidadNueva})`
                    });
                }
                if (String(c.medidaAnterior ?? '') !== String(c.medidaNueva ?? '')) {
                    await audit.createAuditoriaDetalle({
                        pIdAuditoria: idAudit,
                        pCampo: 'Medida',
                        pValorAnterior: `Material ${c.idMaterial} (${c.medidaAnterior})`,
                        pValorNuevo: `Material ${c.idMaterial} (${c.medidaNueva})`
                    });
                }
            }

            for (const e of eliminados ?? []) {
                await audit.createAuditoriaDetalle({
                    pIdAuditoria: idAudit,
                    pCampo: 'Material eliminado',
                    pValorAnterior: `Proveedor ${e.idProveedor} | Material ${e.idMaterial} | Cantidad ${String(e.cantidad ?? '')}${e.medida ? ' | ' + e.medida : ''}`,
                    pValorNuevo: ''
                });
            }
        }
    } catch (err) {
        await tx.rollback();
        throw err;
    }

    return true;
};

// Lista de compras para el chofer (rol Trabajador). Sin datos financieros:
// la tabla Compras no tiene columnas de precio/monto. Devuelve el shape que
// consume la página móvil /movil/compras: una tarjeta por proveedor/dirección
// (agrupando los detalles que comparten el mismo proveedor y dirección), con
// claves en MAYÚSCULAS como Firebird. NO se agrega una tarjeta "resumen" por
// compra: cada compra solo aparece en la lista una vez por cada
// proveedor/dirección (evita duplicados en Compras y en Actividades).
const getComprasChoferList = async (idTrabajador) => {
    const db = await getConnection();

    const compras = await db.query(
        `SELECT c.idCompra, c.FechaCompra, c.Recibida
         FROM Compras c
         WHERE c.Activo = TRUE AND c.Trabajadores_idTrabajador = ?
         ORDER BY c.FechaCompra DESC`,
        [idTrabajador]
    );

    const resultados = [];
    for (const c of compras ?? []) {
        const idCompra = c.IDCOMPRA ?? c.idCompra;
        const detalles = await db.query(
            `SELECT p.idProveedor, p.Nombre AS NombreProveedor,
                    p.Direccion AS DireccionProveedor, p.Telefono AS TelefonoProveedor,
                    m.Nombre AS NombreMaterial, m.UnidadMedida,
                    dc.Cantidad, dc.Medida, dc.idDetalleCompra
             FROM DetallesCompras dc
             JOIN Proveedores_has_Materiales ph
                 ON ph.Proveedores_idProveedor = dc.Proveedores_has_Materiales_Proveedores_idProveedor
                AND ph.Materiales_idMaterial = dc.Proveedores_has_Materiales_Materiales_idMaterial
             JOIN Materiales m ON m.idMaterial = ph.Materiales_idMaterial
             JOIN Proveedores p ON p.idProveedor = ph.Proveedores_idProveedor
             WHERE dc.Compras_idCompra = ?`,
            [idCompra]
        );

        // Agrupa los detalles por (idProveedor + dirección) → la tarjeta de la
        // app móvil separa las compras por "dirección/proveedor". Cada grupo es
        // una tarjeta distinta con su propio checklist y confirmación de surtido.
        const grupos = new Map();
        for (const d of detalles ?? []) {
            const idProv = Number(d.IDPROVEEDOR ?? d.idProveedor);
            const direccion = String(d.DIRECCIONPROVEEDOR ?? d.DireccionProveedor ?? '');
            const clave = `${idProv}|${direccion}`;

            let grupo = grupos.get(clave);
            if (!grupo) {
                grupo = {
                    ID: Number(idCompra),
                    IDPROVEEDOR: idProv,
                    PROVEEDOR_NOMBRE: d.NOMBREPROVEEDOR ?? null,
                    PROVEEDOR_DIRECCION: direccion || null,
                    PROVEEDOR_TELEFONO: d.TELEFONOPROVEEDOR ?? null,
                    FECHA_ORDEN: normalizeDate(c.FECHACOMPRA ?? c.FechaCompra ?? null),
                    RECIBIDA: Boolean(c.RECIBIDA),
                    MATERIALES: []
                };
                grupos.set(clave, grupo);
            }
            grupo.MATERIALES.push({
                idDetalleCompra: Number(d.IDDETALLECOMPRA ?? d.idDetalleCompra),
                MATERIAL_NOMBRE: d.NOMBREMATERIAL,
                CANTIDAD: d.CANTIDAD,
                UNIDAD: d.MEDIDA ?? d.UNIDADMEDIDA ?? null
            });
        }

        for (const grupo of grupos.values()) {
            grupo.ESTADO = grupo.RECIBIDA ? 'Surtida en Proveedor' : 'Pendiente de Surtir';
            resultados.push(grupo);
        }
    }

    return resultados;
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
        ...compra[0],
        FechaCompra: normalizeDate(compra[0].FECHACOMPRA ?? compra[0].FechaCompra ?? null),
        Proveedores: detalles.map(d => ({
            NombreProveedor: d.NOMBREPROVEEDOR,
            DireccionProveedor: d.DIRECCIONPROVEEDOR,
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

        // Validación backend (RF-18): la orden debe tener al menos un
        // detalle asociado antes de permitir marcarla como surtida. El
        // checklist ítem por ítem se valida en el frontend (no hay campo
        // persistente); esta defensa evita confirmar órdenes vacías.
        const detallesRows = await tx.query(
            `SELECT COUNT(*) AS CNT
             FROM DetallesCompras
             WHERE Compras_idCompra = ?`,
            [idCompra]
        );
        const cantidadDetalles = Number(detallesRows?.[0]?.CNT ?? 0);
        if (cantidadDetalles === 0) {
            await tx.rollback();
            return { error: 'La orden no tiene materiales que recolectar' };
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

// Compras pendientes (sin recibir) con proveedores y materiales agregados.
// Registrarlo por: proveedores_idProveedor de cada detalle. Se reutiliza desde
// el Dashboard ("Compras pendientes") y el módulo de Reportes.
const getComprasPendientes = async () => {
    const db = await getConnection();

    const rows = await db.query(
        `SELECT c.idCompra AS ID,
                c.FechaCompra AS FECHA,
                LIST(DISTINCT p.Nombre, ' | ') AS PROVEEDORES,
                LIST(DISTINCT m.Nombre, ', ') AS MATERIALES,
                COUNT(*) AS LINEAS,
                COALESCE(SUM(dc.Cantidad), 0) AS CANTIDADTOTAL
         FROM Compras c
         JOIN DetallesCompras dc ON dc.Compras_idCompra = c.idCompra
         JOIN Proveedores_has_Materiales phm
             ON phm.Proveedores_idProveedor = dc.Proveedores_has_Materiales_Proveedores_idProveedor
            AND phm.Materiales_idMaterial   = dc.Proveedores_has_Materiales_Materiales_idMaterial
         JOIN Proveedores p ON p.idProveedor = phm.Proveedores_idProveedor
         JOIN Materiales  m ON m.idMaterial  = phm.Materiales_idMaterial
         WHERE c.Activo = TRUE AND c.Recibida = FALSE
         GROUP BY c.idCompra, c.FechaCompra
         ORDER BY c.FechaCompra DESC`,
        []
    );

    return rows.map(r => ({
        idCompra: Number(r['ID']),
        FechaCompra: normalizeDate(r['FECHA'] ?? r.FechaCompra ?? null),
        proveedores: String(r['PROVEEDORES'] ?? ''),
        materiales: String(r['MATERIALES'] ?? ''),
        lineas: Number(r['LINEAS'] || 0),
        cantidadTotal: Number(r['CANTIDADTOTAL'] || 0),
    }));
};

export default {
    getCompras,
    getCompraById,
    createCompra,
    updateCompra,
    getComprasChoferList,
    getCompraChofer,
    getComprasPendientes,
    esChoferAsignado,
    marcarRecibida,
    deleteCompra
};