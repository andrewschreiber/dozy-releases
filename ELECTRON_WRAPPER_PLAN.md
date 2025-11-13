# EventTapper Electron Wrapper - Implementation Plan

## Overview

This document outlines the architecture and implementation plan for wrapping the EventTapper Swift library in an Electron application, enabling cross-process global hotkey and event monitoring capabilities.

## EventTapper Library Analysis

### Core Functionality
- **Purpose**: Global keyboard/mouse event monitoring on macOS
- **Technology**: Swift library using CGEventTap (modern, Carbon-free)
- **Capabilities**:
  - System-wide hotkey registration
  - Global keyboard event interception
  - Mouse event monitoring
  - Event filtering (prevents system beeps)

### Components
1. **EventWatcher** - NSEvent-based monitoring (events pass through)
2. **EventTapWrapper** - Low-level CGEventTap interface
3. **EventTapper** - High-level developer-friendly API

### Requirements
- macOS only (uses Core Graphics APIs)
- Accessibility permissions required
- Background operation support

## Architecture Design

### Layer 1: Swift Native Module
```
EventTapper (Swift Library)
         ↓
Native Swift Bridge (Objective-C++ wrapper)
         ↓
Node.js Native Addon (N-API)
         ↓
JavaScript Module
```

### Layer 2: Electron Integration
```
Electron Main Process
         ↓
IPC Bridge (electron.ipcMain)
         ↓
Renderer Process (UI)
```

## Implementation Strategy

### Approach 1: Native Node Addon (Recommended)

**Pros:**
- Direct integration with EventTapper
- Best performance
- Full control over native functionality

**Cons:**
- Requires compilation toolchain
- macOS-only
- Complex build setup

**Tech Stack:**
- **node-gyp**: Build native addons
- **Objective-C++**: Bridge Swift to C++
- **N-API**: Stable Node.js addon API
- **Swift Package Manager**: Integrate EventTapper

### Approach 2: Swift CLI + IPC (Alternative)

**Pros:**
- Simpler build process
- Easier to debug
- Can be deployed as separate binary

**Cons:**
- Higher latency (process communication)
- More complex state management
- Additional process overhead

### Approach 3: Hybrid (Recommended for MVP)

Use a Swift CLI tool that communicates via stdout/stdin or Unix sockets with the Electron app. This provides:
- Rapid prototyping
- Easier maintenance
- Clean separation of concerns

## Project Structure

```
electron-eventtapper/
├── electron/
│   ├── main.js                 # Electron main process
│   ├── preload.js             # Preload script
│   └── renderer/
│       ├── index.html         # UI
│       ├── renderer.js        # Renderer process logic
│       └── styles.css         # Styling
├── native/
│   ├── EventTapperBridge/     # Swift Package
│   │   ├── Package.swift
│   │   ├── Sources/
│   │   │   └── main.swift     # Native bridge
│   │   └── Dependencies/
│   │       └── EventTapper/   # Git submodule
│   └── binding.gyp            # (If using native addon)
├── src/
│   ├── index.js               # Entry point
│   └── eventtapper.js         # JavaScript API wrapper
├── package.json
├── README.md
└── .gitmodules                # For EventTapper submodule
```

## Implementation Phases

### Phase 1: Setup & Foundation
1. Initialize Electron project
2. Add EventTapper as git submodule
3. Create Swift CLI bridge tool
4. Set up build scripts

### Phase 2: Swift Bridge
1. Create Swift wrapper around EventTapper
2. Implement JSON/IPC communication protocol
3. Handle event serialization
4. Add permission management

### Phase 3: Electron Integration
1. Implement main process event handlers
2. Create IPC bridge for renderer communication
3. Add event registration/unregistration APIs
4. Implement callback system

### Phase 4: UI & Developer Experience
1. Create demo UI showing event capture
2. Build JavaScript API for easy integration
3. Add TypeScript definitions
4. Write documentation

### Phase 5: Polish & Distribution
1. Handle permissions dialog
2. Create installer/DMG
3. Add auto-updater support
4. Write usage examples

## Technical Challenges & Solutions

### Challenge 1: Swift to JavaScript Bridge
**Solution**: Use JSON-based protocol over stdout/stdin or child_process

```swift
// Swift side
struct HotkeyEvent: Codable {
    let type: String
    let keyCode: Int
    let modifiers: [String]
    let timestamp: Double
}

print(try JSONEncoder().encode(event))
```

