#!/usr/bin/env node

import WebSocket from 'ws';
import crypto from 'crypto';
import readline from 'readline';
import chalk from 'chalk';
import boxen from 'boxen';
import { config } from 'dotenv';

// Load environment
config();

class TriadMonitor {
  constructor() {
    this.secret = process.env.TRIAD_SECRET || 'dev-only-secret';
    this.messages = [];
    this.maxMessages = 10;
    this.connected = false;
    this.agents = {
      gpt5: false,
      cline: false
    };
    this.stats = {
      messagesTotal: 0,
      githubOps: 0,
      avgLatency: 0,
      lastActivity: null
    };
  }

  start() {
    console.clear();
    this.connect();
    this.setupKeyboardInput();
    this.render();
    
    // Auto-refresh every second
    setInterval(() => this.render(), 1000);
  }

  connect() {
    this.ws = new WebSocket('ws://localhost:8765');
    
    this.ws.on('open', () => {
      this.connected = true;
      this.authenticate();
      this.addSystemMessage('Connected to Triad Relay', 'success');
    });

    this.ws.on('message', (data) => {
      const message = JSON.parse(data);
      this.handleMessage(message);
    });

    this.ws.on('close', () => {
      this.connected = false;
      this.addSystemMessage('Disconnected from relay', 'error');
      // Reconnect after 3 seconds
      setTimeout(() => this.connect(), 3000);
    });

    this.ws.on('error', (err) => {
      this.addSystemMessage(`Connection error: ${err.message}`, 'error');
    });
  }

  authenticate() {
    const timestamp = Date.now();
    const sender = 'monitor';
    const signature = this.createSignature(sender, timestamp);
    
    this.ws.send(JSON.stringify({
      type: 'auth',
      sender,
      timestamp,
      signature
    }));
  }

  createSignature(sender, timestamp) {
    const data = `${sender}:${timestamp}`;
    return crypto
      .createHmac('sha256', this.secret)
      .update(data)
      .digest('hex');
  }

  handleMessage(message) {
    const time = new Date().toLocaleTimeString();
    
    switch(message.type) {
      case 'auth_success':
        this.addSystemMessage('Monitor authenticated', 'success');
        break;
        
      case 'message':
        this.stats.messagesTotal++;
        this.stats.lastActivity = time;
        
        // Check if agents are online
        if (message.sender === 'gpt5') this.agents.gpt5 = true;
        if (message.sender === 'cline') this.agents.cline = true;
        
        this.addMessage({
          time,
          from: message.sender,
          to: message.sender === 'gpt5' ? 'Klein' : 'GPT',
          goal: message.goal || 'No goal specified',
          confidence: message.confidence || 0,
          tone: message.tone || 0,
          content: message.content?.substring(0, 100) + '...'
        });
        break;
        
      case 'github':
        this.stats.githubOps++;
        this.stats.lastActivity = time;
        
        this.addMessage({
          time,
          from: message.sender,
          to: 'GitHub',
          operation: message.operation?.type || 'Unknown',
          params: JSON.stringify(message.operation?.params || {}).substring(0, 50) + '...',
          isGithub: true
        });
        break;
        
      case 'github_response':
        this.addMessage({
          time,
          from: 'GitHub',
          to: 'Relay',
          status: message.success ? 'SUCCESS' : 'FAILED',
          latency: message.latency ? `${message.latency}ms` : 'N/A',
          cached: message.cached ? '(cached)' : '',
          isGithub: true
        });
        
        // Update average latency
        if (message.latency) {
          this.stats.avgLatency = this.stats.avgLatency === 0 
            ? message.latency 
            : Math.round((this.stats.avgLatency + message.latency) / 2);
        }
        break;
        
      case 'system':
        this.addSystemMessage(message.message, 'info');
        break;
        
      case 'error':
        this.addSystemMessage(message.error, 'error');
        break;
    }
  }

  addMessage(msg) {
    this.messages.unshift(msg);
    if (this.messages.length > this.maxMessages) {
      this.messages.pop();
    }
  }

  addSystemMessage(text, type) {
    const time = new Date().toLocaleTimeString();
    this.messages.unshift({
      time,
      system: true,
      text,
      type
    });
    if (this.messages.length > this.maxMessages) {
      this.messages.pop();
    }
  }

