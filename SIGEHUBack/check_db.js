const path = require('path');
const rootPath = process.cwd();
const config = require(path.join(rootPath, 'config.json'));
const { createNativeClient } = require('node-firebird-driver-native');

async function check() {
  try {
    const client = createNativeClient(path.join(rootPath, 'firebird', 'fbclient.dll'));
    const att = await client.connect(path.join(rootPath, 'database', 'SIGEHU.FDB'), {
      username: config.dbUsername,
      password: config.dbPassword
    });
    
    const tx = await att.startTransaction();
    
    const stmt = await att.prepare(tx, 'SELECT FIRST 1 * FROM CLIENTES');
    const cols = await stmt.columnLabels;
    console.log('Columns in CLIENTES:');
    for (const c of cols) console.log('  -', c);
    await stmt.dispose();
    
    const q2 = await att.prepare(tx, "SELECT RDB$PROCEDURE_NAME FROM RDB$PROCEDURES WHERE RDB$PROCEDURE_NAME LIKE 'SP_%CLIENTE%'");
    const rs2 = await q2.executeQuery(tx);
    const rows2 = await rs2.fetch();
    await rs2.close(); await q2.dispose();
    console.log('SP_CLIENTE procedures:');
    for (const r of rows2) console.log('  -', r[0]);
    
    await tx.commit();
    await att.disconnect();
    await client.dispose();
  } catch(e) {
    console.error('Error:', e.message);
  }
}
check();
