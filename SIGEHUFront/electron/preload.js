/**
 * SIGEHU — Preload de Electron.
 *
 * Expone al renderer (Angular) un puente seguro y mínimo para persistir los
 * logs en el archivo del proceso principal, sin otorgar acceso directo a Node.
 */

'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('sigehuLog', {
  write: (entry) => {
    if (entry && typeof entry === 'object') {
      ipcRenderer.send('sigehu:log', entry);
    }
  },
});