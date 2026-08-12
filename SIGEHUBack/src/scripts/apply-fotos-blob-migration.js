// Aplicador idempotente de la migración de FotosObras a BLOB binario.
//
// Agrega la columna Foto (BLOB SUB_TYPE BINARY) y ContentType a la tabla
// FotosObras para persistir el contenido binario de la fotografía dentro de la
// BD (decisión explícita del proyecto) además de la ruta relativa existente
// (RutaArchivo), que se conserva para el servido estático vía /uploads.
//
// Uso: node src/scripts/apply-fotos-blob-migration.js
import { getConnection, disconnectDB } from "../config/db.js";

const STEPS = [
    {
        name: "Columna ContentType en FotosObras",
        check: `SELECT 1 FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'FOTOSOBRAS'
                  AND RDB$FIELD_NAME = 'CONTENTTYPE'`,
        create: `ALTER TABLE FotosObras ADD ContentType VARCHAR(50)`
    },
    {
        name: "Columna Foto (BLOB binario) en FotosObras",
        check: `SELECT 1 FROM RDB$RELATION_FIELDS
                WHERE RDB$RELATION_NAME = 'FOTOSOBRAS'
                  AND RDB$FIELD_NAME = 'FOTO'`,
        create: `ALTER TABLE FotosObras ADD Foto BLOB SUB_TYPE BINARY`
    }
];

async function main() {
    const db = await getConnection();
    let creados = 0;

    for (const step of STEPS) {
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