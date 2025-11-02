/**
 * @file index.js
 * @description Main entry point for the Triad Governance Layer
 * 
 * This module initializes and coordinates:
 * - Bounded dialogue protocol
 * - Context persistence
 * - Safety controls
 * - System monitoring
 */

const BoundedDialogue = require('./protocols/bounded-dialogue');
const TriadMemory = require('./context/memory');
const KillSwitch = require('./safety/killswitch');
const TriadMonitor = require('./telemetry/monitor');
const path = require('path');

class TriadGovernance {
  constructor(config = {}) {
    // Configuration with defaults
    this.config = {
      logPath: path.join(__dirname, 'logs/triad_activity.log'),
      wsPort: config.wsPort || 8765,
      ...config
    };

    // Initialize components
    this.dialogue = new BoundedDialogue(config.dialogue);
    this.memory = new TriadMemory(config.memory);
    this.killswitch = new KillSwitch(config.safety);
    this.monitor = new TriadMonitor(config.telemetry);

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Initialize the governance layer
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Initialize components in order
      await this.memory.initialize();
      await this.killswitch.initialize();
      await this.monitor.initialize();
      await this.dialogue.initialize();

      console.log('Triad Governance Layer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Triad Governance Layer:', error);
      throw error;
    }
  }

  /**
   * Set up event handlers between components
   * @private
   */
  setupEventHandlers() {
    // Monitor → KillSwitch
    this.monitor.on('health:metrics', async (data) => {
      await this.killswitch.monitor({
        cpu: data.metrics.cpu,
        memory: data.metrics.memory,
        tokens: data.metrics.tokens || 0,
        cost: data.metrics.cost || 0
      });
    });

    // KillSwitch → Dialogue
    this.killswitch.on('shutdown', async () => {
      await this.dialogue.cleanup();
    });

    // Dialogue → Memory
    this.dialogue.on('checksum:sync', async (data) => {
      const contextId = `dialogue-${data.sessionId}`;
      await this.memory.saveContext(contextId, {
        type: 'dialogue_session',
        checksum: data.checksum,
        timestamp: data.timestamp
      });
    });

    // Memory → Monitor
    this.memory.on('context:update', (data) => {
      this.monitor.emit('agent:status', {
        agentId: 'memory',
        status: {
          color: 'BLUE',
          message: `Context updated: ${data.contextId}`
        }
      });
    });
  }

  /**
   * Start a new dialogue session
   * @param {Object} config - Session configuration
   * @returns {Promise<string>} - Session ID
   */
  async startSession(config = {}) {
    try {
      await this.dialogue.initialize();
      const sessionId = this.dialogue.state.sessionId;

      // Log session start
      await this.monitor.log('Session started', {
        sessionId,
        config
      });

      return sessionId;
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }

  /**
   * Process a message in the current session
   * @param {Object} message - Message to process
   * @returns {Promise<Object>} - Processing result
   */
  async processMessage(message) {
    try {
      // Process through dialogue protocol
      const result = await this.dialogue.processMessage(message);

      // Save context
      await this.memory.saveContext(`message-${result.messageId}`, {
        type: 'dialogue_message',
        content: message,
        result
      });

      return result;
    } catch (error) {
      console.error('Failed to process message:', error);
      throw error;
    }
  }

  /**
   * Get current system status
   * @returns {Promise<Object>} - System status
   */
  async getStatus() {
    return {
      dialogue: {
        active: this.dialogue.state.isActive,
        turnCount: this.dialogue.state.turnCount,
        tokenCount: this.dialogue.state.tokenCount
      },
      memory: {
        contextCount: this.memory.shortTerm.size + this.memory.workingMemory.size
      },
      killswitch: {
        active: this.killswitch.state.isActive,
        incidents: this.killswitch.state.incidents.length
      },
      monitor: {
        connections: this.monitor.state.connections.size,
        agents: Array.from(this.monitor.state.agents.entries())
      }
    };
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    await Promise.all([
      this.dialogue.cleanup(),
      this.memory.cleanup(),
      this.killswitch.cleanup(),
      this.monitor.cleanup()
    ]);
  }
}

module.exports = TriadGovernance;

// Start if run directly
if (require.main === module) {
  const governance = new TriadGovernance();
  governance.initialize().catch(console.error);
}
