/**
 * @file monitor.js
 * @description Implements system monitoring and health tracking for the Triad system
 * 
 * This module provides:
 * - WebSocket heartbeat monitoring
 * - Agent status tracking
 * - System health reporting
 * - Performance metrics collection
 */

const WebSocket = require('ws');
const fs = require('fs').promises;
const path = require('path');
const EventEmitter = require('events');

class TriadMonitor extends EventEmitter {
  constructor(config = {}) {
    super();

    // Configuration with defaults
    this.config = {
      heartbeatInterval: config.heartbeatInterval || 30000, // 30 seconds
      healthCheckInterval: config.healthCheckInterval || 5000, // 5 seconds
      logPath: config.logPath || path.join(__dirname, '../logs/triad_activity.log'),
      wsPort: config.wsPort || 8765,
      ...config
    };

    // State management
    this.state = {
      agents: new Map(), // Agent status tracking
      connections: new Map(), // WebSocket connections
      healthMetrics: [], // System health history
      lastHeartbeat: null
    };

    // Status color codes
    this.statusColors = {
      BLUE: 'normal',
      PURPLE: 'high_load',
      ORANGE: 'warning',
      YELLOW: 'critical'
    };
  }

  /**
   * Initialize monitoring system
   * @returns {Promise<void>}
   */
  async initialize() {
    // Ensure log directory exists
    await fs.mkdir(path.dirname(this.config.logPath), { recursive: true });

    // Start WebSocket server
    this.startWebSocketServer();

    // Start monitoring cycles
    this.startHeartbeat();
    this.startHealthCheck();

    await this.log('Monitoring system initialized');
  }

  /**
   * Start WebSocket server for agent communication
   * @private
   */
  startWebSocketServer() {
    this.wss = new WebSocket.Server({ port: this.config.wsPort });

    this.wss.on('connection', (ws) => {
      const connectionId = crypto.randomUUID();
      this.state.connections.set(connectionId, ws);

      ws.on('message', async (message) => {
        try {
          await this.handleMessage(connectionId, JSON.parse(message));
        } catch (error) {
          console.error('Error handling message:', error);
        }
      });

      ws.on('close', () => {
        this.state.connections.delete(connectionId);
      });
    });
  }

  /**
   * Handle incoming WebSocket message
   * @private
   * @param {string} connectionId - Connection identifier
   * @param {Object} message - Parsed message
   * @returns {Promise<void>}
   */
  async handleMessage(connectionId, message) {
    switch (message.type) {
      case 'agent:status':
        await this.updateAgentStatus(message.agentId, message.status);
        break;

      case 'health:report':
        await this.processHealthReport(message.metrics);
        break;

      case 'heartbeat':
        this.state.lastHeartbeat = Date.now();
        this.sendHeartbeatResponse(connectionId);
        break;

      default:
        console.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Update agent status
   * @private
   * @param {string} agentId - Agent identifier
   * @param {Object} status - Agent status
   * @returns {Promise<void>}
   */
  async updateAgentStatus(agentId, status) {
    const previousStatus = this.state.agents.get(agentId);
    this.state.agents.set(agentId, status);

    if (previousStatus?.color !== status.color) {
      await this.log(`Agent ${agentId} status changed: ${status.color}`);
      this.emit('agent:status_change', { agentId, status });
    }
  }

  /**
   * Process system health report
   * @private
   * @param {Object} metrics - Health metrics
   * @returns {Promise<void>}
   */
  async processHealthReport(metrics) {
    // Add timestamp
    metrics.timestamp = Date.now();

    // Add to history
    this.state.healthMetrics.push(metrics);

    // Prune old metrics (keep last hour)
    const hourAgo = Date.now() - 3600000;
    this.state.healthMetrics = this.state.healthMetrics.filter(
      m => m.timestamp > hourAgo
    );

    // Calculate system status color
    const statusColor = this.calculateSystemStatus(metrics);
    
    // Log significant changes
    if (this.hasSignificantChange(metrics)) {
      await this.log(`System status: ${statusColor}`, metrics);
    }

    // Emit metrics for other components
    this.emit('health:metrics', { color: statusColor, metrics });
  }

  /**
   * Calculate overall system status color
   * @private
   * @param {Object} metrics - Current metrics
   * @returns {string} - Status color
   */
  calculateSystemStatus(metrics) {
    if (metrics.cpu > 90 || metrics.memory > 90) {
      return this.statusColors.YELLOW;
    }
    if (metrics.cpu > 70 || metrics.memory > 70) {
      return this.statusColors.ORANGE;
    }
    if (metrics.cpu > 50 || metrics.memory > 50) {
      return this.statusColors.PURPLE;
    }
    return this.statusColors.BLUE;
  }

  /**
   * Check for significant metric changes
   * @private
   * @param {Object} metrics - Current metrics
   * @returns {boolean} - True if significant change detected
   */
  hasSignificantChange(metrics) {
    if (this.state.healthMetrics.length < 2) return true;

    const previous = this.state.healthMetrics[this.state.healthMetrics.length - 2];
    
    return (
      Math.abs(metrics.cpu - previous.cpu) > 20 ||
      Math.abs(metrics.memory - previous.memory) > 20 ||
      this.calculateSystemStatus(metrics) !== this.calculateSystemStatus(previous)
    );
  }

  /**
   * Start heartbeat monitoring
   * @private
   */
  startHeartbeat() {
    setInterval(() => {
      const now = Date.now();
      
      // Check last heartbeat
      if (this.state.lastHeartbeat && now - this.state.lastHeartbeat > this.config.heartbeatInterval * 2) {
        this.emit('heartbeat:missed');
      }

      // Send heartbeat to all connections
      for (const [connectionId, ws] of this.state.connections) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'heartbeat', timestamp: now }));
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Start health check monitoring
   * @private
   */
  startHealthCheck() {
    setInterval(async () => {
      const metrics = await this.collectHealthMetrics();
      await this.processHealthReport(metrics);
    }, this.config.healthCheckInterval);
  }

  /**
   * Collect current health metrics
   * @private
   * @returns {Promise<Object>} - Current health metrics
   */
  async collectHealthMetrics() {
    const metrics = {
      timestamp: Date.now(),
      cpu: process.cpuUsage(),
      memory: process.memoryUsage(),
      agents: Array.from(this.state.agents.entries()).map(([id, status]) => ({
        id,
        status
      })),
      connections: this.state.connections.size
    };

    return metrics;
  }

  /**
   * Send heartbeat response
   * @private
   * @param {string} connectionId - Connection identifier
   */
  sendHeartbeatResponse(connectionId) {
    const ws = this.state.connections.get(connectionId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat:response',
        timestamp: Date.now()
      }));
    }
  }

  /**
   * Log monitoring event
   * @private
   * @param {string} message - Log message
   * @param {Object} [data] - Additional data to log
   * @returns {Promise<void>}
   */
  async log(message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n${JSON.stringify(data, null, 2)}\n\n`;

    await fs.appendFile(this.config.logPath, logEntry);
  }

  /**
   * Clean up resources
   */
  cleanup() {
    // Close all WebSocket connections
    for (const ws of this.state.connections.values()) {
      ws.close();
    }

    // Clear state
    this.state.agents.clear();
    this.state.connections.clear();
    this.state.healthMetrics = [];

    // Stop intervals
    clearInterval(this.heartbeatInterval);
    clearInterval(this.healthCheckInterval);

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
    }
  }
}

module.exports = TriadMonitor;
