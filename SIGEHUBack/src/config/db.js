import path from "node:path";
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
            username: "SYSDBA",
            password: "masterkey"
        }
    );

    return attachment;
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
            return rows.map(row =>
                Object.fromEntries(
                    columnLabels.map((label, i) => [label, row[i]])
                )
            );

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

export async function getConnection() {

    const att = await ensureConnection();

    return {

        async query(sql, params = []) {

            const tx =
                await att.startTransaction();

            try {

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

        async transaction() {

            const tx =
                await att.startTransaction();

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