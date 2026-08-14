// Aplicador idempotente de la migración de la Ronda 4 (Detalle de Obra).
//
// Corrige los huecos del snapshot de BD que rompen el flujo de doble validación:
//   1. Estado "Pendiente de aceptación" (8) en EstadosObra (lo exige 6.1/6.2:
//      sin él, la clasificación de etapas colapsa a 'futura' y no hay aceptación).
//   2. Permiso granular "recibir_pago" en CamposPermiso (1.5).
//   3. SP_CAMBIAR_ESTADO_OBRA recreado si falta en la BD viva.
//   4. Columnas de Obras (fechas de etapa + medidas) si el snapshot las omitió.
//
// Uso: node src/scripts/apply-ronda4-migration.js
import { getConnection, disconnectDB } from "../config/db.js";

const SP_CAMBIAR_ESTADO_OBRA = `CREATE OR ALTER PROCEDURE SP_CAMBIAR_ESTADO_OBRA (
    pIdObra          INTEGER,
    pNuevoEstado     INTEGER
)
RETURNS (
    oExito   SMALLINT,
    oMensaje VARCHAR(200)
)
AS
    DECLARE VARIABLE vEstadoActual INTEGER;
    DECLARE VARIABLE vTransicionValida SMALLINT;
BEGIN
    SELECT EstadosObra_idEstadoObra FROM Obras WHERE idObra = :pIdObra
    INTO :vEstadoActual;

    IF (vEstadoActual IS NULL) THEN
    BEGIN
        oExito   = 0;
        oMensaje = 'Obra no encontrada.';
        SUSPEND;
        EXIT;
    END

    IF (vEstadoActual = 7) THEN
    BEGIN
        oExito   = 0;
        oMensaje = 'Una obra finalizada no puede cambiar de estado.';
        SUSPEND;
        EXIT;
    END

    IF (pNuevoEstado = vEstadoActual) THEN
    BEGIN
        oExito   = 0;
        oMensaje = 'La obra ya se encuentra en ese estado.';
        SUSPEND;
        EXIT;
    END

    vTransicionValida = 0;

    IF (vEstadoActual = 1 AND pNuevoEstado = 2) THEN vTransicionValida = 1;
    IF (vEstadoActual = 2 AND pNuevoEstado = 3) THEN vTransicionValida = 1;
    IF (vEstadoActual = 3 AND pNuevoEstado = 4) THEN vTransicionValida = 1;
    IF (vEstadoActual = 4 AND pNuevoEstado = 5) THEN vTransicionValida = 1;
    IF (vEstadoActual = 5 AND pNuevoEstado = 6) THEN vTransicionValida = 1;
    IF (vEstadoActual = 5 AND pNuevoEstado = 7) THEN vTransicionValida = 1;
    IF (vEstadoActual = 6 AND pNuevoEstado = 7) THEN vTransicionValida = 1;
    IF (vEstadoActual = 2 AND pNuevoEstado = 8) THEN vTransicionValida = 1;
    IF (vEstadoActual = 3 AND pNuevoEstado = 8) THEN vTransicionValida = 1;
    IF (vEstadoActual = 4 AND pNuevoEstado = 8) THEN vTransicionValida = 1;
    IF (vEstadoActual = 8 AND pNuevoEstado = 3) THEN vTransicionValida = 1;
    IF (vEstadoActual = 8 AND pNuevoEstado = 4) THEN vTransicionValida = 1;
    IF (vEstadoActual = 8 AND pNuevoEstado = 5) THEN vTransicionValida = 1;

    IF (vEstadoActual = 2 AND pNuevoEstado = 1) THEN vTransicionValida = 1;
    IF (vEstadoActual = 3 AND pNuevoEstado = 2) THEN vTransicionValida = 1;
    IF (vEstadoActual = 4 AND pNuevoEstado = 3) THEN vTransicionValida = 1;
    IF (vEstadoActual = 5 AND pNuevoEstado = 4) THEN vTransicionValida = 1;
    IF (vEstadoActual = 6 AND pNuevoEstado = 5) THEN vTransicionValida = 1;

    IF (vTransicionValida = 0) THEN
    BEGIN
        oExito   = 0;
        oMensaje = 'Transición de estado no permitida del estado '
                   || CAST(vEstadoActual AS VARCHAR(3)) || ' al '
                   || CAST(pNuevoEstado AS VARCHAR(3)) || '.';
        SUSPEND;
        EXIT;
    END

    UPDATE Obras
    SET EstadosObra_idEstadoObra = :pNuevoEstado
    WHERE idObra = :pIdObra;

    oExito   = 1;
    oMensaje = 'Estado actualizado correctamente.';
    SUSPEND;
END`;

