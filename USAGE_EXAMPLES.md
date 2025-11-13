# EventTapper Electron Wrapper - Usage Examples

This document provides practical examples for using the EventTapper Electron wrapper.

## Table of Contents

1. [Basic Setup](#basic-setup)
2. [Hotkey Registration](#hotkey-registration)
3. [Event Monitoring](#event-monitoring)
4. [Real-World Use Cases](#real-world-use-cases)
5. [Best Practices](#best-practices)

---

## Basic Setup

### Initialize the Bridge

```javascript
const { EventTapperBridge } = require('./src/eventtapper-bridge');

const bridge = new EventTapperBridge();

// Wait for the bridge to be ready
bridge.on('ready', () => {
  console.log('EventTapper is ready!');
  // Start using the bridge
});

// Handle errors
bridge.on('error', (error) => {
  console.error('EventTapper error:', error.message);
});
```

### Check Permissions

```javascript
const { app, systemPreferences } = require('electron');

function checkPermissions() {
  const isTrusted = systemPreferences.isTrustedAccessibilityClient(false);

  if (!isTrusted) {
    console.log('⚠️  Accessibility permissions not granted');
    // Prompt user
    systemPreferences.isTrustedAccessibilityClient(true);
    return false;
  }

  console.log('✅ Accessibility permissions granted');
  return true;
}

app.whenReady().then(() => {
  if (checkPermissions()) {
    // Initialize EventTapper
  }
});
```

---

## Hotkey Registration

### Example 1: Single Hotkey

Register a simple hotkey (Command+K):

```javascript
const bridge = new EventTapperBridge();

bridge.on('ready', () => {
  const hotkeyId = bridge.registerHotkey(['K'], ['command']);

  console.log('Hotkey registered with ID:', hotkeyId);

  bridge.on('hotkey', (event) => {
    if (event.id === hotkeyId) {
      console.log('Command+K pressed!');
      // Perform action
    }
  });
});
```

### Example 2: Multiple Modifiers

Register a hotkey with multiple modifiers (Command+Shift+Option+K):

```javascript
const hotkeyId = bridge.registerHotkey(
  ['K'],
  ['command', 'shift', 'option']
);
```

### Example 3: Multiple Keys

Register a chord (Command+K, then T):

```javascript
// Note: EventTapper may not support chords directly
// This example shows how you could implement it

let commandKPressed = false;

bridge.registerHotkey(['K'], ['command']);
bridge.registerHotkey(['T'], []);

bridge.on('keydown', (event) => {
  if (event.key === 'K' && event.modifiers.includes('command')) {
    commandKPressed = true;

    setTimeout(() => {
      commandKPressed = false;
    }, 1000); // Reset after 1 second
  }

  if (event.key === 'T' && commandKPressed) {
    console.log('Command+K, T chord detected!');
    commandKPressed = false;
  }
});
```

### Example 4: Hotkey Manager Class

Create a reusable hotkey manager:

```javascript
class HotkeyManager {
  constructor(bridge) {
    this.bridge = bridge;
    this.hotkeys = new Map();

    this.bridge.on('hotkey', (event) => {
      const handler = this.hotkeys.get(event.id);
      if (handler) {
        handler(event);
      }
    });
  }

  register(keys, modifiers, handler) {
    const id = this.bridge.registerHotkey(keys, modifiers);
    this.hotkeys.set(id, handler);

    return {
      id,
      unregister: () => this.unregister(id)
    };
  }

  unregister(id) {
    this.bridge.unregisterHotkey(id);
    this.hotkeys.delete(id);
  }
}

// Usage
const manager = new HotkeyManager(bridge);

const hotkey1 = manager.register(['K'], ['command'], () => {
  console.log('Command+K');
});

const hotkey2 = manager.register(['S'], ['command'], () => {
  console.log('Command+S');
});

// Unregister later
hotkey1.unregister();
```

### Example 5: Dynamic Hotkey Configuration

Load hotkeys from configuration:

```javascript
const config = {
  hotkeys: [
    { keys: ['K'], modifiers: ['command'], action: 'search' },
    { keys: ['S'], modifiers: ['command'], action: 'save' },
    { keys: ['O'], modifiers: ['command'], action: 'open' },
  ]
};

const actions = {
  search: () => console.log('Opening search...'),
  save: () => console.log('Saving...'),
  open: () => console.log('Opening file...'),
};

const hotkeyMap = new Map();

config.hotkeys.forEach(({ keys, modifiers, action }) => {
  const id = bridge.registerHotkey(keys, modifiers);
  hotkeyMap.set(id, actions[action]);
});

bridge.on('hotkey', (event) => {
  const action = hotkeyMap.get(event.id);
  if (action) action();
});
```

---

## Event Monitoring

### Example 1: Basic Key Monitoring

Monitor all keyboard events:

```javascript
const bridge = new EventTapperBridge();

bridge.on('ready', () => {
  bridge.startMonitoring({ allKeys: true });
});

bridge.on('keydown', (event) => {
  console.log(`Key pressed: ${event.key} (code: ${event.keyCode})`);
  console.log('Modifiers:', event.modifiers);
});
```

### Example 2: Keystroke Logger

Create a keystroke logger (for debugging):

```javascript
class KeystrokeLogger {
  constructor(bridge) {
    this.bridge = bridge;
    this.log = [];
    this.isLogging = false;
  }

  start() {
    this.isLogging = true;
    this.log = [];
    this.bridge.startMonitoring({ allKeys: true });

    this.bridge.on('keydown', this.handleKey.bind(this));
  }

  stop() {
    this.isLogging = false;
    this.bridge.stopMonitoring();
    return this.log;
  }

  handleKey(event) {
    if (!this.isLogging) return;

    this.log.push({
      key: event.key,
      keyCode: event.keyCode,
      modifiers: event.modifiers,
      timestamp: event.timestamp
    });
  }

  export() {
    return JSON.stringify(this.log, null, 2);
  }
}

// Usage
const logger = new KeystrokeLogger(bridge);

// Start logging
logger.start();

// Stop after 10 seconds
setTimeout(() => {
  const log = logger.stop();
  console.log('Captured keystrokes:', log);
}, 10000);
```

### Example 3: Key Combination Detector

Detect specific key combinations:

```javascript
class CombinationDetector {
  constructor(bridge) {
    this.bridge = bridge;
    this.pressedKeys = new Set();

    this.bridge.on('keydown', (event) => {
      this.pressedKeys.add(event.keyCode);
      this.checkCombinations();
    });

    this.bridge.on('keyup', (event) => {
      this.pressedKeys.delete(event.keyCode);
    });
  }

  checkCombinations() {
    // Check for specific combinations
    // Example: Ctrl+Alt+Delete equivalent
    if (this.pressedKeys.has(59) && // Control
        this.pressedKeys.has(58) && // Option
        this.pressedKeys.has(51)) { // Delete
      console.log('Ctrl+Alt+Delete detected!');
    }
  }
}
```

### Example 4: Typing Speed Analyzer

Analyze typing speed:

```javascript
class TypingAnalyzer {
  constructor(bridge) {
    this.bridge = bridge;
    this.keystrokes = [];
    this.startTime = null;
  }

  start() {
    this.keystrokes = [];
    this.startTime = Date.now();

    this.bridge.startMonitoring({ allKeys: true });

    this.bridge.on('keydown', (event) => {
      // Only count letter keys
      if (event.key && event.key.length === 1) {
        this.keystrokes.push({
          time: event.timestamp,
          key: event.key
        });
      }
    });
  }

  getStats() {
    const duration = (Date.now() - this.startTime) / 1000; // seconds
    const wpm = (this.keystrokes.length / 5) / (duration / 60);

    return {
      totalKeys: this.keystrokes.length,
      duration: duration.toFixed(2),
      wpm: wpm.toFixed(2),
      averageInterval: this.getAverageInterval()
    };
  }

  getAverageInterval() {
    if (this.keystrokes.length < 2) return 0;

    let totalInterval = 0;
    for (let i = 1; i < this.keystrokes.length; i++) {
      totalInterval += this.keystrokes[i].time - this.keystrokes[i-1].time;
    }

    return (totalInterval / (this.keystrokes.length - 1)).toFixed(3);
  }
}

// Usage
const analyzer = new TypingAnalyzer(bridge);
analyzer.start();

// Get stats after some time
setTimeout(() => {
  const stats = analyzer.getStats();
  console.log('Typing statistics:', stats);
}, 30000);
```

---

## Real-World Use Cases

### Use Case 1: Global Search Hotkey

Implement a global search like Spotlight:

```javascript
const { BrowserWindow } = require('electron');

let searchWindow = null;

function createSearchWindow() {
  searchWindow = new BrowserWindow({
    width: 600,
    height: 400,
    show: false,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  searchWindow.loadFile('search.html');
}

function toggleSearch() {
  if (!searchWindow) {
    createSearchWindow();
  }

  if (searchWindow.isVisible()) {
    searchWindow.hide();
  } else {
    searchWindow.show();
    searchWindow.focus();
  }
}

// Register Command+Space
const bridge = new EventTapperBridge();

bridge.on('ready', () => {
  bridge.registerHotkey(['Space'], ['command']);

  bridge.on('hotkey', () => {
    toggleSearch();
  });
});
```

### Use Case 2: Clipboard Manager

Create a clipboard history manager:

```javascript
const { clipboard } = require('electron');

class ClipboardManager {
  constructor(bridge, hotkeyManager) {
    this.history = [];
    this.maxHistory = 50;

    // Monitor clipboard
    setInterval(() => {
      const text = clipboard.readText();
      if (text && text !== this.history[0]) {
        this.history.unshift(text);
        if (this.history.length > this.maxHistory) {
          this.history.pop();
        }
      }
    }, 500);

    // Register Command+Shift+V to show history
    hotkeyManager.register(['V'], ['command', 'shift'], () => {
      this.showHistory();
    });
  }

  showHistory() {
    // Show window with clipboard history
    console.log('Clipboard history:', this.history);
  }
}
```

### Use Case 3: Window Manager

Create a window management system:

```javascript
class WindowManager {
  constructor(bridge) {
    this.setupHotkeys(bridge);
  }

  setupHotkeys(bridge) {
    const hotkeys = {
      'left-half': { keys: ['Left'], modifiers: ['command', 'option'] },
      'right-half': { keys: ['Right'], modifiers: ['command', 'option'] },
      'maximize': { keys: ['Up'], modifiers: ['command', 'option'] },
      'center': { keys: ['Down'], modifiers: ['command', 'option'] }
    };

    Object.entries(hotkeys).forEach(([action, { keys, modifiers }]) => {
      const id = bridge.registerHotkey(keys, modifiers);

      bridge.on('hotkey', (event) => {
        if (event.id === id) {
          this.handleWindowAction(action);
        }
      });
    });
  }

  handleWindowAction(action) {
    const { screen, BrowserWindow } = require('electron');
    const window = BrowserWindow.getFocusedWindow();

    if (!window) return;

    const display = screen.getPrimaryDisplay();
    const { width, height } = display.workAreaSize;

    switch (action) {
      case 'left-half':
        window.setBounds({ x: 0, y: 0, width: width / 2, height });
        break;
      case 'right-half':
        window.setBounds({ x: width / 2, y: 0, width: width / 2, height });
        break;
      case 'maximize':
        window.maximize();
        break;
      case 'center':
        window.center();
        break;
    }
  }
}
```

### Use Case 4: Focus Mode

Implement a focus mode that blocks distracting keys:

```javascript
class FocusMode {
  constructor(bridge) {
    this.bridge = bridge;
    this.isActive = false;
    this.blockedKeys = new Set(['F1', 'F2', 'F3']); // Block function keys
  }

  enable() {
    this.isActive = true;
    this.bridge.startMonitoring({ allKeys: true });

    this.bridge.on('keydown', (event) => {
      if (this.isActive && this.blockedKeys.has(event.key)) {
        console.log(`Blocked key: ${event.key}`);
        // In a real implementation, you'd actually block the event
        // EventTapper would need to support event suppression
      }
    });

    console.log('Focus mode enabled');
  }

  disable() {
    this.isActive = false;
    this.bridge.stopMonitoring();
    console.log('Focus mode disabled');
  }

  toggle() {
    if (this.isActive) {
      this.disable();
    } else {
      this.enable();
    }
  }
}

// Toggle with Command+Shift+F
const focusMode = new FocusMode(bridge);

bridge.registerHotkey(['F'], ['command', 'shift']);
bridge.on('hotkey', () => {
  focusMode.toggle();
});
```

---

## Best Practices

### 1. Always Check Permissions

```javascript
function initializeEventTapper() {
  if (!checkPermissions()) {
    showPermissionDialog();
    return;
  }

  const bridge = new EventTapperBridge();
  // ... continue setup
}
```

### 2. Clean Up Properly

```javascript
app.on('will-quit', () => {
  if (bridge) {
    bridge.destroy();
  }
});
```

### 3. Handle Errors Gracefully

```javascript
bridge.on('error', (error) => {
  console.error('EventTapper error:', error);

  // Show user-friendly message
  dialog.showErrorBox(
    'Hotkey Error',
    'Failed to register hotkey. Please check permissions.'
  );
});
```

### 4. Don't Over-Monitor

```javascript
// Bad: Monitor all keys continuously
bridge.startMonitoring({ allKeys: true });

// Good: Only monitor when needed
function startRecording() {
  bridge.startMonitoring({ allKeys: true });
}

function stopRecording() {
  bridge.stopMonitoring();
}
```

### 5. Use Meaningful Hotkeys

```javascript
// Avoid conflicting with system hotkeys
const badHotkey = bridge.registerHotkey(['Q'], ['command']); // Conflicts with Quit

// Use unique combinations
const goodHotkey = bridge.registerHotkey(['K'], ['command', 'shift']);
```

### 6. Provide Visual Feedback

```javascript
bridge.on('hotkey', (event) => {
  // Show brief notification
  new Notification('Hotkey Triggered', {
    body: 'Command+Shift+K activated'
  });

  // Or flash the window
  const window = BrowserWindow.getFocusedWindow();
  window.flashFrame(true);
  setTimeout(() => window.flashFrame(false), 500);
});
```

---

## Testing

### Unit Test Example

```javascript
const assert = require('assert');
const { EventTapperBridge } = require('./src/eventtapper-bridge');

describe('EventTapperBridge', () => {
  let bridge;

  beforeEach(() => {
    bridge = new EventTapperBridge();
  });

  afterEach(() => {
    bridge.destroy();
  });

  it('should register a hotkey', (done) => {
    bridge.on('ready', () => {
      const id = bridge.registerHotkey(['K'], ['command']);
      assert.ok(id);
      assert.equal(typeof id, 'string');
      done();
    });
  });

  it('should emit hotkey events', (done) => {
    bridge.on('ready', () => {
      const id = bridge.registerHotkey(['K'], ['command']);

      bridge.on('hotkey', (event) => {
        assert.equal(event.id, id);
        done();
      });

      // Simulate hotkey press (you'd need to actually press it)
    });
  });
});
```

---

For more information, see:
- [API Documentation](API_DOCUMENTATION.md)
- [Setup Guide](SETUP.md)
- [Architecture Plan](ELECTRON_WRAPPER_PLAN.md)
