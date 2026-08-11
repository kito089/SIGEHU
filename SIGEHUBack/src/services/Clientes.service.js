import { getConnection } from "../config/db.js";
import audit from "./Auditoria.service.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RFC_REGEX = /^[A-ZÑ&]{3,4}[0-9]{6}[A-Z0-9]{3}$/;
const PHONE_REGEX = /^\d{10,15}$/;
const CP_REGEX = /^\d{5}$/;
const TIPOS_VALIDOS = ['persona', 'empresa'];

const validateTipo = (tipo) => {
    if (tipo === null || tipo === undefined) return true;
    return TIPOS_VALIDOS.includes(String(tipo).toLowerCase());
};

const validateCP = (cp) => {
    if (!cp) return true;
    return CP_REGEX.test(String(cp));
};

// DEPRECATED: Phase 2 - removed from frontend
// (requiereFactura / direccionInstalacion ya no forman parte del modelo Clientes)

const validateRFC = (rfc) => {
    if (!rfc) return true;
    return RFC_REGEX.test(rfc);
};

const validatePhone = (phone) => {
    if (!phone) return true;
    const digitos = String(phone).replace(/\D/g, "");
    return PHONE_REGEX.test(digitos);
};

const validateEmail = (email) => {
    if (!email) return true;
    return EMAIL_REGEX.test(email);
};

// ─── GET todos los Regimentes Fiscales ───────────────────────────────────────────────
const getRegimenesFiscales = async () => {
    const db = await getConnection();
    const result = await db.query(
        "SELECT * FROM RegimenesFiscales",
        []
    );

    return result;
}

// ─── GET todos los Usos del CFDI ───────────────────────────────────────────────
const getUsosCFDI = async () => {
    const db = await getConnection();
    const result = await db.query(
        "SElECT * FROM UsosCFDI",
        []
    );

    return result;
}

// ─── GET todos los Clientes ───────────────────────────────────────────────
const getClientes = async ({ search = null, fiscal = null, tipo = null } = {}) => {
    const db = await getConnection();

    let sql = `SELECT idCliente, NombreCompleto AS Nombre,
                      Tipo,
                      TelefonoPrincipal AS Telefono,
                      CorreoPrincipal AS Correo,
                      RFC, Activo, TieneDatosFiscales, TotalObrasActivas
               FROM VW_CLIENTES_CON_OBRAS`;
    const where = [];
    const params = [];

    if (search && search.trim() !== '') {
        where.push('UPPER(NombreCompleto) LIKE ?');
        params.push(`%${search.trim().toUpperCase()}%`);
    }

    // El módulo Clientes trabaja exclusivamente con clientes activos: los
    // clientes eliminados (soft-delete) nunca deben aparecer en los listados.
    where.push('Activo = TRUE');

    if (tipo === 'persona' || tipo === 'empresa') {
        where.push('Tipo = ?');
        params.push(tipo);
    }

    if (fiscal === 'with') {
        where.push('TieneDatosFiscales = TRUE');
    } else if (fiscal === 'without') {
        where.push('TieneDatosFiscales = FALSE');
    }

    if (where.length) {
        sql += ' WHERE ' + where.join(' AND ');
    }

    sql += ' ORDER BY Nombre';

    return await db.query(sql, params);
};

// ─── GET Cliente por ID ────────────────────────────────────────────────────
const getClienteById = async (id) => {
    const db = await getConnection();

    const Clientes = await db.query(
        `SELECT c.idCliente, c.NombreCompleto AS Nombre, c.RazonSocial,
                c.Direccion, c.DireccionFiscal, c.RFC, c.CodigoPostal, c.Observaciones, c.Activo,
                c.Tipo,
                c.RegimenesFiscales_idRegimenFiscal AS idRegimenFiscal,
                c.UsosCFDI_idUsoCFDI AS idUsoCFDI,
                rf.Descripcion AS RegimenFiscal, ucfdi.Descripcion AS UsoCFDI,
                (SELECT FIRST 1 cc.Telefono FROM ContactosClientes cc
                 WHERE cc.Clientes_idCliente = c.idCliente
                 ORDER BY cc.idContactoCliente) AS Telefono,
                (SELECT FIRST 1 cc.Correo FROM ContactosClientes cc
                 WHERE cc.Clientes_idCliente = c.idCliente
                 ORDER BY cc.idContactoCliente) AS Correo
         FROM Clientes c
         LEFT JOIN RegimenesFiscales rf ON rf.idRegimenFiscal = c.RegimenesFiscales_idRegimenFiscal
         LEFT JOIN UsosCFDI ucfdi ON ucfdi.idUsoCFDI = c.UsosCFDI_idUsoCFDI
         WHERE c.idCliente = ?`,
        [id]
    );

    if (!Clientes || Clientes.length === 0) return null;

    const Obras = await db.query(
        "SELECT * FROM Obras WHERE Clientes_idCliente = ?",
        [id]
    )

    const contactos = await db.query(
        `SELECT cc.idContactoCliente, cc.NombreCompleto, cc.Telefono, cc.Correo,
                cc.Observaciones
         FROM ContactosClientes cc
         WHERE cc.Clientes_idCliente = ?
         ORDER BY cc.idContactoCliente`,
        [id]
    );

    return {
        ...Clientes[0],
        Obras: Obras,
        contactos: contactos
    };
};

