const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const DB_PATH    = path.resolve(__dirname, 'SIGEHU.fdb');
const BACKUP_DIR = path.resolve(__dirname, 'backup');
const LOG_PATH   = path.join(BACKUP_DIR, 'backup.log');
const STATUS_PATH = path.join(BACKUP_DIR, 'backup_status.json');
const MAX_BACKUPS = 3;
const HORAS_ENTRE_RESPALDOS = 24;

// ─── Utilidades ──────────────────────────────────────────────────

function timestamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_`
       + `${pad(d.getHours())}${pad(d.getMinutes())}`;
}

function escribirLog(nivel, mensaje) {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const linea = `[${new Date().toISOString()}] [${nivel}] ${mensaje}\n`;
  fs.appendFileSync(LOG_PATH, linea, 'utf8');
  console.log(linea.trim());
}

function checksumArchivo(ruta) {
  return new Promise((resolve, reject) => {
    const hash   = crypto.createHash('sha256');
    const stream = fs.createReadStream(ruta);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end',  ()    => resolve(hash.digest('hex')));
    stream.on('error', err  => reject(err));
  });
}

// ─── Estado persistente ──────────────────────────────────────────

function leerStatus() {
  try {
    if (fs.existsSync(STATUS_PATH))
      return JSON.parse(fs.readFileSync(STATUS_PATH, 'utf8'));
  } catch (_) {}
  // Primera vez que corre el sistema — nunca se ha respaldado
  return { ok: null, fecha: null, mensaje: null, alertaVista: false };
}

function guardarStatus(ok, mensaje, archivo = null) {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const actual = leerStatus();
  fs.writeFileSync(STATUS_PATH, JSON.stringify({
    ok,
    fecha:       new Date().toISOString(),
    mensaje,
    archivo,
    alertaVista: ok ? false : actual.alertaVista  
    // Si tuvo éxito, resetear alerta.
    // Si falló, conservar alertaVista para no volver a molestar
    // si el propietario ya la vio pero sigue fallando.
  }, null, 2), 'utf8');
}

// ─── ¿Corresponde hacer respaldo ahora? ──────────────────────────

function deberiаRespaldаr() {
  const status = leerStatus();

  // Nunca se ha respaldado → sí
  if (!status.fecha) return true;

  const ultimoRespaldo = new Date(status.fecha);
  const ahora          = new Date();
  const horasTranscurridas = (ahora - ultimoRespaldo) / (1000 * 60 * 60);

  return horasTranscurridas >= HORAS_ENTRE_RESPALDOS;
}

// ─── Lógica de copia y verificación ─────────────────────────────

async function _copiarYVerificar(destino) {
  const checksumOriginal = await checksumArchivo(DB_PATH);
  fs.copyFileSync(DB_PATH, destino);
  const checksumCopia = await checksumArchivo(destino);

  if (checksumOriginal !== checksumCopia) {
    try { fs.unlinkSync(destino); } catch (_) {}
    throw new Error('El checksum del respaldo no coincide con el original.');
  }
}

function _limpiarRespaldosAntiguos() {
  const archivos = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('SIGEHU_') && f.endsWith('.fdb'))
    .map(f => ({ nombre: f, mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime }))
    .sort((a, b) => b.mtime - a.mtime);

  archivos.slice(MAX_BACKUPS).forEach(({ nombre }) => {
    fs.unlinkSync(path.join(BACKUP_DIR, nombre));
    escribirLog('INFO', `Respaldo antiguo eliminado: ${nombre}`);
  });
}

// ─── Función principal ───────────────────────────────────────────

async function hacerRespaldo() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const destino = path.join(BACKUP_DIR, `SIGEHU_${timestamp()}.fdb`);

  try {
    await _copiarYVerificar(destino);
    _limpiarRespaldosAntiguos();
    const msg = `Respaldo exitoso: ${path.basename(destino)}`;
    escribirLog('OK', msg);
    guardarStatus(true, msg, path.basename(destino));
    return { ok: true, archivo: destino };
  } catch (err) {
    const msg = `Respaldo fallido: ${err.message}`;
    escribirLog('ERROR', msg);
    guardarStatus(false, msg);
    throw err;
  }
}

// ─── Disparo automático al arrancar el backend ───────────────────
// Se llama una sola vez desde app.js después de que Express ya escucha.
// Corre en segundo plano (sin await) para no retrasar el inicio.

function verificarYRespaldarAlArrancar() {
  if (!deberiаRespaldаr()) {
    const status = leerStatus();
    escribirLog('INFO',
      `Respaldo omitido — el último fue hace menos de ${HORAS_ENTRE_RESPALDOS}h `
      + `(${status.fecha})`
    );
    return;
  }

  escribirLog('INFO', 'Han pasado +24h desde el último respaldo. Iniciando...');

  // setTimeout de 5s para dejar que el pool de BD termine de inicializarse
  setTimeout(async () => {
    try {
      await hacerRespaldo();
    } catch (err) {
      // El error ya quedó registrado en escribirLog dentro de hacerRespaldo()
    }
  }, 5000);
}

module.exports = { hacerRespaldo, leerStatus, guardarStatus, verificarYRespaldarAlArrancar };