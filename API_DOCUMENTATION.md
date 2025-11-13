# EventTapper Electron Wrapper - API Documentation

## Table of Contents

1. [JavaScript API](#javascript-api)
2. [IPC Protocol](#ipc-protocol)
3. [Swift Bridge Protocol](#swift-bridge-protocol)
4. [Event Types](#event-types)
5. [Examples](#examples)

---

## JavaScript API

### EventTapperBridge Class

The main interface for communicating with the native Swift bridge.

#### Constructor

```javascript
const { EventTapperBridge } = require('./src/eventtapper-bridge');

const bridge = new EventTapperBridge();
```

#### Methods

##### `registerHotkey(keys, modifiers)`

Register a global hotkey combination.

**Parameters:**
- `keys` (Array<string>): Array of key names, e.g., `['K']`
- `modifiers` (Array<string>): Array of modifiers: `['command', 'shift', 'option', 'control']`

**Returns:** `string` - Unique hotkey ID

**Example:**
```javascript
const hotkeyId = bridge.registerHotkey(['K'], ['command', 'shift']);
// Registers Command+Shift+K
```

##### `unregisterHotkey(hotkeyId)`

Unregister a previously registered hotkey.

**Parameters:**
- `hotkeyId` (string): The hotkey ID returned from `registerHotkey()`

**Example:**
```javascript
bridge.unregisterHotkey(hotkeyId);
```

##### `startMonitoring(options)`

Start monitoring all keyboard and mouse events.

**Parameters:**
- `options` (Object): Monitoring configuration
  - `allKeys` (boolean): Monitor all key events (default: true)
  - `mouseEvents` (boolean): Monitor mouse events (default: false)

**Example:**
```javascript
bridge.startMonitoring({ allKeys: true });
```

##### `stopMonitoring()`

Stop monitoring events.

**Example:**
```javascript
bridge.stopMonitoring();
```

##### `destroy()`

Clean up and destroy the bridge. Call this when shutting down.

**Example:**
```javascript
bridge.destroy();
```

#### Events

The bridge extends `EventEmitter`, so you can listen to events using `.on()`.

##### Event: `'ready'`

Emitted when the Swift bridge is connected and ready.

```javascript
bridge.on('ready', () => {
  console.log('Bridge ready');
});
```

##### Event: `'hotkey'`

Emitted when a registered hotkey is triggered.

**Payload:**
```javascript
{
  type: 'hotkey-triggered',
  id: 'uuid-of-hotkey',
  timestamp: 1234567890.123
}
```

**Example:**
```javascript
bridge.on('hotkey', (event) => {
  console.log(`Hotkey ${event.id} triggered`);
});
```

##### Event: `'keydown'`

Emitted when a key is pressed (when monitoring is active).

**Payload:**
```javascript
{
  type: 'keydown',
  keyCode: 0,
  key: 'a',
  modifiers: ['command', 'shift'],
  timestamp: 1234567890.123
}
```

**Example:**
```javascript
bridge.on('keydown', (event) => {
  console.log(`Key pressed: ${event.key}`);
});
```

##### Event: `'error'`

Emitted when an error occurs.

**Payload:** `Error` object

**Example:**
```javascript
bridge.on('error', (error) => {
  console.error('Error:', error.message);
});
```

##### Event: `'exit'`

Emitted when the Swift bridge process exits.

**Payload:**
```javascript
{
  code: 0,
  signal: null
}
```

**Example:**
```javascript
bridge.on('exit', ({ code, signal }) => {
  console.log(`Bridge exited with code ${code}`);
});
```

---

## IPC Protocol

The Electron main and renderer processes communicate via IPC.

### Main Process → Renderer Process

#### Channel: `'hotkey-triggered'`

Sent when a hotkey is triggered.

**Payload:** Same as `'hotkey'` event

#### Channel: `'key-event'`

Sent when a key event occurs.

**Payload:** Same as `'keydown'` event

#### Channel: `'error'`

Sent when an error occurs.

**Payload:** `string` - Error message

### Renderer Process → Main Process

All renderer-to-main communication uses `ipcRenderer.invoke()`.

#### Handle: `'check-permissions'`

Check if Accessibility permissions are granted.

**Returns:** `boolean`

**Example:**
```javascript
const hasPermissions = await window.electronAPI.checkPermissions();
```

#### Handle: `'request-permissions'`

Request Accessibility permissions (opens System Preferences).

**Returns:** `boolean` - Always `true`

**Example:**
```javascript
await window.electronAPI.requestPermissions();
```

#### Handle: `'register-hotkey'`

Register a hotkey.

**Parameters:**
```javascript
{
  keys: ['K'],
  modifiers: ['command', 'shift']
}
```

**Returns:** `string` - Hotkey ID

**Example:**
```javascript
const id = await window.electronAPI.registerHotkey({
  keys: ['K'],
  modifiers: ['command', 'shift']
});
```

#### Handle: `'unregister-hotkey'`

Unregister a hotkey.

**Parameters:** `string` - Hotkey ID

**Returns:** `boolean` - Always `true`

**Example:**
```javascript
await window.electronAPI.unregisterHotkey(hotkeyId);
```

#### Handle: `'start-monitoring'`

Start event monitoring.

**Parameters:** Monitoring options object

**Returns:** `boolean` - Always `true`

**Example:**
```javascript
await window.electronAPI.startMonitoring({ allKeys: true });
```

#### Handle: `'stop-monitoring'`

Stop event monitoring.

**Returns:** `boolean` - Always `true`

**Example:**
```javascript
await window.electronAPI.stopMonitoring();
```

---

## Swift Bridge Protocol

The Swift bridge communicates via JSON over stdin/stdout.

### Node.js → Swift

All commands are JSON objects sent via stdin, terminated with `\n`.

#### Command: `register-hotkey`

```json
{
  "type": "register-hotkey",
  "data": {
    "id": "uuid-v4",
    "keys": ["K"],
    "modifiers": ["command", "shift"]
  }
}
```

#### Command: `unregister-hotkey`

```json
{
  "type": "unregister-hotkey",
  "data": {
    "id": "uuid-v4"
  }
}
```

#### Command: `start-monitoring`

```json
{
  "type": "start-monitoring",
  "data": {
    "allKeys": true
  }
}
```

#### Command: `stop-monitoring`

```json
{
  "type": "stop-monitoring",
  "data": {}
}
```

#### Command: `ping`

```json
{
  "type": "ping"
}
```

### Swift → Node.js

All responses are JSON objects sent via stdout, terminated with `\n`.

#### Response: `pong`

```json
{
  "type": "pong"
}
```

#### Response: `success`

```json
{
  "type": "success",
  "data": {
    "id": "uuid-v4",
    "registered": true
  }
}
```

#### Response: `hotkey-triggered`

```json
{
  "type": "hotkey-triggered",
  "id": "uuid-v4",
  "timestamp": 1234567890.123
}
```

#### Response: `keydown` / `keyup`

```json
{
  "type": "keydown",
  "keyCode": 0,
  "key": "a",
  "modifiers": ["command"],
  "timestamp": 1234567890.123
}
```

#### Response: `error`

```json
{
  "type": "error",
  "message": "Error description"
}
```

---

## Event Types

### Keyboard Modifiers

Available modifier keys:

- `command` - Command (⌘) key
- `shift` - Shift (⇧) key
- `option` - Option/Alt (⌥) key
- `control` - Control (⌃) key

### Key Codes

Key codes are macOS virtual key codes. Common examples:

- `0` - A
- `11` - B
- `8` - C
- `36` - Return
- `49` - Space
- `51` - Delete
- `53` - Escape

See [Apple's Virtual Key Codes](https://developer.apple.com/documentation/appkit/1535851-virtual_key_codes) for complete list.

---

## Examples

### Example 1: Simple Hotkey Registration

```javascript
const { EventTapperBridge } = require('./src/eventtapper-bridge');

const bridge = new EventTapperBridge();

bridge.on('ready', () => {
  // Register Command+Shift+K
  const id = bridge.registerHotkey(['K'], ['command', 'shift']);

  // Listen for hotkey
  bridge.on('hotkey', (event) => {
    if (event.id === id) {
      console.log('Command+Shift+K pressed!');
    }
  });
});
```

### Example 2: Monitor All Keys

```javascript
const bridge = new EventTapperBridge();

bridge.on('ready', () => {
  bridge.startMonitoring({ allKeys: true });
});

bridge.on('keydown', (event) => {
  console.log(`Key: ${event.key}, Code: ${event.keyCode}`);
  console.log(`Modifiers: ${event.modifiers.join(', ')}`);
});
```

### Example 3: Multiple Hotkeys

```javascript
const bridge = new EventTapperBridge();

const hotkeys = {
  'search': bridge.registerHotkey(['F'], ['command']),
  'quit': bridge.registerHotkey(['Q'], ['command']),
  'save': bridge.registerHotkey(['S'], ['command'])
};

bridge.on('hotkey', (event) => {
  switch (event.id) {
    case hotkeys.search:
      console.log('Search triggered');
      break;
    case hotkeys.quit:
      console.log('Quit triggered');
      break;
    case hotkeys.save:
      console.log('Save triggered');
      break;
  }
});
```

### Example 4: Error Handling

```javascript
const bridge = new EventTapperBridge();

bridge.on('error', (error) => {
  console.error('Bridge error:', error.message);

  if (error.message.includes('permissions')) {
    // Prompt user to grant permissions
    showPermissionDialog();
  }
});

bridge.on('exit', ({ code, signal }) => {
  if (code !== 0) {
    console.error('Bridge crashed, attempting restart...');
    // Implement restart logic
  }
});
```

### Example 5: Electron Renderer Integration

```javascript
// In renderer process
document.getElementById('register-btn').addEventListener('click', async () => {
  const hotkey = {
    keys: ['K'],
    modifiers: ['command', 'shift']
  };

  try {
    const id = await window.electronAPI.registerHotkey(hotkey);
    console.log('Registered hotkey:', id);
  } catch (error) {
    console.error('Failed to register:', error);
  }
});

window.electronAPI.onHotkeyTriggered((event) => {
  document.body.classList.add('hotkey-active');
  setTimeout(() => {
    document.body.classList.remove('hotkey-active');
  }, 200);
});
```

---

## Type Definitions

For TypeScript projects, here are the type definitions:

```typescript
declare module 'eventtapper-bridge' {
  import { EventEmitter } from 'events';

  export interface HotkeyOptions {
    keys: string[];
    modifiers: string[];
  }

  export interface HotkeyEvent {
    type: 'hotkey-triggered';
    id: string;
    timestamp: number;
  }

  export interface KeyEvent {
    type: 'keydown' | 'keyup';
    keyCode: number;
    key?: string;
    modifiers: string[];
    timestamp: number;
  }

  export interface MonitoringOptions {
    allKeys?: boolean;
    mouseEvents?: boolean;
  }

  export class EventTapperBridge extends EventEmitter {
    constructor();
    registerHotkey(keys: string[], modifiers: string[]): string;
    unregisterHotkey(hotkeyId: string): void;
    startMonitoring(options?: MonitoringOptions): void;
    stopMonitoring(): void;
    destroy(): void;

    on(event: 'ready', listener: () => void): this;
    on(event: 'hotkey', listener: (event: HotkeyEvent) => void): this;
    on(event: 'keydown', listener: (event: KeyEvent) => void): this;
    on(event: 'error', listener: (error: Error) => void): this;
    on(event: 'exit', listener: (info: { code: number; signal: string }) => void): this;
  }
}
```

---

## Notes

- All timestamps are Unix timestamps (seconds since epoch) with millisecond precision
- UUIDs are generated using UUID v4
- The Swift bridge must have Accessibility permissions to function
- Event monitoring can impact performance; use sparingly
- Hotkeys are global and will trigger even when your app is in the background
