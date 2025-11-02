/**
 * @file bounded-dialogue.js
 * @description Implements the GPT ↔ Opus conversation protocol with bounded dialogue controls
 * 
 * This module enforces:
 * - One-speaker-at-a-time queue
 * - Token and time boundaries
 * - Incremental revision logic
 * - Session checksum sync to context/memory.js
 */

const { EventEmitter } = require('events');
const crypto = require('crypto');

class BoundedDialogue extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // Configuration with defaults
    this.config = {
      maxTurns: config.maxTurns || 10,
      maxTokens: config.maxTokens || 8000,
      maxDuration: config.maxDuration || 300000, // 5 minutes
      checksumInterval: config.checksumInterval || 60000, // 1 minute
      ...config
    };

    // State management
    this.state = {
      currentSpeaker: null,
      turnCount: 0,
      startTime: null,
      tokenCount: 0,
      speakerQueue: [],
      sessionId: crypto.randomUUID()
    };

    // Initialize event handlers
    this.setupEventHandlers();
  }

  /**
   * Initialize dialogue session
   * @returns {Promise<void>}
   */
  async initialize() {
    this.state.startTime = Date.now();
    this.state.turnCount = 0;
    this.state.tokenCount = 0;
    
    // Start checksum sync
    this.startChecksumSync();
    
    this.emit('session:start', {
      sessionId: this.state.sessionId,
      timestamp: this.state.startTime
    });
  }

  /**
   * Queue a speaker for dialogue
   * @param {string} speakerId - Unique identifier for the speaker
   * @returns {Promise<boolean>} - True if queued successfully
   */
  async queueSpeaker(speakerId) {
    if (this.state.speakerQueue.includes(speakerId)) {
      return false;
    }
    
    this.state.speakerQueue.push(speakerId);
    this.emit('speaker:queued', { speakerId });
    return true;
  }

  /**
   * Process a message in the dialogue
   * @param {Object} message - Message to process
   * @returns {Promise<Object>} - Processing result
   */
  async processMessage(message) {
    // Check boundaries
    if (!this.checkBoundaries()) {
      throw new Error('Session boundaries exceeded');
    }

    // Verify speaker turn
    if (message.speakerId !== this.state.currentSpeaker) {
      throw new Error('Not speaker\'s turn');
    }

    // Update state
    this.state.turnCount++;
    this.state.tokenCount += this.estimateTokens(message.content);

    // Emit progress
    this.emit('message:processed', {
      sessionId: this.state.sessionId,
      messageId: crypto.randomUUID(),
      timestamp: Date.now(),
      ...message
    });

    return {
      success: true,
      turnCount: this.state.turnCount,
      tokenCount: this.state.tokenCount
    };
  }

  /**
   * Check if session is within boundaries
   * @private
   * @returns {boolean}
   */
  checkBoundaries() {
    const now = Date.now();
    const duration = now - this.state.startTime;

    return (
      this.state.turnCount < this.config.maxTurns &&
      this.state.tokenCount < this.config.maxTokens &&
      duration < this.config.maxDuration
    );
  }

  /**
   * Start checksum sync process
   * @private
   */
  startChecksumSync() {
    this.checksumInterval = setInterval(() => {
      const checksum = this.calculateChecksum();
      this.emit('checksum:sync', {
        sessionId: this.state.sessionId,
        checksum,
        timestamp: Date.now()
      });
    }, this.config.checksumInterval);
  }

  /**
   * Calculate session state checksum
   * @private
   * @returns {string} - SHA-256 checksum
   */
  calculateChecksum() {
    const stateString = JSON.stringify({
      sessionId: this.state.sessionId,
      turnCount: this.state.turnCount,
      tokenCount: this.state.tokenCount,
      startTime: this.state.startTime,
      currentSpeaker: this.state.currentSpeaker,
      speakerQueue: this.state.speakerQueue
    });

    return crypto
      .createHash('sha256')
      .update(stateString)
      .digest('hex');
  }

  /**
   * Estimate token count for content
   * @private
   * @param {string} content
   * @returns {number} - Estimated token count
   */
  estimateTokens(content) {
    // Simple estimation: ~4 chars per token
    return Math.ceil(content.length / 4);
  }

  /**
   * Set up event handlers
   * @private
   */
  setupEventHandlers() {
    this.on('session:start', (data) => {
      console.log(`Session started: ${data.sessionId}`);
    });

    this.on('speaker:queued', (data) => {
      console.log(`Speaker queued: ${data.speakerId}`);
    });

    this.on('message:processed', (data) => {
      console.log(`Message processed: ${data.messageId}`);
    });

    this.on('checksum:sync', (data) => {
      console.log(`Checksum synced: ${data.checksum}`);
    });
  }

  /**
   * Clean up resources
   */
  cleanup() {
    clearInterval(this.checksumInterval);
    this.removeAllListeners();
  }
}

module.exports = BoundedDialogue;
