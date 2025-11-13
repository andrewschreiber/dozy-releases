const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Permission checks
  checkPermissions: () => ipcRenderer.invoke('check-permissions'),
  requestPermissions: () => ipcRenderer.invoke('request-permissions'),

  // Hotkey management
  registerHotkey: (hotkey) => ipcRenderer.invoke('register-hotkey', hotkey),
  unregisterHotkey: (hotkeyId) => ipcRenderer.invoke('unregister-hotkey', hotkeyId),

  // Event monitoring
  startMonitoring: (options) => ipcRenderer.invoke('start-monitoring', options),
  stopMonitoring: () => ipcRenderer.invoke('stop-monitoring'),

  // Event listeners
  onHotkeyTriggered: (callback) => {
    ipcRenderer.on('hotkey-triggered', (event, data) => callback(data));
  },

  onKeyEvent: (callback) => {
    ipcRenderer.on('key-event', (event, data) => callback(data));
  },

  onError: (callback) => {
    ipcRenderer.on('error', (event, message) => callback(message));
  },

  // Remove listeners
  removeHotkeyListener: () => {
    ipcRenderer.removeAllListeners('hotkey-triggered');
  },

  removeKeyEventListener: () => {
    ipcRenderer.removeAllListeners('key-event');
  },

  removeErrorListener: () => {
    ipcRenderer.removeAllListeners('error');
  }
});
