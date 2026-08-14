// Aplicador idempotente de la migración del estado de medidas en Obras.
// Uso: node src/scripts/apply-obra-medidas-enviadas-migration.js
// Agrega a Obras el estado real de las medidas de levantamiento:
//   - MedidasEnviadas        BOOLEAN  → Pendiente (FALSE) / Enviada (TRUE)
//   - MedidasResponsableIdTrabajador → responsable único (primer trabajador
//     que envía medidas; no cambia si otro intenta enviarlas después)
//   - MedidasEnviadasPor             → quién marcó la medida como enviada
//   - MedidasEnviadasFecha  TIMESTAMP → cuándo se enviaron
// Verifica cada columna contra RDB$RELATION_FIELDS antes de crearla (idempotente).
import { getConnection, disconnectDB } from "../config/db.js";

const COLUMNAS = [
    {
        name: "Columna MedidasEnviadas en Obras",
        check: `SELECT 1 FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'OBRAS'
                  AND RDB$FIELD_NAME = 'MEDIDASENVIADAS'`,
        create: `ALTER TABLE Obras ADD MedidasEnviadas BOOLEAN DEFAULT FALSE NOT NULL`
    },
    {
        name: "Columna MedidasResponsableIdTrabajador en Obras",
        check: `SELECT 1 FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'OBRAS'
                  AND RDB$FIELD_NAME = 'MEDIDASRESPONSABLEIDTRABAJADOR'`,
        create: `ALTER TABLE Obras ADD MedidasResponsableIdTrabajador INTEGER`
    },
    {
        name: "Columna MedidasEnviadasPor en Obras",
        check: `SELECT 1 FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'OBRAS'
                  AND RDB$FIELD_NAME = 'MEDIDASENVIADASPOR'`,
        create: `ALTER TABLE Obras ADD MedidasEnviadasPor INTEGER`
    },
    {
        name: "Columna MedidasEnviadasFecha en Obras",
        check: `SELECT 1 FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'OBRAS'
                  AND RDB$FIELD_NAME = 'MEDIDASENVIADASFECHA'`,
        create: `ALTER TABLE Obras ADD MedidasEnviadasFecha TIMESTAMP`
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