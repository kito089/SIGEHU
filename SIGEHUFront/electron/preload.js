/**
 * SIGEHU — Preload de Electron.
 *
 * Expone al renderer (Angular) un puente seguro y mínimo para detectar que
 * corre en Electron y persistir los logs en el proceso principal, sin otorgar
 * acceso directo a Node (`process`, `require`, etc.).
 *
 * API expuesta:
 *   - window.sigehuLog.write(entry)   → envía una entrada de log al proceso main.
 *   - window.sigehuLog.getLogFile()   → Promise con la ruta absoluta del log.
 *   - window.sigehuDesktop.isElectron → detección fiable independiente del userAgent.
 *   - window.sigehuDesktop.platform   → 'win32' | 'darwin' | 'linux'.
 *   - window.sigehuDesktop.openPath(name, base64, mime)
 *         Pide al proceso principal escribir `base64` en un archivo temporal
 *         bajo `app.getPath('temp')/sigehu-docs/<name>` y abrirlo con la
 *         aplicación predeterminada del SO vía `shell.openPath`. El proceso
 *         main valida el nombre y restringe la escritura a ese directorio; el
 *         renderer jamás recibe rutas reales ni accede al fs.
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sigehuLog', {
  write: (entry) => {
    if (entry && typeof entry === 'object') {
      ipcRenderer.send('sigehu:log', entry);
    }
  },
  getLogFile: () => ipcRenderer.invoke('sigehu:get-log-file'),
});

contextBridge.exposeInMainWorld('sigehuDesktop', {
  isElectron: true,
  platform: process.platform,
  openPath: (filename, base64Data, mimeType) =>
    ipcRenderer.invoke('sigehu:open-path', { filename, base64Data, mimeType }),
});
