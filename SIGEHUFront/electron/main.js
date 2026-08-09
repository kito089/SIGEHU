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

let config = null;
const configPath = resolveConfigPath();

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
// IPC del renderer (Angular):
//   - `sigehu:log`            → el renderer envía las entradas del LogService.
//   - `sigehu:get-log-file`   → el renderer consulta la ruta absoluta del log.
// =============================================================================
ipcMain.on('sigehu:log', (event, payload) => {
    log.fromRenderer(event, payload);
});
ipcMain.handle('sigehu:get-log-file', () => log.getLogFile() || null);

let backend;
let quitting = false;
let restartTimer = null;
let startupLogged = false;

// =============================================================================
// El primer grupo de líneas SIEMPRE indica dónde está escribiendo Electron.
// =============================================================================
function logStartupContext() {
    if (startupLogged) return;
    startupLogged = true;
    log.write('INFO', 'APP', 'Application starting');
    log.write('INFO', 'APP', 'isPackaged=' + app.isPackaged);
    try {
        log.write('INFO', 'APP', 'userData=' + app.getPath('userData'));
    } catch (e) {
        log.write('INFO', 'APP', 'userData=<error>');
    }
    log.write('INFO', 'APP', 'logFile=' + (log.getLogFile() || '<por resolver>'));
    log.write('INFO', 'APP', 'resourcesPath=' + process.resourcesPath);
    log.write('INFO', 'APP', 'appPath=' + app.getAppPath());
    log.write('INFO', 'APP', 'configPath=' + (configPath || '(ninguna)'));
    log.write('INFO', 'APP', 'node=' + process.versions.node + ' electron=' + process.versions.electron + ' chrome=' + process.versions.chrome);
}

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
            env: Object.assign({}, process.env, {
                NODE_ENV: 'production',
                SIGEHU_DATA_DIR: app.getPath('userData')
            }),
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

// =============================================================================
// Instrumentación del renderer. Cada evento termina en el archivo de log para
// poder diagnosticar pantallas negras / fallos de carga en instalaciones reales.
// =============================================================================
let staticConsoleCount = 0;

function instrumentRenderer(win) {
    const wc = win.webContents;

    wc.on('did-start-loading', () => log.write('INFO', 'RENDERER', 'did-start-loading'));
    wc.on('did-stop-loading', () => log.write('INFO', 'RENDERER', 'did-stop-loading'));
    wc.on('did-finish-load', () => log.write('INFO', 'RENDERER', 'Renderer finished loading'));
    wc.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        log.write('ERROR', 'RENDERER', 'Renderer failed to load (mainFrame=' + isMainFrame + ')');
        log.write('ERROR', 'RENDERER', 'errorCode=' + errorCode);
        log.write('ERROR', 'RENDERER', 'errorDescription=' + (errorDescription || ''));
        log.write('ERROR', 'RENDERER', 'validatedURL=' + (validatedURL || ''));
    });
    wc.on('render-process-gone', (_event, details) => {
        log.write('ERROR', 'RENDERER', 'render-process-gone reason=' + (details && details.reason) + ' exitCode=' + (details && details.exitCode));
    });
    wc.on('did-navigate', (_event, url) => {
        log.write('INFO', 'RENDERER', 'did-navigate url=' + url);
    });
    wc.on('did-navigate-in-page', (_event, url, isMainFrame) => {
        if (isMainFrame) log.write('INFO', 'RENDERER', 'did-navigate-in-page url=' + url);
    });
    wc.on('preload-error', (_event, preloadPath, error) => {
        log.write('ERROR', 'RENDERER', 'preload-error path=' + preloadPath + ' err=' + (error && error.message));
    });
    wc.on('unresponsive', () => log.write('WARN', 'RENDERER', 'unresponsive'));
    wc.on('console-message', (event, levelOrParams, messageOrEmpty, lineOrEmpty, sourceId) => {
        staticConsoleCount++;
        let level = levelOrParams;
        let message = messageOrEmpty;
        let line = lineOrEmpty;
        if (typeof levelOrParams === 'object' && levelOrParams !== null) {
            level = levelOrParams.level;
            message = levelOrParams.message;
            line = levelOrParams.lineNumber;
        }
        // Solo la primera línea del console (el buscador multi-línea duplica el cuerpo
        // de las entradas del LogService dentro de esta sección).
        const firstLine = typeof message === 'string' ? message.split(/[\r\n]+/)[0] : String(message || '');
        log.write('DEBUG', 'RENDERER', '[console count=' + staticConsoleCount + '] level=' + level + ' line=' + (line || '') + ' msg=' + firstLine);
    });

    // Previene navegación a URLs externas (causa clásica de pantallas blancas por
    // redirecciones o ventanas emergentes accidentales del SPA).
    wc.on('will-navigate', (_event, url) => {
        log.write('INFO', 'RENDERER', 'will-navigate url=' + url);
    });
    wc.setWindowOpenHandler(({ url }) => {
        log.write('WARN', 'RENDERER', 'Bloqueada apertura externa url=' + url);
        return { action: 'deny' };
    });
}

