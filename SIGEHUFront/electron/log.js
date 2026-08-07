/**
 * SIGEHU — Log del proceso principal de Electron.
 *
 * Persiste los logs en un archivo de texto plano con formato estructurado y
 * con timestamp ISO-8601.
 *   - En desarrollo:  <raíz del proyecto frontend>/sigehu.log
 *   - Empaquetado:    <userData>/logs/sigehu.log
 *
 * Si el archivo no existe, se crea automáticamente.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5 MB antes de rotar
const MAX_BACKUPS = 3;

const LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'];

let logFile = null;

/** Resuelve la ubicación del archivo de log según empaquetado o desarrollo. */
function resolveLogPath() {
  if (app.isPackaged) {
    const dir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, 'sigehu.log');
  }
  // Desarrollo: raíz del proyecto del frontend.
  const root = app.getAppPath();
  return path.join(root, 'sigehu.log');
}

function ensureFile() {
  if (logFile) return;
  logFile = resolveLogPath();
  const dir = path.dirname(logFile);
  if (dir && !fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch (e) {
      // Si no se puede crear el directorio, escribimos vacío; los mensajes jamás
      // deben poder tumbar el proceso por un fallo de logging.
    }
  }
}

function rotateIfNeeded() {
  try {
    const stat = fs.statSync(logFile);
    if (!stat || stat.size < MAX_FILE_BYTES) return;
    const base = path.basename(logFile);
    const dir = path.dirname(logFile);
    // Elimina el backup más antiguo para no acumular archivos.
    const oldest = path.join(dir, `${base}.${MAX_BACKUPS}`);
    if (fs.existsSync(oldest)) fs.unlinkSync(oldest);
    for (let i = MAX_BACKUPS - 1; i >= 1; i--) {
      const from = path.join(dir, `${base}.${i}`);
      const to = path.join(dir, `${base}.${i + 1}`);
      if (fs.existsSync(from)) fs.renameSync(from, to);
    }
    fs.renameSync(logFile, path.join(dir, `${base}.1`));
  } catch (e) {
    /* nunca derribar por logging */
  }
}

function buildText(level, category, message) {
  const safeLevel = LEVELS.includes(level) ? level : 'INFO';
  const lines = [new Date().toISOString()];
  lines.push(`[${safeLevel}]`);
  if (category) lines.push(`[${category}]`);
  if (message) lines.push(message);
  return lines.join('\n');
}

/**
 * Escribe una entrada en el archivo de log. Nunca lanza excepciones.
 * @param {string} level  DEBUG | INFO | WARN | ERROR
 * @param {string} category SYS | HTTP | AUTH | NAV | BACKEND | ERROR
 * @param {string} message Texto ya formateado (con timestamp por el renderer) o simple.
 */
function write(level, category, message) {
  try {
    ensureFile();
    rotateIfNeeded();
    const text = buildText(level, category, message) + '\n';
    fs.appendFileSync(logFile, text, 'utf8');
  } catch (e) {
    /* logging nunca debe romper la app */
  }
}

/** Acepta entradas a través del IPC del renderer. */
function fromRenderer(event, payload) {
  if (!payload) return;
  write(payload.level, payload.category, payload.message);
}

/** Ruta actual del archivo de log (útil para depuración). */
function currentFile() {
  ensureFile();
  return logFile;
}

module.exports = {
  write,
  fromRenderer,
  getLogFile: currentFile,
};