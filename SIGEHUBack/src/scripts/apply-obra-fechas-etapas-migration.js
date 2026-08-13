// Aplicador idempotente de la migración de fechas por etapa en Obras.
// Uso: node src/scripts/apply-obra-fechas-etapas-migration.js
// Verifica cada columna contra RDB$RELATION_FIELDS antes de crearla. No recrea
// procedimientos: las fechas se actualizan vía PATCH /Obras/:id/fechas-etapas.
import { getConnection, disconnectDB } from "../config/db.js";

const COLUMNAS = [
    {
        name: "Columna FechaLevantamiento en Obras",
        check: `SELECT 1 FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'OBRAS'
                  AND RDB$FIELD_NAME = 'FECHALEVANTAMIENTO'`,
        create: `ALTER TABLE Obras ADD FechaLevantamiento TIMESTAMP`
    },
    {
        name: "Columna FechaFabricacion en Obras",
        check: `SELECT 1 FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'OBRAS'
                  AND RDB$FIELD_NAME = 'FECHAFABRICACION'`,
        create: `ALTER TABLE Obras ADD FechaFabricacion TIMESTAMP`
    },
    {
        name: "Columna FechaInstalacion en Obras",
        check: `SELECT 1 FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'OBRAS'
                  AND RDB$FIELD_NAME = 'FECHAINSTALACION'`,
        create: `ALTER TABLE Obras ADD FechaInstalacion TIMESTAMP`
    }
];

async function main() {
    const db = await getConnection();
    let creados = 0;

    for (const step of COLUMNAS) {
        const existe = await db.query(step.check, []);
        if (existe && existe.length > 0) {
            console.log(`[migración] Ya existe: ${step.name}`);
            continue;
        }
        await db.execute(step.create, []);
        creados += 1;
        console.log(`[migración] Creado: ${step.name}`);
    }

    await disconnectDB();
    console.log(`[migración] Completado. Objetos creados: ${creados}`);
    process.exit(0);
}

main().catch((err) => {
    console.error("[migración] Error:", err?.message || err);
    process.exit(1);
});