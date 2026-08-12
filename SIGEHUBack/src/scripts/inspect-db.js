import { getConnection, disconnectDB } from "../config/db.js";

async function main() {
    const db = await getConnection();

    const tables = [
        'TiposUsuarios', 'RegimenesFiscales', 'UsosCFDI', 'EstadosObra',
        'Materiales', 'TiposPago', 'FormasPago', 'CamposPermiso',
        'EstadosGarantia', 'Proveedores', 'Trabajadores', 'Clientes',
        'ContactosClientes', 'TRABAJO', 'Obras', 'Obras_has_Materiales',
        'Obras_has_Trabajadores', 'DetallesPagos', 'PermisosGranularesObras',
        'Proveedores_has_Materiales', 'Compras', 'DetallesCompras',
        'Garantias', 'Kits_Instalacion', 'Kits_has_Materiales',
        'Obras_has_Kits', 'Obras_Kits_Checklist', 'Notificaciones', 'Auditorias'
    ];

    for (const t of tables) {
        try {
            const rows = await db.query(`SELECT COUNT(*) AS N FROM ${t}`, []);
            console.log(`${t}: ${rows[0]?.N ?? 0}`);
        } catch (e) {
            console.log(`${t}: ERROR ${e.message}`);
        }
    }

    console.log('\n--- TRABAJADORES ---');
    try {
        const rows = await db.query(`SELECT idTrabajador, NombreUsuario, NombreCompleto, TiposUsuarios_idTipoUsuario, Activo FROM Trabajadores`, []);
        for (const r of rows) console.log(JSON.stringify(r));
    } catch (e) { console.log('ERROR', e.message); }

    console.log('\n--- CLIENTES ---');
    try {
        const rows = await db.query(`SELECT idCliente, NombreCompleto, RazonSocial, Tipo, Activo FROM Clientes`, []);
        for (const r of rows) console.log(JSON.stringify(r));
    } catch (e) { console.log('ERROR', e.message); }

    console.log('\n--- OBRAS ---');
    try {
        const rows = await db.query(`SELECT o.idObra, o.Nombre, o.EstadosObra_idEstadoObra, o.Clientes_idCliente, o.TRABAJOS_IDTRABAJO, o.Activo FROM Obras o`, []);
        for (const r of rows) console.log(JSON.stringify(r));
    } catch (e) { console.log('ERROR', e.message); }

    console.log('\n--- TRABAJO ---');
    try {
        const rows = await db.query(`SELECT * FROM TRABAJO`, []);
        for (const r of rows) console.log(JSON.stringify(r));
    } catch (e) { console.log('ERROR', e.message); }

    console.log('\n--- MATERIALES ---');
    try {
        const rows = await db.query(`SELECT idMaterial, Nombre, UnidadMedida, Activo FROM Materiales`, []);
        for (const r of rows) console.log(JSON.stringify(r));
    } catch (e) { console.log('ERROR', e.message); }

    console.log('\n--- PROVEEDORES ---');
    try {
        const rows = await db.query(`SELECT idProveedor, Nombre, Activo FROM Proveedores`, []);
        for (const r of rows) console.log(JSON.stringify(r));
    } catch (e) { console.log('ERROR', e.message); }

    console.log('\n--- COMPRAS ---');
    try {
        const rows = await db.query(`SELECT idCompra, Trabajadores_idTrabajador, Recibida, Activo FROM Compras`, []);
        for (const r of rows) console.log(JSON.stringify(r));
    } catch (e) { console.log('ERROR', e.message); }

    console.log('\n--- KITS ---');
    try {
        const rows = await db.query(`SELECT idKit, Nombre, Activo FROM Kits_Instalacion`, []);
        for (const r of rows) console.log(JSON.stringify(r));
    } catch (e) { console.log('ERROR', e.message); }

    console.log('\n--- ESTADOS OBRA ---');
    try {
        const rows = await db.query(`SELECT idEstadoObra, Nombre, Orden FROM EstadosObra ORDER BY Orden`, []);
        for (const r of rows) console.log(JSON.stringify(r));
    } catch (e) { console.log('ERROR', e.message); }

    console.log('\n--- CAMPOS PERMISO ---');
    try {
        const rows = await db.query(`SELECT idCampoPermiso, NombreCampo FROM CamposPermiso ORDER BY idCampoPermiso`, []);
        for (const r of rows) console.log(JSON.stringify(r));
    } catch (e) { console.log('ERROR', e.message); }

    console.log('\n--- OBRAS_HAS_TRABAJADORES ---');
    try {
        const rows = await db.query(`SELECT * FROM Obras_has_Trabajadores`, []);
        for (const r of rows) console.log(JSON.stringify(r));
    } catch (e) { console.log('ERROR', e.message); }

    console.log('\n--- PERMISOSGRANULARESOBRAS ---');
    try {
        const rows = await db.query(`SELECT * FROM PermisosGranularesObras`, []);
        for (const r of rows) console.log(JSON.stringify(r));
    } catch (e) { console.log('ERROR', e.message); }

    console.log('\n--- SP list ---');
    try {
        const rows = await db.query(`SELECT RDB$PROCEDURE_NAME AS N FROM RDB$PROCEDURES WHERE RDB$PROCEDURE_NAME NOT LIKE 'SEC$%'`, []);
        for (const r of rows) console.log(r.N);
    } catch (e) { console.log('ERROR', e.message); }

    await disconnectDB();
    process.exit(0);
}

main().catch((err) => {
    console.error('FATAL:', err?.message || err);
    process.exit(1);
});
