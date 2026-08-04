import path from "node:path";
import config from '../../config.json' with { type: 'json' };
import { createNativeClient } from "node-firebird-driver-native";

let client = null;
let attachment = null;

function getRootPath() {
    if (process.env.NODE_ENV === "production") {
        return path.dirname(process.execPath);
    }

    return process.cwd();
}

async function ensureConnection() {

    if (attachment) {
        return attachment;
    }

    const rootPath = getRootPath();

    const fbClientPath = path.join(
        rootPath,
        "firebird",
        "fbclient.dll"
    );

    const dbPath = path.join(
        rootPath,
        "database",
        "SIGEHU.FDB"
    );

    console.log("Firebird:", fbClientPath);
    console.log("Database:", dbPath);

    client = createNativeClient(fbClientPath);

    attachment = await client.connect(
        dbPath,
        {
            username: `${config.dbUsername}`,
            password: `${config.dbPassword}`
        }
    );

    return attachment;
}

async function readBlobValue(att, tx, value) {

    if (
        value == null ||
        typeof value !== 'object' ||
        !('attachment' in value) ||
        !('id' in value)
    ) {
        return value;
    }

    let stream;
    try {
        stream = await att.openBlob(tx, value);
        const length = await stream.length;
        const chunks = [];
        const buffer = Buffer.alloc(16384);
        let readTotal = 0;
        while (readTotal < length) {
            const n = await stream.read(buffer);
            if (n === -1 || n === 0) break;
            chunks.push(Buffer.from(buffer.subarray(0, n)));
            readTotal += n;
        }
        return Buffer.concat(chunks).toString('utf8');
    } catch (err) {
        return value;
    } finally {
        if (stream) await stream.close();
    }
}

async function normalizeRow(att, tx, row, columnLabels) {

    const out = {};
    for (let i = 0; i < columnLabels.length; i++) {
        out[columnLabels[i]] = await readBlobValue(att, tx, row[i]);
    }
    return out;
}

async function queryInternal(att, tx, sql, params = []) {

    // prepare() expone columnLabels, executeQuery() no
    const stmt = await att.prepare(tx, sql);

    try {
        const columnLabels = await stmt.columnLabels;

        const rs = await stmt.executeQuery(tx, params);

        try {
            const rows = await rs.fetch();

            // Mapear cada fila (array) a objeto { columna: valor }
            const mapped = [];
            for (const row of rows) {
                mapped.push(await normalizeRow(att, tx, row, columnLabels));
            }
            return mapped;

        } finally {
            await rs.close();
        }

    } finally {
        await stmt.dispose();
    }
}

async function executeInternal(att, tx, sql, params = []) {

    await att.execute(
        tx,
        sql,
        params
    );

    return true;
}

async function executeReturningInternal(att, tx, sql, params = []) {

    const rows = await att.executeReturning(
        tx,
        sql,
        params
    );

    return rows;
}

function createTransactionApi(att, tx) {

    return {

        async query(sql, params = []) {
            return await queryInternal(
                att,
                tx,
                sql,
                params
            );
        },

        async execute(sql, params = []) {
            return await executeInternal(
                att,
                tx,
                sql,
                params
            );
        },

        async executeReturning(sql, params = []) {
            return await executeReturningInternal(
                att,
                tx,
                sql,
                params
            );
        },

        async procedure(sql, params = []) {
            return await executeInternal(
                att,
                tx,
                sql,
                params
            );
        },

        async commit() {
            await tx.commit();
        },

        async rollback() {
            await tx.rollback();
        }
    };
}

async function setSessionUserId(att, tx, userId) {
    await executeInternal(
        att,
        tx,
        "SELECT RDB$SET_CONTEXT('USER_SESSION', 'CURRENT_USER_ID', ?) FROM RDB$DATABASE",
        [String(userId ?? 1)]
    );
}

export async function getConnection() {
    let userId = null;

    const att = await ensureConnection();

    return {

        setUserId(id) {
            userId = id;
        },

        async query(sql, params = []) {

            const tx =
                await att.startTransaction();

            try {
                if (userId) {
                    await setSessionUserId(att, tx, userId);
                }

                const rows =
                    await queryInternal(
                        att,
                        tx,
                        sql,
                        params
                    );

                await tx.commit();

                return rows;

            } catch (err) {

                await tx.rollback();

                throw err;
            }
        },

        async execute(sql, params = []) {

            const tx =
                await att.startTransaction();

            try {
                if (userId) {
                    await setSessionUserId(att, tx, userId);
                }

                await executeInternal(
                    att,
                    tx,
                    sql,
                    params
                );

                await tx.commit();

                return true;

            } catch (err) {

                await tx.rollback();

                throw err;
            }
        },

        async procedure(sql, params = []) {

            const tx =
                await att.startTransaction();

            try {
                if (userId) {
                    await setSessionUserId(att, tx, userId);
                }

                await executeInternal(
                    att,
                    tx,
                    sql,
                    params
                );

                await tx.commit();

                return true;

            } catch (err) {

                await tx.rollback();

                throw err;
            }
        },

        async executeReturning(sql, params = []) {

            const tx =
                await att.startTransaction();

            try {
                if (userId) {
                    await setSessionUserId(att, tx, userId);
                }

                const rows = await executeReturningInternal(
                    att,
                    tx,
                    sql,
                    params
                );

                await tx.commit();

                return rows;

            } catch (err) {

                await tx.rollback();

                throw err;
            }
        },

        async transaction() {

            const tx =
                await att.startTransaction();

            return createTransactionApi(
                att,
                tx
            );
        },

        async transactionWithUser(userId) {

            const tx =
                await att.startTransaction();

            await setSessionUserId(att, tx, userId);

            return createTransactionApi(
                att,
                tx
            );
        }
    };
}

export async function disconnectDB() {

    if (attachment) {

        await attachment.disconnect();

        attachment = null;
    }

    if (client) {

        await client.dispose();

        client = null;
    }
}