const OBRAS_COLUMNS = [
    { column: 'FECHALEVANTAMIENTO', ddl: 'ALTER TABLE Obras ADD FechaLevantamiento TIMESTAMP' },
    { column: 'FECHAFABRICACION', ddl: 'ALTER TABLE Obras ADD FechaFabricacion TIMESTAMP' },
    { column: 'FECHAINSTALACION', ddl: 'ALTER TABLE Obras ADD FechaInstalacion TIMESTAMP' },
    { column: 'MEDIDASENVIADAS', ddl: 'ALTER TABLE Obras ADD MedidasEnviadas BOOLEAN DEFAULT FALSE NOT NULL' },
    { column: 'MEDIDASRESPONSABLEIDTRABAJADOR', ddl: 'ALTER TABLE Obras ADD MedidasResponsableIdTrabajador INTEGER' },
    { column: 'MEDIDASENVIADASPOR', ddl: 'ALTER TABLE Obras ADD MedidasEnviadasPor INTEGER' },
    { column: 'MEDIDASENVIADASFECHA', ddl: 'ALTER TABLE Obras ADD MedidasEnviadasFecha TIMESTAMP' },
];

async function columnaExiste(db, relation, column) {
    const rows = await db.query(
        `SELECT 1 FROM RDB$RELATION_FIELDS
         WHERE RDB$RELATION_NAME = ? AND RDB$FIELD_NAME = ?`,
        [relation, column]
    );
    return rows && rows.length > 0;
}

async function main() {
    const db = await getConnection();
    let creados = 0;

    // 1. Estado 8 "Pendiente de aceptación".
    const est = await db.query(`SELECT 1 FROM EstadosObra WHERE idEstadoObra = 8`, []);
    if (est && est.length > 0) {
        console.log('[migración] Ya existe: Estado 8 "Pendiente de aceptación"');
    } else {
        await db.execute(
            `INSERT INTO EstadosObra (idEstadoObra, Nombre, Orden) VALUES (8, 'Pendiente de aceptación', 8)`,
            []
        );
        creados += 1;
        console.log('[migración] Creado: Estado 8 "Pendiente de aceptación"');
    }

    // 2. Permiso granular "recibir_pago".
    const cp = await db.query(
        `SELECT 1 FROM CamposPermiso WHERE NombreCampo = 'recibir_pago'`,
        []
    );
    if (cp && cp.length > 0) {
        console.log('[migración] Ya existe: Permiso granular "recibir_pago"');
    } else {
        await db.execute(
            `INSERT INTO CamposPermiso (NombreCampo, Descripcion) VALUES ('recibir_pago', 'Permiso para registrar/recibir pagos de la obra')`,
            []
        );
        creados += 1;
        console.log('[migración] Creado: Permiso granular "recibir_pago"');
    }

    // 3. SP_CAMBIAR_ESTADO_OBRA.
    // Se usa CREATE OR ALTER SIEMPRE (no solo si falta): el snapshot traía una
    // versión anterior del SP sin las transiciones del flujo de doble validación
    // (2/3/4 -> 8 y 8 -> 3/4/5). Si no se reemplaza, la finalización de etapa del
    // trabajador falla con "Transición de estado no permitida del estado X al 8".
    await db.execute(SP_CAMBIAR_ESTADO_OBRA, []);
    creados += 1;
    console.log('[migración] Reemplazado: SP_CAMBIAR_ESTADO_OBRA (CREATE OR ALTER)');

    // 4. Columnas de Obras (fechas + medidas) defensivas.
    for (const c of OBRAS_COLUMNS) {
        const existe = await columnaExiste(db, 'OBRAS', c.column);
        if (existe) {
            console.log(`[migración] Ya existe: columna Obras.${c.column}`);
        } else {
            await db.execute(c.ddl, []);
            creados += 1;
            console.log(`[migración] Creada: columna Obras.${c.column}`);
        }
    }

    await disconnectDB();
    console.log(`[migración] Completado. Objetos creados: ${creados}`);
    process.exit(0);
}

main().catch((err) => {
    console.error("[migración] Error:", err?.message || err);
    process.exit(1);
});