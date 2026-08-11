import { getConnection, disconnectDB } from "../config/db.js";

const TABLES = [
    'CLIENTES', 'CONTACTOSCLIENTES', 'TRABAJO', 'OBRAS', 'TRABAJADORES',
    'MATERIALES', 'PROVEEDORES', 'PROVEEDORES_HAS_MATERIALES',
    'COMPRAS', 'DETALLESCOMPRAS', 'OBRAS_HAS_TRABAJADORES',
    'PERMISOSGRANULARESOBRAS', 'KITS_INSTALACION', 'KITS_HAS_MATERIALES',
    'OBRAS_HAS_KITS', 'OBRAS_KITS_CHECKLIST', 'TIPOSUSUARIOS',
    'ESTADOSOBRA', 'CAMPOSPERMISO'
];

async function main() {
    const db = await getConnection();
    for (const t of TABLES) {
        const rows = await db.query(
            `SELECT rf.RDB$FIELD_NAME AS F, f.RDB$FIELD_TYPE AS FT, f.RDB$FIELD_LENGTH AS FL,
                    rf.RDB$NULL_FLAG AS NL, rf.RDB$DEFAULT_SOURCE AS DS
             FROM RDB$RELATION_FIELDS rf
             JOIN RDB$FIELDS f ON f.RDB$FIELD_NAME = rf.RDB$FIELD_SOURCE
             WHERE rf.RDB$RELATION_NAME = ? 
             ORDER BY rf.RDB$FIELD_POSITION`,
            [t]
        );
        console.log(`\n=== ${t} ===`);
        for (const r of rows) {
            console.log(`  ${r.F.trim()} type=${r.FT} len=${r.FL} null=${r.NL ?? ''} def=${(r.DS ?? '').trim()}`);
        }
    }
    await disconnectDB();
    process.exit(0);
}

main().catch((err) => { console.error('FATAL:', err?.message || err); process.exit(1); });