```javascript
// Node.js side
process.stdout.on('data', (data) => {
  const event = JSON.parse(data);
  this.emit('hotkey', event);
});
```

### Challenge 2: Accessibility Permissions
**Solution**:
- Check permissions on startup
- Provide clear UI instructions
- Use `tccutil` or native prompt

```javascript
const { systemPreferences } = require('electron');

if (!systemPreferences.isTrustedAccessibilityClient(false)) {
  // Prompt user
  systemPreferences.isTrustedAccessibilityClient(true);
}
```

### Challenge 3: Event Loop Integration
**Solution**: Use Node.js EventEmitter pattern

```javascript
class EventTapperWrapper extends EventEmitter {
  constructor() {
    super();
    this.bridge = spawn('./native/EventTapperBridge');
    this.setupListeners();
  }

  registerHotkey(keys, callback) {
    const id = generateId();
    this.send({ type: 'register', keys, id });
    this.callbacks.set(id, callback);
  }
}
```

### Challenge 4: Build Complexity
**Solution**: Use electron-builder with custom build scripts

```json
{
  "scripts": {
    "build:swift": "swift build -c release",
    "build:electron": "electron-builder",
    "build": "npm run build:swift && npm run build:electron"
  }
}
```

## API Design

### JavaScript API (Developer-Facing)

```javascript
const { EventTapper } = require('electron-eventtapper');

const tapper = new EventTapper();

// Register hotkey
tapper.registerHotkey(['command', 'shift', 'k'], () => {
  console.log('Hotkey pressed!');
});

// Monitor all keyboard events
tapper.on('keydown', (event) => {
  console.log(`Key pressed: ${event.keyCode}`);
});

// Monitor mouse events
tapper.on('mousedown', (event) => {
  console.log(`Mouse clicked at: ${event.x}, ${event.y}`);
});

// Unregister
tapper.unregisterHotkey(hotkeyId);

// Cleanup
tapper.destroy();
```

### IPC Protocol (Internal)

```typescript
// Electron Main -> Swift Bridge
interface RegisterHotkeyMessage {
  type: 'register';
  id: string;
  keys: string[];
  modifiers: string[];
}

// Swift Bridge -> Electron Main
interface HotkeyEventMessage {
  type: 'hotkey-triggered';
  id: string;
  timestamp: number;
}
```

## Security Considerations

1. **Permissions**: Require explicit Accessibility access
2. **Event Filtering**: Allow apps to filter which events to monitor
3. **Privacy**: Log and document what events are captured
4. **Sandboxing**: Note that full sandboxing is incompatible with event tapping

## Testing Strategy

1. **Unit Tests**: Test JavaScript API wrapper
2. **Integration Tests**: Test Swift bridge communication
3. **Manual Tests**: Test actual hotkey registration
4. **Permission Tests**: Test permission handling flows

## Deployment

### Build Process
1. Compile Swift bridge to universal binary (x86_64 + arm64)
2. Bundle with Electron app
3. Sign with Apple Developer certificate
4. Notarize for Gatekeeper
5. Create DMG installer

### Distribution Options
- Direct DMG download
- Homebrew cask
- npm package (for developers)

## Dependencies

```json
{
  "dependencies": {
    "electron": "^27.0.0",
    "node-ipc": "^10.0.0" // Optional for advanced IPC
  },
  "devDependencies": {
    "electron-builder": "^24.0.0",
    "typescript": "^5.0.0"
  }
}
```

## Timeline Estimate

- **Phase 1**: 2-3 days
- **Phase 2**: 3-5 days
- **Phase 3**: 2-3 days
- **Phase 4**: 2-3 days
- **Phase 5**: 3-4 days

**Total**: 12-18 days for full implementation

## Next Steps

1. Create base Electron project structure
2. Add EventTapper as submodule
3. Build Swift CLI bridge
4. Implement basic IPC communication
5. Create proof-of-concept demo

## References

- [EventTapper Repository](https://github.com/usagimaru/EventTapper)
- [Electron Native Addons](https://www.electronjs.org/docs/latest/tutorial/using-native-node-modules)
- [CGEvent Reference](https://developer.apple.com/documentation/coregraphics/cgevent)
- [N-API Documentation](https://nodejs.org/api/n-api.html)
- [electron-builder](https://www.electron.build/)
