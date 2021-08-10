const { app, BrowserWindow } = require('electron')
const child_process = require('child_process');

var metax_process;

function metax_start() {
  metax_process = child_process.execFile('./metax/bin/metax_web_api', ['-f', './metax/config.xml'], (err, stdout, stderr) => {
  if(err) {
    console.log(`this is child process error - ${err}`);
  }
  });
}

function metax_stop() {
  metax_process.kill();  
}

function createWindow() {
  let win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
    }
  })
  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

metax_start();
