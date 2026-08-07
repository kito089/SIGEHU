const path = require('path');
const fs = require('fs');
const { app, BrowserWindow, Menu } = require('electron');
const { spawn } = require('child_process');

function resolveConfigPath() {
    const candidates = [
        path.join(process.resourcesPath, 'backend', 'config.json'),
        path.join(process.resourcesPath, 'config.json'),
        path.join(__dirname, '..', '..', 'SIGEHUBack', 'config.json')
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    return candidates[candidates.length - 1];
}

const config = require(resolveConfigPath());

let backend;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'SIGEHU',
    icon: path.join(__dirname, '..', 'dist', 'assets', 'icon.png'),
    autoHideMenuBar: true,
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  win.setMenu(null);
  Menu.setApplicationMenu(null);
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  backend = spawn(
    path.join(process.resourcesPath, 'backend', 'sigehu-back.exe'),
    [],
    {
      windowsHide: true
    }
  );
  createWindow();
});

app.on('before-quit', () => {
  if (backend) {
      backend.kill();
  }
});