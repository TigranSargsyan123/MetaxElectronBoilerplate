const { app, BrowserWindow } = require('electron')
const child_process = require('child_process');

var metax_process;

// Starts metax
function metax_start() {
  metax_process = child_process.execFile('./metax_web_api', ['-f', 'config.xml'], (err, stdout, stderr) => {
  if(err) {
    console.log(`this is child process error - ${err}`);
  }
  });
}

// Stops metax
function metax_stop() {
  metax_process.kill();  
}

// Opens web page in a browser window
function createWindow() {
  let win = new BrowserWindow({
    width: 1280,
    height: 720,
    webPreferences: {
      nodeIntegration: true,
    }
  })
  // Loads index.html file into a new BrowserWindow instance
  win.loadFile('index.html');
}

// Browser windows can only be created when app module's ready event is fired.
// On macOS it's common to re-create a window in the app when the
// dock icon is clicked and there are no other windows open.
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if(BrowserWindow.getAllWindows().length === 0) {
      //metax_start();
      createWindow()
    }
  })
})

// On macOS it is common for applications and their menu bar
// to stay active until the user quits explicitly with Cmd + Q
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
  //metax_stop();
})

metax_start();
//createWindow();
