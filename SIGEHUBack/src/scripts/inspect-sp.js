import { getConnection, disconnectDB } from "../config/db.js";

async function main() {
    const db = await getConnection();

    const sps = ['SP_INSERTAR_OBRA', 'SP_INSERTAR_TRABAJO', 'SP_INSERTAR_TRABAJADOR', 'SP_INSERTAR_PROVEEDOR',
        'SP_INSERTAR_MATERIAL', 'SP_ASIGNAR_TRABAJADOR_OBRA', 'SP_OTORGAR_PERMISO_OBRA',
        'SP_CAMBIAR_ESTADO_OBRA', 'SP_INSERTAR_KIT', 'SP_VINCULAR_MATERIAL_KIT',
        'SP_REGISTRAR_COMPRA_COMPLETA', 'SP_AGREGAR_DETALLE_COMPRA', 'SP_CREAR_CLIENTE', 'SP_VINCULAR_MATERIAL_PROVEEDOR'];

    for (const sp of sps) {
        const rows = await db.query(
            `SELECT pp.RDB$PARAMETER_NAME AS P, pp.RDB$PARAMETER_TYPE AS T,
                    f.RDB$FIELD_TYPE AS FT, f.RDB$FIELD_LENGTH AS FL
             FROM RDB$PROCEDURE_PARAMETERS pp
             JOIN RDB$FIELDS f ON f.RDB$FIELD_NAME = pp.RDB$FIELD_SOURCE
             WHERE pp.RDB$PROCEDURE_NAME = ?
             ORDER BY pp.RDB$PARAMETER_NUMBER`,
            [sp]
        );
        console.log(`\n=== ${sp} ===`);
        for (const r of rows) {
            console.log(`  ${r.T === 0 ? 'IN ' : 'OUT'} ${r.P.trim()} type=${r.FT} len=${r.FL}`);
        }
    }

    console.log('\n=== FECHA field types ===');
    const fields = await db.query(
        `SELECT rf.RDB$RELATION_NAME AS REL, rf.RDB$FIELD_NAME AS F, f.RDB$FIELD_TYPE AS FT,
                f.RDB$FIELD_LENGTH AS FL, f.RDB$FIELD_SUB_TYPE AS FS
         FROM RDB$RELATION_FIELDS rf
         JOIN RDB$FIELDS f ON f.RDB$FIELD_NAME = rf.RDB$FIELD_SOURCE
         WHERE rf.RDB$FIELD_NAME IN ('FECHACOMPRA','FECHACREACION','FECHAINICIO','FECHAASIGNACION','FECHAMARCADO')`,
        []
    );
    for (const r of fields) console.log(`  ${r.REL.trim()}.${r.F.trim()} type=${r.FT} len=${r.FL} sub=${r.FS}`);

    await disconnectDB();
    process.exit(0);
}

main().catch((err) => { console.error('FATAL:', err?.message || err); process.exit(1); });
