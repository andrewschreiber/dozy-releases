# EventTapper Electron Wrapper

![macOS](https://img.shields.io/badge/macOS-11%2B-blue)
![Node.js](https://img.shields.io/badge/Node.js-16%2B-green)
![Swift](https://img.shields.io/badge/Swift-5.5%2B-orange)
![Electron](https://img.shields.io/badge/Electron-27-blue)

A complete Electron wrapper for the [EventTapper](https://github.com/usagimaru/EventTapper) Swift library, enabling global hotkey registration and event monitoring in Electron applications on macOS.

## 🎯 Features

- ✅ **Global Hotkey Registration** - Register system-wide keyboard shortcuts
- ✅ **Event Monitoring** - Monitor all keyboard and mouse events
- ✅ **Modern Swift Bridge** - Uses Swift Package Manager and EventTapper library
- ✅ **IPC Integration** - Seamless communication between Electron and Swift
- ✅ **Beautiful UI** - Polished Electron interface with real-time event display
- ✅ **Permission Management** - Built-in Accessibility permission checking
- ✅ **Type-Safe** - Full TypeScript definitions included
- ✅ **Production Ready** - Includes build scripts, signing, and DMG generation

## 📋 Requirements

- macOS 10.15 (Catalina) or later
- Node.js 16 or later
- Swift 5.5 or later (comes with Xcode)
- Xcode Command Line Tools

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/electron-eventtapper.git
cd electron-eventtapper

# Install dependencies
npm install

# Build the Swift bridge
npm run build:swift

# Run the app
npm start
```

### 2. Grant Permissions

When you first run the app, macOS will prompt you to grant Accessibility permissions:

1. Click "Open System Preferences"
2. Go to **Security & Privacy** → **Privacy** → **Accessibility**
3. Check the box next to the app
4. Restart the app

### 3. Try It Out

- **Register a hotkey**: Click in the hotkey input and press your desired combination
- **Start monitoring**: Click "Start Monitoring" to see all keyboard events
- **View statistics**: Check the stats panel at the bottom

## 📚 Documentation

- **[Setup Guide](SETUP.md)** - Detailed installation and configuration
- **[API Documentation](API_DOCUMENTATION.md)** - Complete API reference
- **[Usage Examples](USAGE_EXAMPLES.md)** - Real-world code examples
- **[Architecture Plan](ELECTRON_WRAPPER_PLAN.md)** - Technical architecture details

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     Electron Renderer Process       │
│  (UI + IPC Client via preload.js)   │
└────────────┬────────────────────────┘
             │ IPC (contextBridge)
┌────────────▼────────────────────────┐
│     Electron Main Process           │
│  (Event handling + IPC handlers)    │
└────────────┬────────────────────────┘
             │ stdin/stdout (JSON)
┌────────────▼────────────────────────┐
│     Swift Bridge Process            │
│  (EventTapper + CGEventTap API)     │
└────────────┬────────────────────────┘
             │
┌────────────▼────────────────────────┐
│   macOS Core Graphics (CGEvent)     │
│   System-wide event monitoring      │
└─────────────────────────────────────┘
```

## 💻 Usage

### JavaScript API

```javascript
const { EventTapperBridge } = require('./src/eventtapper-bridge');

const bridge = new EventTapperBridge();

// Register a hotkey (Command+Shift+K)
const hotkeyId = bridge.registerHotkey(['K'], ['command', 'shift']);

// Listen for hotkey events
bridge.on('hotkey', (event) => {
  console.log('Hotkey triggered!', event);
});

// Start monitoring all keys
bridge.startMonitoring({ allKeys: true });

// Listen for key events
bridge.on('keydown', (event) => {
  console.log('Key pressed:', event.key);
});
```

### In Electron Renderer

```javascript
// Register hotkey from renderer
const hotkeyId = await window.electronAPI.registerHotkey({
  keys: ['K'],
  modifiers: ['command', 'shift']
});

// Listen for events
window.electronAPI.onHotkeyTriggered((event) => {
  console.log('Hotkey triggered!');
});
```

## 🎨 UI Preview

The included Electron app features:

- **Permission Status** - Visual indicator for Accessibility permissions
- **Hotkey Registration** - Interactive form to register new hotkeys
- **Event Log** - Real-time display of captured events
- **Statistics** - Live stats showing usage metrics
- **Modern Design** - Beautiful gradient UI with smooth animations

## 🛠️ Development

### Build Swift Bridge

```bash
npm run build:swift
```

This compiles the Swift bridge to:
```
native/EventTapperBridge/.build/release/EventTapperBridge
```

### Run in Development Mode

```bash
npm run dev
```

Enables:
- DevTools
- Verbose logging
- Hot reload (if configured)

### Build for Production

```bash
npm run package
```

Creates:
- DMG installer in `dist/`
- Signed and notarized (if credentials configured)

## 📦 Project Structure

```
electron-eventtapper/
├── electron/
│   ├── main.js              # Electron main process
│   ├── preload.js           # Preload script (IPC bridge)
│   └── renderer/
│       ├── index.html       # UI
│       ├── renderer.js      # Renderer logic
│       └── styles.css       # Styling
├── native/
│   └── EventTapperBridge/
│       ├── Package.swift    # Swift Package definition
│       └── Sources/
│           └── main.swift   # Swift bridge implementation
├── src/
│   ├── eventtapper-bridge.js  # Node.js wrapper
│   └── index.js             # Entry point
├── docs/
│   ├── SETUP.md
│   ├── API_DOCUMENTATION.md
│   ├── USAGE_EXAMPLES.md
│   └── ELECTRON_WRAPPER_PLAN.md
├── package.json
└── README.md
```

## 🔧 Configuration

### Custom Hotkeys

Edit `electron/main.js` to add default hotkeys:

```javascript
const defaultHotkeys = [
  { keys: ['K'], modifiers: ['command', 'shift'], action: 'search' },
  { keys: ['S'], modifiers: ['command'], action: 'save' }
];
```

### Build Settings

Edit `package.json` → `build` section:

```json
{
  "build": {
    "appId": "com.yourcompany.eventtapper",
    "mac": {
      "identity": "Developer ID Application: Your Name"
    }
  }
}
```

## 🐛 Troubleshooting

### "Operation not permitted" error

**Solution**: Grant Accessibility permissions (see [Setup Guide](SETUP.md))

### Swift bridge not starting

```bash
# Check if binary exists
ls native/EventTapperBridge/.build/release/EventTapperBridge

# Rebuild
npm run build:swift
```

### No events being captured

1. Check Accessibility permissions
2. Restart the app after granting permissions
3. Check Console for errors: `npm run dev`

See [Setup Guide](SETUP.md#troubleshooting) for more.

## 🚢 Deployment

### Signing

1. Get an Apple Developer ID certificate
2. Configure in `package.json`:

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)"
    }
  }
}
```

### Notarization

```bash
# Set up credentials
export APPLE_ID="your@email.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAM_ID"

# Build and notarize
npm run package
```

## 🔒 Security

- Requires explicit Accessibility permissions
- Event data stays local (not sent anywhere)
- Open source for transparency
- Sandboxing limitations documented

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 🙏 Credits

- [EventTapper](https://github.com/usagimaru/EventTapper) by usagimaru - The Swift library this wraps
- [Electron](https://www.electronjs.org/) - Cross-platform desktop framework
- macOS Core Graphics - Event tap APIs

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📞 Support

- GitHub Issues: [Report a bug](https://github.com/yourusername/electron-eventtapper/issues)
- Discussions: [Ask questions](https://github.com/yourusername/electron-eventtapper/discussions)
- EventTapper Library: [Original repo](https://github.com/usagimaru/EventTapper)

## 🗺️ Roadmap

- [ ] Linux support (via different backend)
- [ ] Windows support (via different backend)
- [ ] Mouse event monitoring
- [ ] Event suppression/blocking
- [ ] Hotkey profiles
- [ ] Cloud sync for settings
- [ ] Plugin system

## 📊 Status

- ✅ Alpha - Core functionality implemented
- ⏳ Beta - Testing and refinement
- ⏳ Stable - Production ready

## ⭐ Show Your Support

If you find this project useful, please consider:

- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting features
- 🤝 Contributing code
- 📢 Sharing with others

---

**Made with ❤️ for the Electron community**

Built with [EventTapper](https://github.com/usagimaru/EventTapper) | Powered by [Electron](https://electronjs.org)
