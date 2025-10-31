import { WebSocketServer } from 'ws';
import crypto from 'crypto';
import fetch from 'node-fetch';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';

// Initialize environment variables
config();

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Enhanced Triad Relay with GitHub Bridge
class EnhancedTriadRelay {
  constructor(port) {
    this.port = port;
    this.server = null;
    this.clients = new Map();
    this.messageLog = [];
    this.secret = process.env.TRIAD_SECRET;
    this.githubServerUrl = 'http://localhost:4001';
    this.operationCache = new Map();
    this.killswitchActive = false;
  }

  start() {
    this.server = new WebSocketServer({ port: this.port });
    
    console.log(`🔗 Enhanced Triad Relay running on localhost:${this.port}`);
    console.log(`🔗 GitHub Bridge ready on ${this.githubServerUrl}`);
    this.initializeLogFile();

    this.server.on('connection', (ws) => {
      console.log('New connection attempt...');

      ws.on('message', async (data) => {
        const message = JSON.parse(data);

        // Check killswitch
        if (this.killswitchActive) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Killswitch active - operations halted'
          }));
          return;
        }

        if (!this.validateMessage(message)) {
          ws.send(JSON.stringify({
            type: 'error',
            error: 'Invalid message format or authentication'
          }));
          return;
        }

        // Route based on message type
        if (message.type === 'auth') {
          this.handleAuth(ws, message);
        } else if (message.type === 'github') {
          await this.handleGitHubOperation(ws, message);
        } else if (message.type === 'killswitch') {
          this.handleKillswitch(message);
        } else {
          await this.handleMessage(ws, message);
        }
      });

      ws.on('close', () => {
        for (const [sender, client] of this.clients.entries()) {
          if (client === ws) {
            this.clients.delete(sender);
            console.log(`${sender} disconnected`);
            this.logEvent('disconnect', { sender });
            break;
          }
        }
      });

      ws.on('error', (err) => {
        console.error('WebSocket error:', err);
        this.logEvent('error', { error: err.message });
      });
    });
  }

  validateMessage(message) {
    if (!message.sender || !message.timestamp || !message.signature) {
      return false;
    }

    const data = `${message.sender}:${message.timestamp}`;
    const expectedSignature = crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(message.signature),
      Buffer.from(expectedSignature)
    );
  }

  handleAuth(ws, message) {
    if (message.sender === 'gpt5' || message.sender === 'cline') {
      this.clients.set(message.sender, ws);
      console.log(`✅ ${message.sender} authenticated`);
      
      ws.send(JSON.stringify({
        type: 'auth_success',
        sender: 'relay',
        timestamp: Date.now()
      }));

      this.logEvent('auth', { sender: message.sender });
    }
  }

  async handleGitHubOperation(ws, message) {
    const startTime = Date.now();
    
    try {
      // Check cache first
      const cacheKey = JSON.stringify(message.operation);
      if (this.operationCache.has(cacheKey)) {
        const cached = this.operationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
          ws.send(JSON.stringify({
            type: 'github_response',
            data: cached.data,
            cached: true,
            latency: Date.now() - startTime
          }));
          return;
        }
      }

      // Forward to GitHub server
      const response = await this.forwardToGitHub(message.operation);
      
      // Cache successful responses
      if (response.success) {
        this.operationCache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now()
        });
      }

      // Send response back
      ws.send(JSON.stringify({
        type: 'github_response',
        data: response.data,
        success: response.success,
        latency: Date.now() - startTime
      }));

      // Log the operation
      this.logEvent('github_operation', {
        operation: message.operation.type,
        success: response.success,
        latency: Date.now() - startTime
      });

    } catch (error) {
      console.error('GitHub operation error:', error);
      
      // Fallback mechanism
      ws.send(JSON.stringify({
        type: 'github_error',
        error: error.message,
        fallback: 'Check local git status'
      }));

      this.logEvent('github_error', {
        operation: message.operation?.type,
        error: error.message
      });
    }
  }

  async forwardToGitHub(operation) {
    const { type, params } = operation;
    
    let url = this.githubServerUrl;
    let method = 'GET';
    let body = null;

    // Map operation types to endpoints
    switch (type) {
      case 'list':
        url += `/github/list?${new URLSearchParams(params)}`;
        break;
      case 'content':
        url += `/github/content?${new URLSearchParams(params)}`;
        break;
      case 'branches':
        url += `/github/branches?${new URLSearchParams(params)}`;
        break;
      case 'commit':
        url += '/github/commit';
        method = 'POST';
        body = JSON.stringify(params);
        break;
      case 'create-branch':
        url += '/github/create-branch';
        method = 'POST';
        body = JSON.stringify(params);
        break;
      case 'create-pr':
        url += '/github/create-pr';
        method = 'POST';
        body = JSON.stringify(params);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }

    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (body) {
      options.body = body;
    }

    const response = await fetch(url, options);
    const data = await response.json();

    return {
      success: response.ok,
      data
    };
  }

  async handleMessage(ws, message) {
    // Standard message relay with Goal-First validation
    if (!message.goal || !message.confidence || message.confidence < 0.85) {
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Message must include goal and confidence ≥ 0.85'
      }));
      return;
    }

    // Log and relay
    this.logMessage(message);
    this.relayMessage(message);
  }

  relayMessage(message) {
    for (const [sender, client] of this.clients.entries()) {
      if (sender !== message.sender) {
        client.send(JSON.stringify(message));
      }
    }
  }

  handleKillswitch(message) {
    if (message.action === 'activate') {
      this.killswitchActive = true;
      console.log('🛑 KILLSWITCH ACTIVATED');
      this.broadcastToAll({
        type: 'system',
        message: 'Killswitch activated - all operations halted'
      });
      this.logEvent('killswitch', { status: 'activated' });
    } else if (message.action === 'deactivate') {
      this.killswitchActive = false;
      console.log('✅ Killswitch deactivated');
      this.broadcastToAll({
        type: 'system',
        message: 'Killswitch deactivated - operations resumed'
      });
      this.logEvent('killswitch', { status: 'deactivated' });
    }
  }

  broadcastToAll(message) {
    const broadcastMsg = JSON.stringify(message);
    for (const client of this.clients.values()) {
      client.send(broadcastMsg);
    }
  }

  initializeLogFile() {
    const logDir = join(__dirname, 'triad_logs');
    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true });
    }

    const date = new Date().toISOString().split('T')[0];
    this.logFile = join(logDir, `bridge_test_${date}.jsonl`);
    
    // Write initialization entry
    this.logEvent('system', { event: 'relay_initialized', port: this.port });
  }

  logEvent(type, data) {
    const entry = {
      timestamp: Date.now(),
      type,
      ...data
    };

    appendFileSync(this.logFile, JSON.stringify(entry) + '\n');
  }

  logMessage(message) {
    this.messageLog.push({
      ...message,
      relayTimestamp: Date.now()
    });

    this.logEvent('message', {
      sender: message.sender,
      goal: message.goal,
      confidence: message.confidence
    });

    // Check for round-trip completion
    if (this.isRoundTripComplete()) {
      this.saveMetrics();
    }
  }

  isRoundTripComplete() {
    const messages = this.messageLog.slice(-3);
    if (messages.length < 3) return false;

    return (
      messages[0].sender === 'gpt5' &&
      messages[1].sender === 'cline' &&
      messages[2].sender === 'gpt5'
    );
  }

  saveMetrics() {
    const metrics = {
      timestamp: Date.now(),
      totalMessages: this.messageLog.length,
      roundTrips: Math.floor(this.messageLog.length / 3),
      averageLatency: this.calculateAverageLatency(),
      cacheHitRate: this.calculateCacheHitRate(),
      githubOperations: this.messageLog.filter(m => m.type === 'github').length
    };

    this.logEvent('metrics', metrics);
    console.log('📊 Metrics:', metrics);
  }

  calculateAverageLatency() {
    let totalLatency = 0;
    let count = 0;

    for (let i = 1; i < this.messageLog.length; i++) {
      const latency = this.messageLog[i].relayTimestamp - this.messageLog[i-1].relayTimestamp;
      totalLatency += latency;
      count++;
    }

    return count > 0 ? Math.round(totalLatency / count) : 0;
  }

  calculateCacheHitRate() {
    const cacheHits = this.messageLog.filter(m => m.cached).length;
    const totalOps = this.messageLog.filter(m => m.type === 'github').length;
    return totalOps > 0 ? (cacheHits / totalOps * 100).toFixed(2) : 0;
  }

  // Graceful shutdown
  shutdown() {
    console.log('Shutting down relay...');
    this.logEvent('system', { event: 'relay_shutdown' });
    
    // Close all connections
    for (const client of this.clients.values()) {
      client.close();
    }
    
    this.server.close();
  }
}

// Start enhanced relay server
const relay = new EnhancedTriadRelay(8765);
relay.start();

// Handle process termination
process.on('SIGINT', () => {
  relay.shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  relay.shutdown();
  process.exit(0);
});
