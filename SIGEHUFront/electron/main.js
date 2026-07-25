const config = require('../../SIGEHUBack/config.json');
const { BrowserWindow } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let backend;
let zrokProcess;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, '../src/assets/icon/icon.ico'),
    autoHideMenuBar: true,
  });

  win.loadFile(path.join(__dirname,'../dist/index.html'));
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
  zrokProcess = spawn('zrok2', ['share', 'public', `http://localhost:${config.apiPort}`, '-n', `${config.zrokName}`], {
        stdio: ['ignore', 'pipe', 'pipe'], 
        windowsHide: true 
    }
  );
  createWindow();
});

app.on('before-quit', () => {
  if (backend) {
      backend.kill();
  }
  if (zrokProcess) {
      zrokProcess.kill();
  }
});