// =============================================================================
// Verifica que existan los archivos críticos antes de cargar el renderer.
// =============================================================================
function checkRenderAssets(wwwDir, preloadPath) {
    const indexPath = path.join(wwwDir, 'index.html');
    const iconPath = path.join(wwwDir, 'assets', 'icon.png');

    const checks = [
        ['index.html', indexPath],
        ['preload.js', preloadPath],
        ['assets/icon.png (icono)', iconPath]
    ];
    let missing = false;
    for (const [label, file] of checks) {
        const ok = fs.existsSync(file);
        if (!ok) {
            log.write('ERROR', 'RENDERER', 'FALTA ARCHIVO: ' + label + ' -> ' + file);
            missing = true;
        } else {
            log.write('INFO', 'RENDERER', 'Archivo OK: ' + label + ' -> ' + file);
        }
    }
    let jsCount = 0;
    try {
        const entries = fs.readdirSync(wwwDir);
        for (const entry of entries) {
            if (entry.endsWith('.js')) jsCount++;
        }
    } catch (e) {
        log.write('WARN', 'RENDERER', 'No se pudo listar www: ' + (e && e.message));
    }
    log.write('INFO', 'RENDERER', 'Bundles JS en www=' + jsCount);
    return missing;
}

function createWindow() {
    const wwwDir = path.join(__dirname, '..', 'www');
    const indexPath = path.join(wwwDir, 'index.html');
    const preloadPath = path.join(__dirname, 'preload.js');

    checkRenderAssets(wwwDir, preloadPath);

    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        title: 'SIGEHU',
        icon: path.join(wwwDir, 'assets', 'icon.png'),
        autoHideMenuBar: true,
        backgroundColor: '#0F172A',
        show: false,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        }
    });

    instrumentRenderer(win);

    win.once('ready-to-show', () => {
        log.write('INFO', 'SYS', 'Ventana lista (ready-to-show)');
        win.show();
    });

    win.on('closed', () => {
        log.write('INFO', 'SYS', 'Ventana cerrada');
    });

    log.write('INFO', 'RENDERER', 'Loading renderer: ' + indexPath);
    win.loadFile(indexPath).catch((err) => {
        log.write('ERROR', 'RENDERER', 'loadFile fallo: ' + (err && err.message));
    });

    win.setMenu(null);
    Menu.setApplicationMenu(null);
    win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
    logStartupContext();

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
    log.write('ERROR', 'ERROR', 'Excepción no controlada en Electron: ' + (err && (err.stack || err.message)));
});
process.on('unhandledRejection', (reason) => {
    log.write('ERROR', 'ERROR', 'Promesa rechazada sin controlar en Electron: ' + (reason instanceof Error ? (reason.stack || reason.message) : String(reason)));
});
