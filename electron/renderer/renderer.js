// Renderer process logic
let registeredHotkeys = new Map();
let isMonitoring = false;
let stats = {
  hotkeysTriggered: 0,
  keysPressed: 0
};

// DOM Elements
const permissionIndicator = document.getElementById('permission-indicator');
const permissionText = document.getElementById('permission-text');
const requestPermissionsBtn = document.getElementById('request-permissions-btn');
const hotkeyInput = document.getElementById('hotkey-input');
const registerHotkeyBtn = document.getElementById('register-hotkey-btn');
const hotkeyList = document.getElementById('hotkey-list');
const startMonitoringBtn = document.getElementById('start-monitoring-btn');
const stopMonitoringBtn = document.getElementById('stop-monitoring-btn');
const eventLogContainer = document.getElementById('event-log-container');
const clearLogBtn = document.getElementById('clear-log-btn');
const statHotkeys = document.getElementById('stat-hotkeys');
const statKeys = document.getElementById('stat-keys');
const statMonitoring = document.getElementById('stat-monitoring');

// Initialize
async function init() {
  await checkPermissions();
  setupEventListeners();
  setupHotkeyInput();
}

// Check permissions
async function checkPermissions() {
  try {
    const hasPermissions = await window.electronAPI.checkPermissions();

    if (hasPermissions) {
      permissionIndicator.className = 'indicator granted';
      permissionText.textContent = 'Accessibility permissions granted ✓';
      requestPermissionsBtn.style.display = 'none';
    } else {
      permissionIndicator.className = 'indicator denied';
      permissionText.textContent = 'Accessibility permissions required';
      requestPermissionsBtn.style.display = 'block';
    }
  } catch (error) {
    console.error('Error checking permissions:', error);
    logEvent('Error checking permissions: ' + error.message, 'error');
  }
}

// Setup event listeners
function setupEventListeners() {
  requestPermissionsBtn.addEventListener('click', async () => {
    await window.electronAPI.requestPermissions();
    logEvent('Opening System Preferences...', 'info');
    setTimeout(checkPermissions, 2000);
  });

  registerHotkeyBtn.addEventListener('click', registerHotkey);
  startMonitoringBtn.addEventListener('click', startMonitoring);
  stopMonitoringBtn.addEventListener('click', stopMonitoring);
  clearLogBtn.addEventListener('click', clearLog);

  // Listen for hotkey events
  window.electronAPI.onHotkeyTriggered((event) => {
    stats.hotkeysTriggered++;
    updateStats();
    logEvent(`Hotkey triggered: ${event.id}`, 'hotkey');
  });

  // Listen for key events
  window.electronAPI.onKeyEvent((event) => {
    stats.keysPressed++;
    updateStats();
    logEvent(`Key: ${event.keyCode} (${event.key || 'unknown'})`, 'key');
  });

  // Listen for errors
  window.electronAPI.onError((message) => {
    logEvent(`Error: ${message}`, 'error');
  });
}

// Setup hotkey input
function setupHotkeyInput() {
  let pressedKeys = new Set();
  let modifiers = new Set();

  hotkeyInput.addEventListener('keydown', (e) => {
    e.preventDefault();

    // Detect modifiers
    if (e.metaKey) modifiers.add('Command');
    if (e.shiftKey) modifiers.add('Shift');
    if (e.altKey) modifiers.add('Option');
    if (e.ctrlKey) modifiers.add('Control');

    // Add the key
    if (!['Meta', 'Shift', 'Alt', 'Control'].includes(e.key)) {
      pressedKeys.add(e.key.toUpperCase());
    }

    // Update display
    updateHotkeyDisplay(modifiers, pressedKeys);
  });

  hotkeyInput.addEventListener('keyup', (e) => {
    // Keep the combination displayed
  });

  hotkeyInput.addEventListener('blur', () => {
    pressedKeys.clear();
    modifiers.clear();
  });
}

