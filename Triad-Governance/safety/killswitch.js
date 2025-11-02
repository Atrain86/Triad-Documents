/**
 * @file killswitch.js
 * @description Implements emergency shutdown and safety controls for the Triad system
 * 
 * This module provides:
 * - CPU and resource monitoring
 * - Token rate tracking
 * - Cost monitoring and limits
 * - Emergency shutdown procedures
 * - Incident logging
 */

const fs = require('fs').promises;
const path = require('path');
const os = require('os');

class KillSwitch {
  constructor(config = {}) {
    // Configuration with defaults
    this.config = {
      costThreshold: config.costThreshold || 10.0, // $10/minute
      costWindow: config.costWindow || 60000, // 1 minute
      cpuThreshold: config.cpuThreshold || 90, // 90% CPU usage
      memoryThreshold: config.memoryThreshold || 90, // 90% memory usage
      tokenRateThreshold: config.tokenRateThreshold || 1000, // tokens per minute
      logPath: config.logPath || path.join(__dirname, '../logs/killswitch.log'),
      checkInterval: config.checkInterval || 5000, // 5 seconds
      ...config
    };

    // State management
    this.state = {
      isActive: false,
      costs: [],
      tokenRates: [],
      cpuUsage: [],
      memoryUsage: [],
      incidents: [],
      lastCheck: null
    };
  }

  /**
   * Initialize killswitch monitoring
   * @returns {Promise<void>}
   */
  async initialize() {
    // Ensure log directory exists
    await fs.mkdir(path.dirname(this.config.logPath), { recursive: true });

    // Start monitoring
    this.startMonitoring();

    await this.logIncident('Killswitch monitoring initialized');
  }

  /**
   * Monitor system resources and costs
   * @param {Object} usage - Current usage metrics
   * @returns {Promise<void>}
   */
  async monitor(usage) {
    try {
      // Update state
      this.updateState(usage);

      // Check thresholds
      const violations = this.checkThresholds();

      if (violations.length > 0) {
        await this.triggerEmergencyShutdown(violations);
      }
    } catch (error) {
      console.error('Error in killswitch monitor:', error);
      // On monitoring error, trigger shutdown as precaution
      await this.triggerEmergencyShutdown(['Monitoring system failure']);
    }
  }

  /**
   * Update system state with new metrics
   * @private
   * @param {Object} usage - Current usage metrics
   */
  updateState(usage) {
    const now = Date.now();
    const window = now - this.config.costWindow;

    // Prune old data
    this.state.costs = this.state.costs.filter(c => c.timestamp > window);
    this.state.tokenRates = this.state.tokenRates.filter(t => t.timestamp > window);
    this.state.cpuUsage = this.state.cpuUsage.filter(c => c.timestamp > window);
    this.state.memoryUsage = this.state.memoryUsage.filter(m => m.timestamp > window);

    // Add new data
    this.state.costs.push({ amount: usage.cost, timestamp: now });
    this.state.tokenRates.push({ count: usage.tokens, timestamp: now });
    this.state.cpuUsage.push({ percent: usage.cpu, timestamp: now });
    this.state.memoryUsage.push({ percent: usage.memory, timestamp: now });

    this.state.lastCheck = now;
  }

  /**
   * Check all safety thresholds
   * @private
   * @returns {string[]} - Array of threshold violations
   */
  checkThresholds() {
    const violations = [];

    // Check cost rate
    const totalCost = this.state.costs.reduce((sum, c) => sum + c.amount, 0);
    if (totalCost > this.config.costThreshold) {
      violations.push(`Cost threshold exceeded: $${totalCost.toFixed(2)}/min`);
    }

    // Check token rate
    const totalTokens = this.state.tokenRates.reduce((sum, t) => sum + t.count, 0);
    if (totalTokens > this.config.tokenRateThreshold) {
      violations.push(`Token rate threshold exceeded: ${totalTokens}/min`);
    }

    // Check CPU usage
    const avgCpu = this.average(this.state.cpuUsage.map(c => c.percent));
    if (avgCpu > this.config.cpuThreshold) {
      violations.push(`CPU threshold exceeded: ${avgCpu.toFixed(1)}%`);
    }

    // Check memory usage
    const avgMemory = this.average(this.state.memoryUsage.map(m => m.percent));
    if (avgMemory > this.config.memoryThreshold) {
      violations.push(`Memory threshold exceeded: ${avgMemory.toFixed(1)}%`);
    }

    return violations;
  }

  /**
   * Trigger emergency shutdown
   * @private
   * @param {string[]} reasons - Reasons for shutdown
   * @returns {Promise<void>}
   */
  async triggerEmergencyShutdown(reasons) {
    this.state.isActive = true;

    // Log incident
    await this.logIncident('EMERGENCY SHUTDOWN', reasons);

    // Notify all system components
    this.emit('shutdown', {
      timestamp: Date.now(),
      reasons,
      metrics: {
        costs: this.state.costs,
        tokenRates: this.state.tokenRates,
        cpuUsage: this.state.cpuUsage,
        memoryUsage: this.state.memoryUsage
      }
    });

    // Lock Act Mode
    await this.lockActMode();
  }

  /**
   * Lock Act Mode until audit
   * @private
   * @returns {Promise<void>}
   */
  async lockActMode() {
    // Create lock file
    const lockPath = path.join(__dirname, '../data/act_mode.lock');
    await fs.writeFile(lockPath, JSON.stringify({
      timestamp: Date.now(),
      reason: 'Emergency shutdown - requires audit'
    }));
  }

  /**
   * Log incident to killswitch.log
   * @private
   * @param {string} type - Incident type
   * @param {string[]} [details] - Additional details
   * @returns {Promise<void>}
   */
  async logIncident(type, details = []) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] ${type}\n${details.join('\n')}\n\n`;

    await fs.appendFile(this.config.logPath, message);
  }

  /**
   * Start resource monitoring
   * @private
   */
  startMonitoring() {
    setInterval(async () => {
      const usage = await this.getCurrentUsage();
      await this.monitor(usage);
    }, this.config.checkInterval);
  }

  /**
   * Get current system usage metrics
   * @private
   * @returns {Promise<Object>} - Current usage metrics
   */
  async getCurrentUsage() {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return {
      cpu: this.calculateCpuUsage(cpus),
      memory: ((totalMem - freeMem) / totalMem) * 100,
      tokens: 0, // To be provided by caller
      cost: 0 // To be provided by caller
    };
  }

  /**
   * Calculate average CPU usage
   * @private
   * @param {os.CpuInfo[]} cpus - CPU information
   * @returns {number} - CPU usage percentage
   */
  calculateCpuUsage(cpus) {
    const total = cpus.reduce((acc, cpu) => {
      const total = Object.values(cpu.times).reduce((sum, time) => sum + time, 0);
      const idle = cpu.times.idle;
      return acc + ((total - idle) / total) * 100;
    }, 0);

    return total / cpus.length;
  }

  /**
   * Calculate average of array
   * @private
   * @param {number[]} values - Array of numbers
   * @returns {number} - Average value
   */
  average(values) {
    return values.length ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
  }

  /**
   * Clean up resources
   */
  cleanup() {
    clearInterval(this.monitoringInterval);
  }
}

module.exports = KillSwitch;
