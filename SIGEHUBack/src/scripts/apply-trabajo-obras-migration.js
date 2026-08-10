// Aplicador idempotente de la migración de Trabajos y Obras (pestaña
// Trabajos/Obras del detalle de Cliente).
//
// Crea el procedimiento SP_INSERTAR_TRABAJO para registrar un trabajo
// (grupo de obras) asociado a un cliente. La tabla TRABAJO, el vínculo
// TRABAJOS_IDTRABAJO y SP_INSERTAR_OBRA ya existen (migración
// apply-obra-fecha-inicio-migration), por lo que aquí solo se re-crea con el
// parámetro de medidas incluido y se asegura el SP de inserción de trabajos.
//
// Uso: node src/scripts/apply-trabajo-obras-migration.js
import { getConnection, disconnectDB } from "../config/db.js";

// El SP_INSERTAR_OBRA se re-crea SIEMPRE con CREATE OR ALTER (idempotente por
// diseño) para incorporar las medidas estimadas (Ancho/Alto/Profundidad).
const SP_OBRA_SQL = `CREATE OR ALTER PROCEDURE SP_INSERTAR_OBRA (
    pIdCliente INTEGER,
    pNombre    VARCHAR(100),
    pDireccion BLOB SUB_TYPE TEXT,
    pIdTrabajo INTEGER,
    pFechaInicio TIMESTAMP,
    pAncho     DECIMAL(10,2),
    pAlto      DECIMAL(10,2),
    pProfundidad DECIMAL(10,2)
)
RETURNS (
    oIdObra INTEGER
)
AS
BEGIN
    INSERT INTO Obras (Clientes_idCliente, Nombre, Direccion, TRABAJOS_IDTRABAJO, FechaInicio, Ancho, Alto, Profundidad, EstadosObra_idEstadoObra)
    VALUES (:pIdCliente, :pNombre, :pDireccion, :pIdTrabajo, :pFechaInicio, :pAncho, :pAlto, :pProfundidad, 1)
    RETURNING idObra INTO :oIdObra;

    SUSPEND;
END`;

const SP_TRABAJO_SQL = `CREATE OR ALTER PROCEDURE SP_INSERTAR_TRABAJO (
    pIdCliente    INTEGER,
    pNombre       VARCHAR(100),
    pDescripcion  BLOB SUB_TYPE TEXT,
    pDireccion    BLOB SUB_TYPE TEXT
)
RETURNS (
    oIdTrabajo INTEGER
)
AS
BEGIN
    INSERT INTO TRABAJO (Clientes_idCliente, Nombre, Descripcion, Direccion)
    VALUES (:pIdCliente, :pNombre, :pDescripcion, :pDireccion)
    RETURNING idTrabajo INTO :oIdTrabajo;

    SUSPEND;
END`;

async function main() {
    const db = await getConnection();

    console.log("[migración] Actualizando SP_INSERTAR_OBRA (medidas, CREATE OR ALTER)...");
    await db.execute(SP_OBRA_SQL, []);

    console.log("[migración] Creando SP_INSERTAR_TRABAJO (CREATE OR ALTER)...");
    await db.execute(SP_TRABAJO_SQL, []);

    await disconnectDB();
    console.log("[migración] Completado.");
    process.exit(0);
}

main().catch((err) => {
    console.error("[migración] Error:", err?.message || err);
    process.exit(1);
});