// ─── GET Obras de un Cliente ─────────────────────────────────────────────────
const getObrasByCliente = async (idCliente) => {
    const db = await getConnection();

    return await db.query(
        `SELECT o.idObra, o.Nombre, o.Direccion, o.Ancho, o.Alto, o.Profundidad,
                e.Nombre AS EstadoObra, o.FechaCreacion,
                o.FechaUltimaActualizacion
         FROM Obras o
         JOIN EstadosObra e ON e.idEstadoObra = o.EstadosObra_idEstadoObra
         WHERE o.Clientes_idCliente = ? AND o.Activo = TRUE
         ORDER BY o.FechaUltimaActualizacion DESC`,
        [idCliente]
    );
};

// ─── GET Trabajos y Obras de un Cliente ─────────────────────────────────────
// Devuelve el árbol "Trabajos/Obras" de la página de detalle de Cliente:
//   - trabajos: TRABAJO del cliente, cada uno con su lista de obras activas.
//   - obrasIndependientes: obras activas del cliente sin trabajo asociado
//     (TRABAJOS_IDTRABAJO IS NULL).
const getTrabajosByCliente = async (idCliente) => {
    const db = await getConnection();

    const trabajos = await db.query(
        `SELECT t.idTrabajo, t.Nombre, t.Descripcion, t.Direccion, t.FechaCreacion
         FROM TRABAJO t
         WHERE t.Clientes_idCliente = ?
         ORDER BY t.Nombre`,
        [idCliente]
    );

    const CON_OBRAS = `SELECT o.idObra, o.Nombre, o.Direccion, o.Ancho, o.Alto,
            o.Profundidad, o.TRABAJOS_IDTRABAJO, e.Nombre AS EstadoObra,
            o.FechaCreacion, o.FechaUltimaActualizacion
     FROM Obras o
     JOIN EstadosObra e ON e.idEstadoObra = o.EstadosObra_idEstadoObra
     WHERE o.Clientes_idCliente = ? AND o.Activo = TRUE`;

    const trabajosConObras = [];
    for (const t of trabajos ?? []) {
        const obras = await db.query(
            CON_OBRAS + ' AND o.TRABAJOS_IDTRABAJO = ? ORDER BY o.Nombre',
            [idCliente, t.idTrabajo]
        );
        trabajosConObras.push({ ...t, obras });
    }

    const obrasIndependientes = await db.query(
        CON_OBRAS + ' AND o.TRABAJOS_IDTRABAJO IS NULL ORDER BY o.FechaUltimaActualizacion DESC',
        [idCliente]
    );

    return { trabajos: trabajosConObras, obrasIndependientes };
};

