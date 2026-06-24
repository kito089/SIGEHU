const Firebird = require('node-firebird');
const path     = require('path');

// En Embedded, 'host' y 'port' se omiten (o se dejan vacíos).
// 'database' es la ruta ABSOLUTA al archivo .fdb
const options = {
  database: path.resolve(__dirname, 'SIGEHU.fdb'),
  username: 'SYSDBA',
  password: 'masterkey',    // Firebird Embedded ignora credenciales,
                            // pero node-firebird las requiere igual
  lowercase_keys: true,     // Los nombres de columna llegan en minúsculas
  role:     null,
  pageSize: 4096,
};

// Pool de conexiones (recomendado para el servidor Express)
// max: cuántas conexiones simultáneas permite
const pool = Firebird.pool(5, options);

/**
 * Ejecuta una query con parámetros y devuelve un array de filas.
 * Uso: const rows = await query('SELECT * FROM Clientes WHERE Activo = ?', [1]);
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.get((err, db) => {
      if (err) return reject(err);

      db.query(sql, params, (err, result) => {
        db.detach();   // devuelve la conexión al pool
        if (err) return reject(err);
        resolve(result || []);
      });
    });
  });
}

/**
 * Ejecuta un procedimiento almacenado de LECTURA (los que usan SUSPEND).
 * Uso: const rows = await execute('sp_GetAllClientes', []);
 */
function execute(procedure, params = []) {
  const placeholders = params.map(() => '?').join(', ');
  const sql = `SELECT * FROM ${procedure}(${placeholders})`;
  return query(sql, params);
}

/**
 * Ejecuta un procedimiento almacenado de ESCRITURA (sin SUSPEND).
 * Uso: await executeWrite('sp_DesactivarCliente', [idCliente]);
 */
function executeWrite(procedure, params = []) {
  const placeholders = params.map(() => '?').join(', ');
  const sql = `EXECUTE PROCEDURE ${procedure}(${placeholders})`;
  return query(sql, params);
}

module.exports = { query, execute, executeWrite, pool, options };