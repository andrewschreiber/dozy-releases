const { EventEmitter } = require('events');
const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * EventTapperBridge - Node.js wrapper for the Swift EventTapper bridge
 *
 * Communicates with the native Swift process via JSON over stdin/stdout
 */
class EventTapperBridge extends EventEmitter {
  constructor() {
    super();

    this.bridge = null;
    this.callbacks = new Map();
    this.isRunning = false;
    this.buffer = '';

    this.init();
  }

  /**
   * Initialize the Swift bridge process
   */
  init() {
    // Path to the compiled Swift executable
    const bridgePath = path.join(
      __dirname,
      '..',
      'native',
      'EventTapperBridge',
      '.build',
      'release',
      'EventTapperBridge'
    );

    try {
      // Spawn the Swift bridge process
      this.bridge = spawn(bridgePath, [], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.isRunning = true;

      // Handle stdout (messages from Swift)
      this.bridge.stdout.on('data', (data) => {
        this.handleOutput(data);
      });

      // Handle stderr (errors from Swift)
      this.bridge.stderr.on('data', (data) => {
        console.error('EventTapper Bridge Error:', data.toString());
        this.emit('error', new Error(data.toString()));
      });

      // Handle process exit
      this.bridge.on('exit', (code, signal) => {
        this.isRunning = false;
        console.log(`EventTapper Bridge exited with code ${code}, signal ${signal}`);
        this.emit('exit', { code, signal });
      });

      // Handle process errors
      this.bridge.on('error', (error) => {
        console.error('Failed to start EventTapper Bridge:', error);
        this.emit('error', error);
      });

      // Send ping to verify connection
      this.send({ type: 'ping' });

    } catch (error) {
      console.error('Failed to initialize EventTapper Bridge:', error);
      this.emit('error', error);
    }
  }

  /**
   * Handle output from the Swift bridge
   */
  handleOutput(data) {
    // Accumulate data in buffer
    this.buffer += data.toString();

    // Process complete JSON lines
    const lines = this.buffer.split('\n');

    // Keep the last incomplete line in the buffer
    this.buffer = lines.pop() || '';

    // Process each complete line
    lines.forEach(line => {
      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse message:', line, error);
        }
      }
    });
  }

  /**
   * Handle a parsed message from the Swift bridge
   */
  handleMessage(message) {
    switch (message.type) {
      case 'hotkey-triggered':
        this.emit('hotkey', message);
        break;

      case 'keydown':
      case 'keyup':
        this.emit('keydown', message);
        break;

      case 'error':
        this.emit('error', new Error(message.message));
        break;

      case 'success':
        // Handle success responses for commands
        if (message.data && message.data.id) {
          const callback = this.callbacks.get(message.data.id);
          if (callback) {
            callback(null, message.data);
            this.callbacks.delete(message.data.id);
          }
        }
        break;

      case 'pong':
        console.log('EventTapper Bridge connected');
        this.emit('ready');
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  /**
   * Send a command to the Swift bridge
   */
  send(message) {
    if (!this.isRunning || !this.bridge) {
      throw new Error('EventTapper Bridge is not running');
    }

    try {
      const json = JSON.stringify(message);
      this.bridge.stdin.write(json + '\n');
    } catch (error) {
      console.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * Register a hotkey
   *
   * @param {string[]} keys - Array of key names (e.g., ['K'])
   * @param {string[]} modifiers - Array of modifiers (e.g., ['command', 'shift'])
   * @returns {string} Hotkey ID
   */
  registerHotkey(keys, modifiers = []) {
    const id = uuidv4();

    this.send({
      type: 'register-hotkey',
      data: {
        id,
        keys,
        modifiers
      }
    });

    return id;
  }

  /**
   * Unregister a hotkey
   *
   * @param {string} hotkeyId - The hotkey ID to unregister
   */
  unregisterHotkey(hotkeyId) {
    this.send({
      type: 'unregister-hotkey',
      data: {
        id: hotkeyId
      }
    });
  }

  /**
   * Start monitoring all keyboard/mouse events
   *
   * @param {Object} options - Monitoring options
   */
  startMonitoring(options = {}) {
    this.send({
      type: 'start-monitoring',
      data: options
    });
  }

  /**
   * Stop monitoring events
   */
  stopMonitoring() {
    this.send({
      type: 'stop-monitoring',
      data: {}
    });
  }

  /**
   * Clean up and destroy the bridge
   */
  destroy() {
    if (this.bridge) {
      this.bridge.kill();
      this.bridge = null;
      this.isRunning = false;
    }

    this.callbacks.clear();
    this.removeAllListeners();
  }
}

module.exports = { EventTapperBridge };
