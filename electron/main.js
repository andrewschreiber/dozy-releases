const { app, BrowserWindow, ipcMain, systemPreferences } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const { EventTapperBridge } = require('../src/eventtapper-bridge');

let mainWindow;
let eventTapperBridge;

// Check for accessibility permissions
function checkAccessibilityPermissions() {
  const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);

  if (!isTrusted) {
    console.log('⚠️  Accessibility permissions not granted');
    return false;
  }

  console.log('✅ Accessibility permissions granted');
  return true;
}

// Request accessibility permissions
function requestAccessibilityPermissions() {
  systemPreferences.isTrustedAccessibilityClient(true);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Open DevTools in development
  if (process.env.NODE_ENV === 'development') {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  // Check permissions on startup
  const hasPermissions = checkAccessibilityPermissions();

  createWindow();

  // Initialize EventTapper bridge
  eventTapperBridge = new EventTapperBridge();

  // Forward events to renderer
  eventTapperBridge.on('hotkey', (event) => {
    mainWindow.webContents.send('hotkey-triggered', event);
  });

  eventTapperBridge.on('keydown', (event) => {
    mainWindow.webContents.send('key-event', event);
  });

  eventTapperBridge.on('error', (error) => {
    console.error('EventTapper error:', error);
    mainWindow.webContents.send('error', error.message);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (eventTapperBridge) {
    eventTapperBridge.destroy();
  }

  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('check-permissions', async () => {
  return checkAccessibilityPermissions();
});

ipcMain.handle('request-permissions', async () => {
  requestAccessibilityPermissions();
  return true;
});

ipcMain.handle('register-hotkey', async (event, hotkey) => {
  if (!eventTapperBridge) {
    throw new Error('EventTapper bridge not initialized');
  }

  const id = eventTapperBridge.registerHotkey(hotkey.keys, hotkey.modifiers);
  return id;
});

ipcMain.handle('unregister-hotkey', async (event, hotkeyId) => {
  if (!eventTapperBridge) {
    throw new Error('EventTapper bridge not initialized');
  }

  eventTapperBridge.unregisterHotkey(hotkeyId);
  return true;
});

ipcMain.handle('start-monitoring', async (event, options) => {
  if (!eventTapperBridge) {
    throw new Error('EventTapper bridge not initialized');
  }

  eventTapperBridge.startMonitoring(options);
  return true;
});

ipcMain.handle('stop-monitoring', async () => {
  if (!eventTapperBridge) {
    throw new Error('EventTapper bridge not initialized');
  }

  eventTapperBridge.stopMonitoring();
  return true;
});
