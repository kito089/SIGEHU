const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { spawn } = require('child_process');
const log = require('./log.js');

function resolveConfigPath() {
    const candidates = [
        path.join(process.resourcesPath, 'backend', 'config.json'),
        path.join(process.resourcesPath, 'config.json'),
        path.join(__dirname, '..', '..', 'SIGEHUBack', 'config.json')
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    return null;
}

const configPath = resolveConfigPath();
let config = null;

if (configPath) {
    try {
        config = require(configPath);
    } catch (err) {
        log.write('ERROR', 'SYS', 'No se pudo cargar la configuración: ' + (err && err.message));
    }
} else {
    log.write('WARN', 'SYS', 'config.json no encontrado, se usan valores por defecto');
}

// =============================================================================
// Persistencia de logs provenientes del renderer (Angular).
// =============================================================================
ipcMain.on('sigehu:log', log.fromRenderer);

let backend;
let quitting = false;
let restartTimer = null;

function scheduleBackendRestart() {
    if (quitting) return;
    if (restartTimer) clearTimeout(restartTimer);
    log.write('WARN', 'BACKEND', 'Reinicio del backend programado en 2s');
    restartTimer = setTimeout(startBackend, 2000);
}

function startBackend() {
    if (quitting) return;

    const backendPath = path.join(process.resourcesPath, 'backend', 'sigehu-back.exe');
    const backendDir = path.join(process.resourcesPath, 'backend');

    if (!fs.existsSync(backendPath)) {
        log.write('ERROR', 'BACKEND', 'Ejecutable del backend no encontrado: ' + backendPath);
        return;
    }

    backend = spawn(
        backendPath,
        [],
        {
            cwd: backendDir,
            env: Object.assign({}, process.env, { NODE_ENV: 'production' }),
            windowsHide: true,
            stdio: ['ignore', 'pipe', 'pipe']
        }
    );

    log.write('INFO', 'BACKEND', 'Backend desplegado: ' + backendPath);

    backend.stdout.on('data', (chunk) => {
        log.write('INFO', 'BACKEND', String(chunk).trim());
    });

    backend.stderr.on('data', (chunk) => {
        log.write('ERROR', 'BACKEND', String(chunk).trim());
    });

    backend.on('error', (err) => {
        log.write('ERROR', 'BACKEND', 'Error al iniciar backend: ' + (err && err.message));
    });

    backend.on('exit', (code, signal) => {
        log.write(code === 0 ? 'INFO' : 'ERROR', 'BACKEND', 'Backend terminado: code=' + code + ' signal=' + signal);
        backend = undefined;
        scheduleBackendRestart();
    });
}

function createWindow() {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        title: 'SIGEHU',
        icon: path.join(__dirname, '..', 'www', 'assets', 'icon.png'),
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    log.write('INFO', 'SYS', 'Ventana abierta');

    win.on('closed', () => {
        log.write('INFO', 'SYS', 'Ventana cerrada');
    });

    win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
    win.setMenu(null);
    Menu.setApplicationMenu(null);
    win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    log.write('INFO', 'SYS', 'Electron iniciado');
    log.write('INFO', 'SYS', 'Configuración cargada: ' + (configPath || '(ninguna)'));
    log.write('INFO', 'SYS', 'Detección de entorno', 'empaquetado=' + app.isPackaged);
    log.write('INFO', 'SYS', 'Archivo de log', log.getLogFile());

    if (app.isPackaged) {
        startBackend();
    } else {
        log.write('WARN', 'BACKEND', 'Modo desarrollo: iniciar el backend manualmente');
    }

    createWindow();
});

app.on('before-quit', () => {
    quitting = true;
    log.write('INFO', 'SYS', 'Electron cerrando');
    if (restartTimer) clearTimeout(restartTimer);
    if (backend) {
        backend.kill();
    }
});

// Cierre inesperado del proceso principal.
process.on('uncaughtException', (err) => {
    log.write('ERROR', 'ERROR', 'Excepción no controlada en Electron: ' + (err && err.stack));
});
