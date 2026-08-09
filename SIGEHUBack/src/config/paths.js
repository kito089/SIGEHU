import path from 'node:path';
import os from 'node:os';

function isProduction() {
    return process.env.NODE_ENV === 'production';
}

/**
 * Raíz de solo lectura (dónde vive el ejecutable): firebird/, node_modules/,
 * config.json y la BD semilla SIGEHU.FDB. En producción es el directorio del
 * backend dentro de la instalación; en desarrollo, la raíz del proyecto.
 */
export function getResourcesRoot() {
    if (isProduction()) return path.dirname(process.execPath);
    return process.cwd();
}

/**
 * Raíz de datos del usuario (escribible): database/, uploads/ y logs/.
 * Precedencia:
 *   1. `SIGEHU_DATA_DIR` (la inyecta Electron con `app.getPath('userData')`).
 *   2. En producción, la carpeta Roaming del usuario (nunca Program Files).
 *   3. En desarrollo, la raíz del proyecto (comportamiento actual intacto).
 */
export function getDataRoot() {
    if (process.env.SIGEHU_DATA_DIR) {
        return process.env.SIGEHU_DATA_DIR;
    }
    if (isProduction()) {
        const base = process.env.APPDATA || process.env.LOCALAPPDATA || path.join(os.homedir(), '.config');
        return path.join(base, 'SIGEHU');
    }
    return process.cwd();
}

export function getFirebirdDir() {
    return path.join(getResourcesRoot(), 'firebird');
}

export function getFbClientPath() {
    return path.join(getFirebirdDir(), 'fbclient.dll');
}

export function getDatabaseDir() {
    return path.join(getDataRoot(), 'database');
}

export function getDatabasePath() {
    return path.join(getDatabaseDir(), 'SIGEHU.FDB');
}

export function getBackupDir() {
    return path.join(getDatabaseDir(), 'backups');
}

export function getUploadsDir() {
    return path.join(getDataRoot(), 'uploads');
}

export function getObrasUploadDir() {
    return path.join(getUploadsDir(), 'obras');
}

export function getGarantiasUploadDir() {
    return path.join(getUploadsDir(), 'garantias');
}

export function getImssUploadDir() {
    return path.join(getUploadsDir(), 'imss');
}

export function getLogsDir() {
    return path.join(getDataRoot(), 'logs');
}