import { getConnection } from "../config/db.js";

const getIndicadores = async () => {
    const db = await getConnection();
    return await db.query(
        "SELECT * FROM VW_INDICADORES_DASHBOARD ORDER BY Orden",
        []
    );
};

// Resumen de KPIs superiores del Dashboard: obras activas, finalizadas el mes
// en curso y garantías cerradas el mes en curso.
const getResumen = async () => {
    const db = await getConnection();
    const rows = await db.query(
        `SELECT
            (SELECT COUNT(*) FROM Obras
             WHERE Activo = TRUE AND EstadosObra_idEstadoObra < 7) AS OBRAS_ACTIVAS,
            (SELECT COUNT(*) FROM Obras
             WHERE Activo = TRUE AND EstadosObra_idEstadoObra = 7
               AND EXTRACT(YEAR FROM FechaUltimaActualizacion) = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)
               AND EXTRACT(MONTH FROM FechaUltimaActualizacion) = EXTRACT(MONTH FROM CURRENT_TIMESTAMP)) AS FINALIZADAS_MES,
            (SELECT COUNT(*) FROM Garantias
             WHERE Activo = TRUE AND EstadosGarantia_idEstadoGarantia = 3
               AND EXTRACT(YEAR FROM FechaUltimaActualizacion) = EXTRACT(YEAR FROM CURRENT_TIMESTAMP)
               AND EXTRACT(MONTH FROM FechaUltimaActualizacion) = EXTRACT(MONTH FROM CURRENT_TIMESTAMP)) AS GARANTIAS_CERRADAS_MES
         FROM RDB$DATABASE`,
        []
    );
    return {
        obrasActivas: Number(rows?.[0]?.OBRAS_ACTIVAS ?? 0),
        finalizadasMes: Number(rows?.[0]?.FINALIZADAS_MES ?? 0),
        garantiasCerradasMes: Number(rows?.[0]?.GARANTIAS_CERRADAS_MES ?? 0),
    };
};

const getKanban = async () => {
    const db = await getConnection();
    return await db.query(
        "SELECT * FROM VW_OBRAS_KANBAN",
        []
    );
};

const getActivityFeed = async (limit = 20) => {
    const db = await getConnection();

    return await db.query(
        `SELECT a.idAuditoria, a.Fecha, a.Tabla, a.Accion, a.Descripcion,
                a.RegistroAfectado,
                t.NombreCompleto AS Trabajador,
                (SELECT LIST(Campo || ': ' ||
                    COALESCE(ValorAnterior, '(nuevo)') || ' -> ' ||
                    COALESCE(ValorNuevo, '(' || a.Accion || ')')
                ) FROM AuditoriasDetalles ad
                WHERE ad.Auditorias_idAuditoria = a.idAuditoria
                ) AS DetallesCambios
         FROM Auditorias a
         JOIN Trabajadores t ON t.idTrabajador = a.Trabajadores_idTrabajador
         ORDER BY a.Fecha DESC
         ROWS ?`,
        [limit]
    );
};

const getCalendarEvents = async () => {
    const db = await getConnection();

    return await db.query(
        `SELECT 'Obra' AS TipoEvento, o.idObra, o.Nombre AS NombreObra,
                c.NombreCompleto AS NombreCliente,
                e.Nombre AS EstadoObra,
                o.FechaUltimaActualizacion AS FechaEvento
         FROM Obras o
         JOIN Clientes c ON c.idCliente = o.Clientes_idCliente
         JOIN EstadosObra e ON e.idEstadoObra = o.EstadosObra_idEstadoObra
         WHERE o.Activo = TRUE AND c.Activo = TRUE
         UNION ALL
         SELECT 'Garantia', g.Obras_idObra, o.Nombre,
                c.NombreCompleto, 'Garantia', g.FechaCreacion
         FROM Garantias g
         JOIN Obras o ON o.idObra = g.Obras_idObra
         JOIN Clientes c ON c.idCliente = o.Clientes_idCliente
         WHERE g.Activo = TRUE
         ORDER BY 6 DESC
         ROWS 200`,
        []
    );
};

export default {
    getIndicadores,
    getResumen,
    getKanban,
    getActivityFeed,
    getCalendarEvents
};