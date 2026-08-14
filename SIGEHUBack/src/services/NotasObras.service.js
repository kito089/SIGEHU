import { getConnection } from "../config/db.js";

// ─── CREATE ─────────────────────────────────────────────────────────────────
// Nota es BLOB SUB_TYPE TEXT: el driver exige Buffer, no string (igual que
// Observaciones en Trabajadores). El INSERT usa executeReturning porque query()
// abre un cursor, inválido para INSERT...RETURNING.
// Valida que la obra, el estado y el trabajador existan (defensa en profundidad).
const createNota = async ({ idObra, idEstadoObra, idTrabajador, nota }) => {
    const db = await getConnection();

    const validaciones = [
        {
            tabla: 'Obras',
            columna: 'idObra',
            valor: idObra,
            activo: true,
            mensaje: 'La obra no existe o está inactiva'
        },
        {
            tabla: 'EstadosObra',
            columna: 'idEstadoObra',
            valor: idEstadoObra,
            activo: false,
            mensaje: 'El estado de obra no existe'
        },
        {
            tabla: 'Trabajadores',
            columna: 'idTrabajador',
            valor: idTrabajador,
            activo: true,
            mensaje: 'El trabajador no existe o está inactivo'
        }
    ];

    for (const v of validaciones) {
        const fila = await db.query(
            `SELECT 1 FROM ${v.tabla} WHERE ${v.columna} = ?${v.activo ? ' AND Activo = TRUE' : ''}`,
            [v.valor]
        );
        if (!fila || fila.length === 0) {
            const err = new Error(v.mensaje);
            err.status = 400;
            throw err;
        }
    }

    const notaBuffer = nota != null ? Buffer.from(String(nota), "utf8") : null;

    const rows = await db.executeReturning(
        `INSERT INTO NotasObras (Obras_idObra, EstadosObra_idEstadoObra, Trabajadores_idTrabajador, Nota)
         VALUES (?, ?, ?, ?)
         RETURNING idNotaObra`,
        [idObra, idEstadoObra, idTrabajador, notaBuffer]
    );

    let raw = Array.isArray(rows) && rows.length > 0 ? rows[0] : rows;
    if (raw != null && typeof raw === 'object') {
        raw = raw.IDNOTAOBRA;
    }
    return raw;
};

// ─── GET por obra ────────────────────────────────────────────────────────────
// Incluye la procedencia (autor y rol) para que la vista de fabricación pueda
// agrupar "Notas del administrador" antes que "Notas del levantamiento" y
// conservar la autoría de cada registro.
const getNotasByObra = async (idObra) => {
    const db = await getConnection();

    return await db.query(
        `SELECT n.*, t.NombreCompleto AS AutorNombre, tu.Nombre AS RolAutor
         FROM NotasObras n
         JOIN Trabajadores t ON t.idTrabajador = n.Trabajadores_idTrabajador
         LEFT JOIN TiposUsuarios tu ON tu.idTipoUsuario = t.TiposUsuarios_idTipoUsuario
         WHERE n.Obras_idObra = ?
         ORDER BY n.FechaCreacion DESC, n.idNotaObra DESC`,
        [idObra]
    );
};

// ─── GET por ID ──────────────────────────────────────────────────────────────
const getNotaById = async (id) => {
    const db = await getConnection();

    const rows = await db.query(
        "SELECT * FROM NotasObras WHERE idNotaObra = ?",
        [id]
    );

    return rows[0] ?? null;
};

// ─── UPDATE ──────────────────────────────────────────────────────────────────
const updateNota = async (id, { nota }) => {
    const db = await getConnection();

    const existe = await getNotaById(id);
    if (!existe) return null;

    const notaBuffer = nota != null ? Buffer.from(String(nota), "utf8") : null;
    await db.execute(
        "UPDATE NotasObras SET Nota = ? WHERE idNotaObra = ?",
        [notaBuffer, id]
    );

    return true;
};

// ─── DELETE (hard, no tiene Activo) ──────────────────────────────────────────
const deleteNota = async (id) => {
    const db = await getConnection();

    const existe = await getNotaById(id);
    if (!existe) return null;

    await db.execute(
        "DELETE FROM NotasObras WHERE idNotaObra = ?",
        [id]
    );

    return true;
};

export default {
    createNota,
    getNotasByObra,
    getNotaById,
    updateNota,
    deleteNota
};