function updateHotkeyDisplay(modifiers, keys) {
  const modArray = Array.from(modifiers);
  const keyArray = Array.from(keys);
  const combo = [...modArray, ...keyArray].join('+');
  hotkeyInput.value = combo;
}

// Register hotkey
async function registerHotkey() {
  const hotkeyCombo = hotkeyInput.value.trim();

  if (!hotkeyCombo) {
    logEvent('Please enter a hotkey combination', 'error');
    return;
  }

  try {
    const parts = hotkeyCombo.split('+');
    const modifiers = [];
    const keys = [];

    parts.forEach(part => {
      const lower = part.toLowerCase();
      if (['command', 'shift', 'option', 'control'].includes(lower)) {
        modifiers.push(lower);
      } else {
        keys.push(part);
      }
    });

    const id = await window.electronAPI.registerHotkey({
      keys: keys,
      modifiers: modifiers
    });

    registeredHotkeys.set(id, hotkeyCombo);
    addHotkeyToList(id, hotkeyCombo);
    logEvent(`Registered hotkey: ${hotkeyCombo}`, 'success');
    hotkeyInput.value = '';
  } catch (error) {
    logEvent(`Failed to register hotkey: ${error.message}`, 'error');
  }
}

// Add hotkey to list
function addHotkeyToList(id, combo) {
  const li = document.createElement('li');
  li.innerHTML = `
    <span class="hotkey-combo">${combo}</span>
    <button class="hotkey-remove" data-id="${id}">Remove</button>
  `;

  li.querySelector('.hotkey-remove').addEventListener('click', () => {
    unregisterHotkey(id);
  });

  hotkeyList.appendChild(li);
}

// Unregister hotkey
async function unregisterHotkey(id) {
  try {
    await window.electronAPI.unregisterHotkey(id);
    registeredHotkeys.delete(id);

    // Remove from UI
    const li = hotkeyList.querySelector(`[data-id="${id}"]`).parentElement;
    li.remove();

    logEvent(`Unregistered hotkey: ${id}`, 'info');
  } catch (error) {
    logEvent(`Failed to unregister hotkey: ${error.message}`, 'error');
  }
}

// Start monitoring
async function startMonitoring() {
  try {
    await window.electronAPI.startMonitoring({ allKeys: true });
    isMonitoring = true;
    startMonitoringBtn.disabled = true;
    stopMonitoringBtn.disabled = false;
    statMonitoring.textContent = 'Active';
    logEvent('Started event monitoring', 'success');
  } catch (error) {
    logEvent(`Failed to start monitoring: ${error.message}`, 'error');
  }
}

// Stop monitoring
async function stopMonitoring() {
  try {
    await window.electronAPI.stopMonitoring();
    isMonitoring = false;
    startMonitoringBtn.disabled = false;
    stopMonitoringBtn.disabled = true;
    statMonitoring.textContent = 'Inactive';
    logEvent('Stopped event monitoring', 'info');
  } catch (error) {
    logEvent(`Failed to stop monitoring: ${error.message}`, 'error');
  }
}

// Log event
function logEvent(message, type = 'info') {
  const entry = document.createElement('div');
  entry.className = `log-entry ${type}`;
  const timestamp = new Date().toLocaleTimeString();
  entry.textContent = `[${timestamp}] ${message}`;

  eventLogContainer.insertBefore(entry, eventLogContainer.firstChild);

  // Keep only last 50 entries
  while (eventLogContainer.children.length > 50) {
    eventLogContainer.removeChild(eventLogContainer.lastChild);
  }
}

// Clear log
function clearLog() {
  eventLogContainer.innerHTML = '';
  logEvent('Log cleared', 'info');
}

// Update stats
function updateStats() {
  statHotkeys.textContent = stats.hotkeysTriggered;
  statKeys.textContent = stats.keysPressed;
}

// Initialize on load
init();
