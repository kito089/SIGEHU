import path from 'node:path';
import { createNativeClient } from 'node-firebird-driver-native';
import { readFileSync } from 'node:fs';

const rootPath = process.cwd();
const config = JSON.parse(readFileSync(path.join(rootPath, 'config.json'), 'utf-8'));
const sqlPath = path.join(rootPath, 'migrations', 'phase2-clientes-migration.sql');
const sqlContent = readFileSync(sqlPath, 'utf-8');

// Split SQL by statements (split on EXECUTE BLOCK / CREATE / SET TERM)
// Need to handle SET TERM ^ ; blocks for SPs
const lines = sqlContent.split('\n');
let statements = [];
let currentStmt = '';
let inExecBlock = 0;
let inSP = false;
let term = ';';

for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and rollback section
    if (trimmed.startsWith('--') || trimmed.startsWith('/*') || trimmed.startsWith('*/') || trimmed.startsWith('*')) continue;

    // SET TERM handling
    if (trimmed.toUpperCase().startsWith('SET TERM')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 3) {
            if (parts[2] === '^') {
                inSP = true;
            } else if (parts[2] === ';') {
                inSP = false;
            }
        }
        continue;
    }

    // ROLLBACK section skip
    if (trimmed.toUpperCase() === '-- ROLLBACK') {
        break;
    }

    currentStmt += line + '\n';

    if (inSP) {
        if (trimmed.endsWith('^')) {
            statements.push(currentStmt.replace(/\^$/, '').trim());
            currentStmt = '';
        }
    } else {
        if (trimmed.endsWith(';')) {
            statements.push(currentStmt.trim());
            currentStmt = '';
        }
    }
}

if (currentStmt.trim()) {
    statements.push(currentStmt.trim());
}

statements = statements.filter(s => s && s.length > 0);

console.log(`Found ${statements.length} statements to execute`);

async function migrate() {
    let client, att, tx;
    let successCount = 0;
    let failCount = 0;

    try {
        client = createNativeClient(path.join(rootPath, 'firebird', 'fbclient.dll'));
        att = await client.connect(path.join(rootPath, 'database', 'SIGEHU.FDB'), {
            username: config.dbUsername,
            password: config.dbPassword
        });

        tx = await att.startTransaction();

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            try {
                await att.execute(tx, stmt);
                successCount++;
                console.log(`OK [${i+1}/${statements.length}]`);
            } catch (e) {
                failCount++;
                // Extract first 80 chars
                const snippet = stmt.substring(0, 80).replace(/\n/g, ' ');
                console.log(`FAIL [${i+1}/${statements.length}]: ${e.message}`);
                console.log(`  SQL: ${snippet}...`);
            }
        }

        if (failCount === 0) {
            await tx.commit();
            console.log(`\n? Migration COMPLETE: ${successCount} statements executed, 0 failures`);
        } else {
            await tx.rollback();
            console.log(`\n? Migration FAILED: ${successCount} OK, ${failCount} FAILED - rolled back`);
            process.exit(1);
        }

        await att.disconnect();
        await client.dispose();
    } catch (e) {
        console.error('FATAL:', e.message);
        if (tx) await tx.rollback();
        if (att) await att.disconnect();
        if (client) await client.dispose();
        process.exit(1);
    }
}

migrate();