  render() {
    console.clear();
    
    // Header
    console.log(boxen(
      chalk.bold.cyan('TRIAD CONVERSATION MONITOR v1.0'),
      { 
        padding: 1, 
        borderStyle: 'double',
        borderColor: 'cyan'
      }
    ));

    // Connection Status
    console.log('\n' + chalk.bold('📡 CONNECTION STATUS'));
    console.log(chalk.gray('─'.repeat(50)));
    
    const relayStatus = this.connected 
      ? chalk.green('● CONNECTED') 
      : chalk.red('● DISCONNECTED');
    console.log(`Relay: ${relayStatus}`);
    
    const gptStatus = this.agents.gpt5 
      ? chalk.green('● ONLINE') 
      : chalk.gray('○ OFFLINE');
    console.log(`GPT-5: ${gptStatus}`);
    
    const kleinStatus = this.agents.cline 
      ? chalk.green('● ONLINE') 
      : chalk.gray('○ OFFLINE');
    console.log(`Klein: ${kleinStatus}`);

    // Statistics
    console.log('\n' + chalk.bold('📊 STATISTICS'));
    console.log(chalk.gray('─'.repeat(50)));
    console.log(`Total Messages: ${chalk.yellow(this.stats.messagesTotal)}`);
    console.log(`GitHub Operations: ${chalk.yellow(this.stats.githubOps)}`);
    console.log(`Average Latency: ${chalk.yellow(this.stats.avgLatency + 'ms')}`);
    console.log(`Last Activity: ${chalk.yellow(this.stats.lastActivity || 'None')}`);

    // Messages
    console.log('\n' + chalk.bold('💬 CONVERSATION STREAM'));
    console.log(chalk.gray('─'.repeat(50)));
    
    if (this.messages.length === 0) {
      console.log(chalk.gray('No messages yet...'));
    } else {
      this.messages.forEach(msg => {
        if (msg.system) {
          // System message
          let color = chalk.gray;
          if (msg.type === 'success') color = chalk.green;
          if (msg.type === 'error') color = chalk.red;
          if (msg.type === 'info') color = chalk.blue;
          console.log(color(`[${msg.time}] SYSTEM: ${msg.text}`));
        } else if (msg.isGithub) {
          // GitHub operation
          if (msg.operation) {
            console.log(chalk.magenta(`[${msg.time}] ${msg.from} → GitHub`));
            console.log(chalk.magenta(`  Operation: ${msg.operation}`));
            console.log(chalk.gray(`  Params: ${msg.params}`));
          } else {
            console.log(chalk.magenta(`[${msg.time}] GitHub → ${msg.to}`));
            console.log(chalk.magenta(`  Status: ${msg.status} ${msg.latency} ${msg.cached}`));
          }
        } else {
          // Regular message
          console.log(chalk.cyan(`[${msg.time}] ${msg.from} → ${msg.to}`));
          console.log(chalk.white(`  Goal: "${msg.goal}"`));
          
          // Color code confidence
          let confColor = chalk.red;
          if (msg.confidence >= 0.85) confColor = chalk.green;
          else if (msg.confidence >= 0.7) confColor = chalk.yellow;
          
          console.log(`  Confidence: ${confColor(msg.confidence.toFixed(2))} | Tone: ${chalk.blue(msg.tone.toFixed(2))}`);
          
          if (msg.content) {
            console.log(chalk.gray(`  Content: ${msg.content}`));
          }
        }
        console.log('');
      });
    }

    // Controls
    console.log(chalk.gray('─'.repeat(50)));
    console.log(chalk.bold('CONTROLS: ') + 
      chalk.yellow('[K]') + 'illswitch  ' +
      chalk.yellow('[T]') + 'est Message  ' +
      chalk.yellow('[G]') + 'itHub Test  ' +
      chalk.yellow('[C]') + 'lear  ' +
      chalk.yellow('[Q]') + 'uit'
    );
  }

  setupKeyboardInput() {
    readline.emitKeypressEvents(process.stdin);
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
    }

    process.stdin.on('keypress', (str, key) => {
      if (key.ctrl && key.name === 'c') {
        this.quit();
      }
      
      switch(key.name) {
        case 'q':
          this.quit();
          break;
        case 'k':
          this.sendKillswitch();
          break;
        case 't':
          this.sendTestMessage();
          break;
        case 'g':
          this.sendGitHubTest();
          break;
        case 'c':
          this.messages = [];
          this.render();
          break;
      }
    });
  }

  sendKillswitch() {
    const timestamp = Date.now();
    this.ws.send(JSON.stringify({
      type: 'killswitch',
      action: 'activate',
      sender: 'monitor',
      timestamp,
      signature: this.createSignature('monitor', timestamp)
    }));
    this.addSystemMessage('Killswitch activated!', 'error');
    
    // Auto-deactivate after 3 seconds
    setTimeout(() => {
      const ts = Date.now();
      this.ws.send(JSON.stringify({
        type: 'killswitch',
        action: 'deactivate',
        sender: 'monitor',
        timestamp: ts,
        signature: this.createSignature('monitor', ts)
      }));
      this.addSystemMessage('Killswitch deactivated', 'success');
    }, 3000);
  }

  sendTestMessage() {
    const timestamp = Date.now();
    this.ws.send(JSON.stringify({
      type: 'message',
      sender: 'monitor',
      content: 'Test message from monitor',
      goal: 'Monitor connectivity test',
      confidence: 0.95,
      tone: 0.9,
      timestamp,
      signature: this.createSignature('monitor', timestamp)
    }));
    this.addSystemMessage('Test message sent', 'info');
  }

  sendGitHubTest() {
    const timestamp = Date.now();
    this.ws.send(JSON.stringify({
      type: 'github',
      sender: 'monitor',
      timestamp,
      signature: this.createSignature('monitor', timestamp),
      operation: {
        type: 'branches',
        params: {
          owner: 'Atrain86',
          repo: 'Triad-Documents'
        }
      }
    }));
    this.addSystemMessage('GitHub test initiated', 'info');
  }

  quit() {
    console.clear();
    console.log(chalk.bold.green('Triad Monitor closed. Goodbye!'));
    if (this.ws) this.ws.close();
    process.exit(0);
  }
}

// Start the monitor
const monitor = new TriadMonitor();
monitor.start();