// ─── INSERT ───────────────────────────────────────────────────────────────────
const createCliente = async ({
    Nombre, RazonSocial, Direccion, DireccionFiscal, RFC, idRegimenFiscal, CodigoPostal,
    idUsoCFDI, Observaciones, contactos, Correo, Telefono, tipo = 'persona', idTrabajadorCtx = 1
}) => {
    if (RFC && !validateRFC(RFC)) {
        throw new Error("Formato de RFC invalido (ej. AAAA123456XXX)");
    }
    if (Telefono && !validatePhone(Telefono)) {
        throw new Error("Formato de telefono invalido (10-15 digitos)");
    }
    if (Correo && !validateEmail(Correo)) {
        throw new Error("Formato de correo invalido");
    }
    if (CodigoPostal && !validateCP(CodigoPostal)) {
        throw new Error("Codigo postal invalido (5 digitos)");
    }
    if (!validateTipo(tipo)) {
        throw new Error("Tipo de cliente invalido (debe ser 'persona' o 'empresa')");
    }

    const tipoNormalizado = tipo ? String(tipo).toLowerCase() : 'persona';

    // Regla 2.4/2.8: una Persona requiere al menos telefono o correo.
    if (tipoNormalizado === 'persona') {
        if (!Telefono && !Correo) {
            throw new Error("Para una persona se requiere al menos un telefono o un correo");
        }
    }

    // Regla 2.8: una Empresa requiere al menos un contacto.
    const contactosLista = Array.isArray(contactos) ? contactos : [];
    if (tipoNormalizado === 'empresa' && contactosLista.length === 0) {
        throw new Error("Para una empresa se requiere al menos un contacto");
    }

    // Regla: una Empresa requiere RFC (persona: opcional, pero si se ingresa
    // debe cumplir el formato de 12-13 caracteres).
    if (tipoNormalizado === 'empresa' && !RFC) {
        throw new Error("Para una empresa el RFC es obligatorio");
    }

    const db = await getConnection();

    const txInsert = await db.transaction();

    try {
        await txInsert.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );
        // Resetea la bandera de edición de clientes para que los contactos que
        // se crean junto con el cliente generen su auditoría independiente.
        await txInsert.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CLIENTE_EDIT', '0') FROM RDB$DATABASE",
            []
        );
        const dirBuffer = Direccion != null ? Buffer.from(String(Direccion), "utf8") : null;
        const dirFiscalBuffer = DireccionFiscal != null ? Buffer.from(String(DireccionFiscal), "utf8") : null;
        const obsBuffer = Observaciones != null ? Buffer.from(String(Observaciones), "utf8") : null;
        const rows = await txInsert.executeReturning(
            `INSERT INTO Clientes (
                NombreCompleto, RazonSocial, Direccion, DireccionFiscal, RFC, CodigoPostal,
                RegimenesFiscales_idRegimenFiscal,
                UsosCFDI_idUsoCFDI, Observaciones, Tipo
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            RETURNING IdCliente`,
            [
                Nombre ?? null, RazonSocial ?? null, dirBuffer, dirFiscalBuffer, RFC ?? null,
                CodigoPostal ?? null,
                idRegimenFiscal ?? null, idUsoCFDI ?? null,
                obsBuffer, tipoNormalizado
            ]
        );

        const nuevoId = Array.isArray(rows) ? rows[0] : rows?.IDCLIENTE;

        const contactosFinales =
            contactosLista.length > 0
                ? contactosLista
                : (Telefono || Correo)
                    ? [{ NombreCompleto: Nombre, Telefono, Correo, Observaciones: null }]
                    : [];

        if (contactosFinales.length > 0) {
            for (const c of contactosFinales) {
                if (c.Telefono && !validatePhone(c.Telefono)) {
                    throw new Error(`Telefono invalido para contacto "${c.NombreCompleto}"`);
                }
                if (c.Correo && !validateEmail(c.Correo)) {
                    throw new Error(`Correo invalido para contacto "${c.NombreCompleto}"`);
                }
                // Regla: cada contacto debe tener al menos telefono o correo.
                const tieneDatos =
                    String(c.NombreCompleto ?? '').trim() !== '' ||
                    String(c.Observaciones ?? '').trim() !== '';
                if (tieneDatos && !c.Telefono && !c.Correo) {
                    throw new Error(`El contacto "${c.NombreCompleto || 'sin nombre'}" requiere al menos un telefono o un correo`);
                }
                await txInsert.execute(
                    `INSERT INTO ContactosClientes
                     (Clientes_idCliente, NombreCompleto, Telefono, Correo, Observaciones)
                     VALUES (?, ?, ?, ?, ?)`,
                    [nuevoId, c.NombreCompleto, c.Telefono ?? null, c.Correo ?? null,
                     c.Observaciones != null ? Buffer.from(String(c.Observaciones), "utf8") : null]
                );
            }
        }

        await txInsert.commit();
    } catch (err) {
        await txInsert.rollback();
        throw err;
    }

    return true;
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
const updateCliente = async (id, {
    Nombre, RazonSocial, Direccion, DireccionFiscal, RFC, Telefono, Correo, idRegimenFiscal, CodigoPostal,
    idUsoCFDI, Observaciones, contactos, tipo, idTrabajadorCtx = 1
}) => {
    if (RFC && !validateRFC(RFC)) {
        throw new Error("Formato de RFC invalido (12-13 caracteres, ej. AAAA123456XXX)");
    }
    if (Telefono && !validatePhone(Telefono)) {
        throw new Error("Formato de telefono invalido (10-15 digitos)");
    }
    if (Correo && !validateEmail(Correo)) {
        throw new Error("Formato de correo invalido");
    }
    if (CodigoPostal && !validateCP(CodigoPostal)) {
        throw new Error("Codigo postal invalido (5 digitos)");
    }
    if (!validateTipo(tipo)) {
        throw new Error("Tipo de cliente invalido (debe ser 'persona' o 'empresa')");
    }

    const tipoNormalizado = tipo ? String(tipo).toLowerCase() : null;
    const contactosLista = Array.isArray(contactos) ? contactos : null;
    if (tipoNormalizado === 'empresa' && contactosLista && contactosLista.length === 0) {
        throw new Error("Para una empresa se requiere al menos un contacto");
    }

    const db = await getConnection();

    const txRead = await db.transaction();
    let anterior;

    try {
        const rows = await txRead.query(
            `SELECT NombreCompleto, RazonSocial, Direccion, DireccionFiscal, RFC, RegimenesFiscales_idRegimenFiscal,
                    CodigoPostal, UsosCFDI_idUsoCFDI, Observaciones, Tipo
             FROM Clientes WHERE IdCliente = ?`,
            [id]
        );

        await txRead.commit();

        if (rows.length === 0) return null;

        anterior = rows[0];
        anterior.tipoNormalizado = String(anterior.Tipo ?? 'persona').toLowerCase();
        const tipoEfectivo = tipoNormalizado ?? anterior.tipoNormalizado;
        if (tipoEfectivo === 'empresa' && !RFC) {
            throw new Error("Para una empresa el RFC es obligatorio");
        }

    } catch (err) {
        await txRead.rollback();
        throw err;
    }

    const txUpdate = await db.transaction();
    let idAudit = null;

try {
        await txUpdate.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );
        // Marca el inicio de la edición de un cliente para que los triggered
        // de ContactosClientes registren sus cambios dentro de la auditoría
        // principal (LAST_AUDIT_ID) en lugar de crear auditorías separadas.
        await txUpdate.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CLIENTE_EDIT', '1') FROM RDB$DATABASE",
            []
        );
        const dirBuffer = Direccion != null ? Buffer.from(String(Direccion), "utf8") : null;
        const dirFiscalBuffer = DireccionFiscal != null ? Buffer.from(String(DireccionFiscal), "utf8") : null;
        const obsBuffer = Observaciones != null ? Buffer.from(String(Observaciones), "utf8") : null;
        await txUpdate.execute(
            `UPDATE Clientes
             SET NombreCompleto = ?, RazonSocial = ?, Direccion = ?, DireccionFiscal = ?, RFC = ?,
                 RegimenesFiscales_idRegimenFiscal = ?, CodigoPostal = ?,
                 UsosCFDI_idUsoCFDI = ?, Observaciones = ?, Tipo = ?
             WHERE IdCliente = ?`,
            [
                Nombre ?? null, RazonSocial ?? null, dirBuffer, dirFiscalBuffer, RFC ?? null,
                idRegimenFiscal ?? null, CodigoPostal ?? null,
                idUsoCFDI ?? null, obsBuffer, tipoNormalizado, id
            ]
        );

        // Recupera el idAuditoria del UPDATE de cabecera ANTES de tocar los
        // contactos, porque los triggers de ContactosClientes reutilizan
        // LAST_AUDIT_ID.
        const auditRows = await txUpdate.query(`
            SELECT RDB$GET_CONTEXT('USER_SESSION', 'LAST_AUDIT_ID') AS ID
            FROM RDB$DATABASE
        `);
        idAudit = auditRows?.[0]?.ID ?? null;

        // Sincronización diferencial de contactos: solo se tocan las filas que
        // realmente cambiaron. Las filas sin cambios no se borran ni se vuelven
        // a insertar, evitando auditorías masivas de INSERT/DELETE en cada UPDATE.
        if (contactosLista) {
            const existentes = await txUpdate.query(
                `SELECT idContactoCliente, NombreCompleto, Telefono, Correo, Observaciones
                 FROM ContactosClientes WHERE Clientes_idCliente = ?`,
                [id]
            );

            const consumidos = new Set();
            const firmasExistentes = new Map(); // firma -> [filas]

            const firma = (c) =>
                [String(c.NombreCompleto ?? '').trim().toLowerCase(),
                 String(c.Telefono ?? '').trim(),
                 String(c.Correo ?? '').trim().toLowerCase()].join('|');

            for (const e of existentes ?? []) {
                const f = firma({
                    NombreCompleto: e.NOMBRECOMPLETO,
                    Telefono: e.TELEFONO,
                    Correo: e.CORREO
                });
                if (!firmasExistentes.has(f)) firmasExistentes.set(f, []);
                firmasExistentes.get(f).push(e);
            }

            for (const c of contactosLista) {
                if (c.Telefono && !validatePhone(c.Telefono)) {
                    await txUpdate.rollback();
                    throw new Error(`Telefono invalido para contacto "${c.NombreCompleto}"`);
                }
                if (c.Correo && !validateEmail(c.Correo)) {
                    await txUpdate.rollback();
                    throw new Error(`Correo invalido para contacto "${c.NombreCompleto}"`);
                }
                // Regla: cada contacto debe tener al menos telefono o correo.
                const tieneDatos =
                    String(c.NombreCompleto ?? '').trim() !== '' ||
                    String(c.Observaciones ?? '').trim() !== '';
                if (tieneDatos && !c.Telefono && !c.Correo) {
                    await txUpdate.rollback();
                    throw new Error(`El contacto "${c.NombreCompleto || 'sin nombre'}" requiere al menos un telefono o un correo`);
                }

                // 1) Coincidencia explícita por id (cuando el frontend la envía).
                let match = c.idContactoCliente != null
                    ? (existentes ?? []).find(
                        (e) => String(e.IDCONTACTOCLIENTE ?? e.idContactoCliente) === String(c.idContactoCliente)
                    )
                    : null;

                // 2) Si no, coincidencia por contenido (misma firma) sin consumir.
                if (!match) {
                    const filas = firmasExistentes.get(firma(c)) ?? [];
                    match = filas.find((e) => !consumidos.has(String(e.IDCONTACTOCLIENTE ?? e.idContactoCliente)));
                }

                if (!match) {
                    // Contacto nuevo: INSERT.
                    await txUpdate.execute(
                        `INSERT INTO ContactosClientes
                         (Clientes_idCliente, NombreCompleto, Telefono, Correo, Observaciones)
                         VALUES (?, ?, ?, ?, ?)`,
                        [id, c.NombreCompleto, c.Telefono ?? null, c.Correo ?? null,
                         c.Observaciones != null ? Buffer.from(String(c.Observaciones), "utf8") : null]
                    );
                    continue;
                }

                consumidos.add(String(match.IDCONTACTOCLIENTE ?? match.idContactoCliente));

                const idContacto = match.IDCONTACTOCLIENTE ?? match.idContactoCliente;
                const obsExistentes = match.OBSERVACIONES != null && !Buffer.isBuffer(match.OBSERVACIONES)
                    ? String(match.OBSERVACIONES)
                    : (Buffer.isBuffer(match.OBSERVACIONES) ? match.OBSERVACIONES.toString("utf8") : '');

                const iguales =
                    String(match.NOMBRECOMPLETO ?? '') === String(c.NombreCompleto ?? '')
                    && String(match.TELEFONO ?? '') === String(c.Telefono ?? '')
                    && String(match.CORREO ?? '') === String(c.Correo ?? '')
                    && obsExistentes === String(c.Observaciones ?? '');

                if (!iguales) {
                    // Solo se actualiza si efectivamente cambió.
                    await txUpdate.execute(
                        `UPDATE ContactosClientes
                         SET NombreCompleto = ?, Telefono = ?, Correo = ?, Observaciones = ?
                         WHERE IdContactoCliente = ?`,
                        [c.NombreCompleto, c.Telefono ?? null, c.Correo ?? null,
                         c.Observaciones != null ? Buffer.from(String(c.Observaciones), "utf8") : null, idContacto]
                    );
                }
            }

            // Elimina los contactos que ya no están en la lista.
            for (const e of existentes ?? []) {
                const k = String(e.IDCONTACTOCLIENTE ?? e.idContactoCliente);
                if (!consumidos.has(k)) {
                    await txUpdate.execute(
                        "DELETE FROM ContactosClientes WHERE IdContactoCliente = ?",
                        [e.IDCONTACTOCLIENTE ?? e.idContactoCliente]
                    );
                }
            }
        } else if (Telefono || Correo) {
            const principal = await txUpdate.query(
                `SELECT FIRST 1 IdContactoCliente FROM ContactosClientes
                 WHERE Clientes_idCliente = ? ORDER BY IdContactoCliente`,
                [id]
            );
            const idContacto = principal[0]?.IDCONTACTOCLIENTE;
            if (idContacto) {
                await txUpdate.execute(
                    `UPDATE ContactosClientes
                     SET Telefono = ?, Correo = ?
                     WHERE IdContactoCliente = ?`,
                    [Telefono ?? null, Correo ?? null, idContacto]
                );
            } else {
                await txUpdate.execute(
                    `INSERT INTO ContactosClientes
                     (Clientes_idCliente, NombreCompleto, Telefono, Correo, Observaciones)
                     VALUES (?, ?, ?, ?, ?)`,
                    [id, Nombre ?? null, Telefono ?? null, Correo ?? null, null]
                );
            }
        }

        // Finaliza el modo edición de cliente: los triggers de ContactosClientes
        // ya no deben redirigir sus cambios a LAST_AUDIT_ID.
        await txUpdate.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CLIENTE_EDIT', '0') FROM RDB$DATABASE",
            []
        );
        await txUpdate.commit();

    } catch (err) {
        await txUpdate.rollback();
        throw err;
    }

    // El idAuditoria ya se capturó dentro de la transacción, inmediatamente
    // después del UPDATE de cabecera y ANTES de tocar los contactos.
    const comparacion = [
        { campo: 'Nombre', anterior: anterior.NOMBRECOMPLETO, nuevo: Nombre ?? null },
        { campo: 'RazonSocial', anterior: anterior.RAZONSOCIAL, nuevo: RazonSocial ?? null },
        { campo: 'Direccion', anterior: anterior.DIRECCION, nuevo: Direccion ?? null },
        { campo: 'DireccionFiscal', anterior: anterior.DIRECCIONFISCAL, nuevo: DireccionFiscal ?? null },
        { campo: 'RFC', anterior: anterior.RFC, nuevo: RFC ?? null },
        { campo: 'RegimenesFiscales_idRegimenFiscal', anterior: anterior.REGIMENESFISCALES_IDREGIMENFISCAL, nuevo: idRegimenFiscal ?? null },
        { campo: 'CodigoPostal', anterior: anterior.CODIGOPOSTAL, nuevo: CodigoPostal ?? null },
        { campo: 'UsosCFDI_idUsoCFDI', anterior: anterior.USOSCFDI_IDUSOCFDI, nuevo: idUsoCFDI ?? null },
        { campo: 'Observaciones', anterior: anterior.OBSERVACIONES, nuevo: Observaciones ?? null },
        { campo: 'Tipo', anterior: anterior.TIPO, nuevo: tipoNormalizado },
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
const deleteCliente = async (id, idTrabajadorCtx = 1) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const rows = await transaction.query(
            "SELECT idCliente FROM Clientes WHERE IdCliente = ? AND Activo = TRUE",
            [id]
        );

        if (!rows || rows.length === 0) {
            await transaction.rollback();
            return null;
        }

        await transaction.execute(
            "UPDATE Clientes SET Activo = FALSE WHERE IdCliente = ?",
            [id]
        );

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return true;
};

// ─── REACTIVAR (soft) ────────────────────────────────────────────────────────
const reactivarCliente = async (id, idTrabajadorCtx = 1) => {
    const db = await getConnection();
    const transaction = await db.transaction();

    try {
        await transaction.execute(
            "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
            [String(idTrabajadorCtx)]
        );

        const rows = await transaction.query(
            "SELECT idCliente FROM Clientes WHERE IdCliente = ? AND Activo = FALSE",
            [id]
        );

        if (!rows || rows.length === 0) {
            await transaction.rollback();
            return null;
        }

        await transaction.execute(
            "UPDATE Clientes SET Activo = TRUE WHERE IdCliente = ?",
            [id]
        );

        await transaction.commit();

    } catch (err) {
        await transaction.rollback();
        throw err;
    }

    return true;
};

export default {
    getRegimenesFiscales,
    getUsosCFDI,
    getClientes,
    getClienteById,
    getObrasByCliente,
    getTrabajosByCliente,
    createCliente,
    updateCliente,
    deleteCliente,
    reactivarCliente,
    validateRFC,
    validatePhone,
    validateEmail
};