import path from 'node:path';
import { createNativeClient } from 'node-firebird-driver-native';
import fs from 'node:fs';

const dbPath = 'C:\\ErusProgramer\\GitHub\\SIGEHU\\SIGEHUBack\\database\\SIGEHU.FDB';
const fbClientPath = 'C:\\ErusProgramer\\GitHub\\SIGEHU\\SIGEHUBack\\firebird\\fbclient.dll';

console.log('BD:', dbPath, fs.existsSync(dbPath));
console.log('fbclient:', fbClientPath, fs.existsSync(fbClientPath));

const client = createNativeClient(fbClientPath);
const att = await client.connect(dbPath, { username: 'SYSDBA', password: 'masterkey' });
const tx = await att.startTransaction();

const sql = `SELECT TRIM(R.RDB$RELATION_NAME) AS NOMBRE
            FROM RDB$RELATIONS R
            WHERE R.RDB$SYSTEM_FLAG = 0
              AND R.RDB$VIEW_SOURCE IS NULL
            ORDER BY R.RDB$RELATION_NAME`;

const stmt = await att.prepare(tx, sql);
const rs = await stmt.executeQuery(tx, []);
const rows = await rs.fetch();
const labels = await stmt.columnLabels;
console.log('cols:', labels);

const normalizar = (s) => String(s ?? '').trim().toUpperCase();
const nombres = rows.map(r => normalizar(r[0]));
console.log('Total tablas:', nombres.length);
console.log('Tablas que contienen "TRAB" o "OBRA":');
const filtradas = nombres.filter(n => n.includes('TRAB') || n.includes('OBRA'));
filtradas.forEach(n => console.log('  ', n));

await rs.close();
await stmt.dispose();
await tx.commit();
await att.disconnect();
await client.dispose();
