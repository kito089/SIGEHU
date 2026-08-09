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
});
