# EventTapper Electron Wrapper - Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:

1. **macOS** (10.15 Catalina or later)
2. **Node.js** (v16 or later)
3. **Swift** (5.5 or later) - Usually comes with Xcode
4. **Xcode Command Line Tools**:
   ```bash
   xcode-select --install
   ```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/electron-eventtapper.git
cd electron-eventtapper
```

### 2. Initialize EventTapper Submodule

The EventTapper Swift library is included as a dependency in the Swift Package Manager configuration, so it will be automatically fetched when you build.

### 3. Install Node.js Dependencies

```bash
npm install
```

### 4. Build the Swift Bridge

```bash
npm run build:swift
```

This will:
- Fetch the EventTapper dependency
- Compile the Swift bridge to a native executable
- Place the binary in `native/EventTapperBridge/.build/release/`

### 5. Verify the Build

Check that the Swift bridge was compiled successfully:

```bash
ls -la native/EventTapperBridge/.build/release/EventTapperBridge
```

You should see the executable file.

## Running the Application

### Development Mode

```bash
npm run dev
```

This will:
- Start Electron with debugging enabled
- Open DevTools automatically
- Enable verbose logging

### Production Mode

```bash
npm start
```

## Permissions Setup

### Accessibility Permissions

EventTapper requires **Accessibility permissions** to monitor global keyboard and mouse events.

#### Grant Permissions:

1. When you first run the app, macOS will prompt you to grant Accessibility access
2. Click "Open System Preferences"
3. In **Security & Privacy** → **Privacy** → **Accessibility**:
   - Click the lock icon to make changes
   - Check the box next to your Electron app
4. Restart the app

#### Manual Permission Setup:

```bash
# Open System Preferences directly
open "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
```

#### Verify Permissions:

The app has a built-in permission checker on the main screen that shows:
- ✅ Green indicator: Permissions granted
- ⚠️  Orange indicator: Checking permissions
- ❌ Red indicator: Permissions denied

## Building for Distribution

### Create DMG Installer

```bash
npm run package
```

This will:
- Build the Swift bridge in release mode
- Package the Electron app
- Create a DMG installer in the `dist/` folder
- Sign the app (if you have a Developer ID certificate configured)

### Signing and Notarization

For distribution outside the Mac App Store, you need to:

1. **Sign the app** with your Apple Developer ID
2. **Notarize** the app with Apple

#### Configure Signing:

Add to `package.json`:

```json
{
  "build": {
    "mac": {
      "identity": "Developer ID Application: Your Name (TEAM_ID)",
      "hardenedRuntime": true,
      "gatekeeperAssess": false,
      "entitlements": "build/entitlements.mac.plist",
      "entitlementsInherit": "build/entitlements.mac.plist"
    }
  }
}
```

#### Create Entitlements File:

Create `build/entitlements.mac.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>com.apple.security.cs.allow-jit</key>
    <true/>
    <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
    <true/>
    <key>com.apple.security.cs.disable-library-validation</key>
    <true/>
</dict>
</plist>
```

## Troubleshooting

### Swift Build Fails

**Problem**: `swift build` fails with package resolution errors

**Solution**:
```bash
cd native/EventTapperBridge
rm -rf .build
swift package reset
swift build -c release
```

### Bridge Process Won't Start

**Problem**: Electron can't find the Swift bridge executable

**Solution**:
1. Verify the build:
   ```bash
   ls native/EventTapperBridge/.build/release/EventTapperBridge
   ```
2. Check permissions:
   ```bash
   chmod +x native/EventTapperBridge/.build/release/EventTapperBridge
   ```

### No Events Being Captured

**Problem**: App runs but doesn't capture keyboard events

**Solution**:
1. Check Accessibility permissions (see above)
2. Restart the app after granting permissions
3. Check Console logs for errors:
   ```bash
   npm run dev
   ```

### "Operation not permitted" Error

**Problem**: Swift bridge fails with operation not permitted

**Solution**:
- Grant Accessibility permissions to Terminal/iTerm
- Or run from Finder instead of command line

### App Crashes on Startup

**Problem**: Electron crashes immediately

**Solution**:
1. Check Node.js version: `node --version` (must be ≥16)
2. Reinstall dependencies:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```
3. Rebuild Swift bridge:
   ```bash
   npm run build:swift
   ```

## Development Tips

### Hot Reload

For faster development, you can use `electron-reload`:

```bash
npm install --save-dev electron-reload
```

Add to `electron/main.js`:

```javascript
if (process.env.NODE_ENV === 'development') {
  require('electron-reload')(__dirname);
}
```

### Debugging Swift Code

To debug the Swift bridge:

```bash
cd native/EventTapperBridge
swift build -c debug
lldb .build/debug/EventTapperBridge
```

### Debugging IPC Communication

Enable IPC logging in `electron/main.js`:

```javascript
ipcMain.on('*', (event, ...args) => {
  console.log('IPC:', event, args);
});
```

### Testing Without Electron

Test the Swift bridge standalone:

```bash
cd native/EventTapperBridge/.build/release
./EventTapperBridge
```

Then send JSON commands via stdin:
```json
{"type":"ping"}
```

## Environment Variables

- `NODE_ENV=development` - Enable development mode with DevTools
- `LOG_LEVEL=debug` - Enable verbose logging
- `SKIP_BUILD=1` - Skip Swift build during npm install

## Next Steps

- See [README.md](README.md) for usage examples
- See [ELECTRON_WRAPPER_PLAN.md](ELECTRON_WRAPPER_PLAN.md) for architecture details
- See [API_DOCUMENTATION.md](API_DOCUMENTATION.md) for API reference

## Support

For issues and questions:
- GitHub Issues: https://github.com/yourusername/electron-eventtapper/issues
- EventTapper Library: https://github.com/usagimaru/EventTapper
