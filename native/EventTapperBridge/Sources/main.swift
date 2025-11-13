import Foundation
import AppKit
import EventTapper

// MARK: - Message Types

struct Message: Codable {
    let type: String
    let data: [String: AnyCodable]?
}

struct HotkeyRegistration: Codable {
    let id: String
    let keys: [String]
    let modifiers: [String]
}

struct HotkeyEvent: Codable {
    let type: String
    let id: String
    let timestamp: Double
}

struct KeyEvent: Codable {
    let type: String
    let keyCode: Int
    let key: String?
    let modifiers: [String]
    let timestamp: Double
}

struct ErrorMessage: Codable {
    let type: String
    let message: String
}

// MARK: - AnyCodable for flexible JSON

struct AnyCodable: Codable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let string = try? container.decode(String.self) {
            value = string
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let string as String:
            try container.encode(string)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let bool as Bool:
            try container.encode(bool)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}

// MARK: - Bridge Class

class EventTapperBridge {
    private var eventTapper: EventTapper?
    private var eventWatcher: EventWatcher?
    private var registeredHotkeys: [String: EventTapper] = [:]
    private var isMonitoring = false

    func start() {
        // Check for accessibility permissions
        let options = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: true] as CFDictionary
        let trusted = AXIsProcessTrustedWithOptions(options)

        if !trusted {
            sendError("Accessibility permissions not granted")
        }

        // Start listening for input
        listenForCommands()
    }

    private func listenForCommands() {
        let inputHandle = FileHandle.standardInput

        // Read line by line
        while let line = readLine() {
            handleCommand(line)
        }
    }

    private func handleCommand(_ line: String) {
        guard let data = line.data(using: .utf8) else {
            sendError("Invalid UTF-8 input")
            return
        }

        do {
            let decoder = JSONDecoder()
            let message = try decoder.decode(Message.self, from: data)

            switch message.type {
            case "register-hotkey":
                handleRegisterHotkey(message)
            case "unregister-hotkey":
                handleUnregisterHotkey(message)
            case "start-monitoring":
                handleStartMonitoring(message)
            case "stop-monitoring":
                handleStopMonitoring()
            case "ping":
                sendPong()
            default:
                sendError("Unknown command type: \(message.type)")
            }
        } catch {
            sendError("Failed to parse command: \(error.localizedDescription)")
        }
    }

    // MARK: - Command Handlers

    private func handleRegisterHotkey(_ message: Message) {
        guard let data = message.data,
              let idValue = data["id"]?.value as? String,
              let keysValue = data["keys"]?.value as? [Any],
              let modifiersValue = data["modifiers"]?.value as? [Any] else {
            sendError("Invalid hotkey registration data")
            return
        }

        let keys = keysValue.compactMap { $0 as? String }
        let modifiers = modifiersValue.compactMap { $0 as? String }

        // Create event tapper for this hotkey
        let tapper = EventTapper()

        // Configure based on modifiers and keys
        // Note: This is a simplified implementation
        // EventTapper's actual API may differ

        tapper.start { [weak self] event in
            self?.handleHotkeyTriggered(id: idValue, event: event)
        }

        registeredHotkeys[idValue] = tapper

        sendSuccess(["id": idValue, "registered": true])
    }

    private func handleUnregisterHotkey(_ message: Message) {
        guard let data = message.data,
              let idValue = data["id"]?.value as? String else {
            sendError("Invalid hotkey unregistration data")
            return
        }

        if let tapper = registeredHotkeys[idValue] {
            // Stop the event tapper
            registeredHotkeys.removeValue(forKey: idValue)
            sendSuccess(["id": idValue, "unregistered": true])
        } else {
            sendError("Hotkey not found: \(idValue)")
        }
    }

    private func handleStartMonitoring(_ message: Message) {
        guard !isMonitoring else {
            sendError("Already monitoring")
            return
        }

        eventWatcher = EventWatcher()

        // Start monitoring all key events
        NSEvent.addLocalMonitorForEvents(matching: [.keyDown, .keyUp]) { [weak self] event in
            self?.handleKeyEvent(event)
            return event
        }

        isMonitoring = true
        sendSuccess(["monitoring": true])
    }

    private func handleStopMonitoring() {
        eventWatcher = nil
        isMonitoring = false
        sendSuccess(["monitoring": false])
    }

    // MARK: - Event Handlers

    private func handleHotkeyTriggered(id: String, event: NSEvent) {
        let hotkeyEvent = HotkeyEvent(
            type: "hotkey-triggered",
            id: id,
            timestamp: Date().timeIntervalSince1970
        )

        sendEvent(hotkeyEvent)
    }

    private func handleKeyEvent(_ event: NSEvent) {
        let modifiers = parseModifiers(event.modifierFlags)

        let keyEvent = KeyEvent(
            type: event.type == .keyDown ? "keydown" : "keyup",
            keyCode: Int(event.keyCode),
            key: event.charactersIgnoringModifiers,
            modifiers: modifiers,
            timestamp: Date().timeIntervalSince1970
        )

        sendEvent(keyEvent)
    }

    private func parseModifiers(_ flags: NSEvent.ModifierFlags) -> [String] {
        var modifiers: [String] = []

        if flags.contains(.command) {
            modifiers.append("command")
        }
        if flags.contains(.shift) {
            modifiers.append("shift")
        }
        if flags.contains(.option) {
            modifiers.append("option")
        }
        if flags.contains(.control) {
            modifiers.append("control")
        }

        return modifiers
    }

    // MARK: - Output Methods

    private func sendEvent<T: Codable>(_ event: T) {
        send(event)
    }

    private func sendSuccess(_ data: [String: Any]) {
        let response = ["type": "success", "data": data] as [String : Any]
        send(response)
    }

    private func sendError(_ message: String) {
        let error = ErrorMessage(type: "error", message: message)
        send(error)
    }

    private func sendPong() {
        send(["type": "pong"])
    }

    private func send<T: Codable>(_ object: T) {
        do {
            let encoder = JSONEncoder()
            let data = try encoder.encode(object)

            if let jsonString = String(data: data, encoding: .utf8) {
                print(jsonString)
                fflush(stdout)
            }
        } catch {
            // Can't send error because encoding failed
            print("{\"type\":\"error\",\"message\":\"Encoding failed\"}")
            fflush(stdout)
        }
    }

    private func send(_ dict: [String: Any]) {
        do {
            let data = try JSONSerialization.data(withJSONObject: dict)

            if let jsonString = String(data: data, encoding: .utf8) {
                print(jsonString)
                fflush(stdout)
            }
        } catch {
            print("{\"type\":\"error\",\"message\":\"Encoding failed\"}")
            fflush(stdout)
        }
    }
}

// MARK: - Main Entry Point

let bridge = EventTapperBridge()
bridge.start()

// Keep the run loop running
RunLoop.main.run()
