/**
 * Test Agent Client - Simulates a Triad agent connecting to the relay
 * Usage: node test-agent.js <agent-name>
 * Example: node test-agent.js GPT-5
 */

import WebSocket from 'ws';

const agentName = process.argv[2] || 'GPT-5';
const RELAY_URL = 'ws://localhost:8765';

console.log(`🤖 Starting test agent: ${agentName}`);
console.log(`📡 Connecting to relay: ${RELAY_URL}`);

const ws = new WebSocket(RELAY_URL);

ws.on('open', () => {
  console.log(`✅ ${agentName} connected to relay`);
  
  // Register as an agent
  ws.send(JSON.stringify({
    type: 'register',
    clientType: 'agent',
    agentName: agentName
  }));

  // Send periodic heartbeat to stay alive
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'heartbeat',
        agentName: agentName,
        timestamp: Date.now()
      }));
      console.log(`💓 Heartbeat sent from ${agentName}`);
    }
  }, 5000); // Every 5 seconds
});

ws.on('message', (data) => {
  try {
    const message = JSON.parse(data);
    console.log(`📨 ${agentName} received:`, message.type);
    
    // Respond to ping
    if (message.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong' }));
    }
  } catch (error) {
    console.error('Error parsing message:', error);
  }
});

ws.on('error', (error) => {
  console.error(`❌ ${agentName} error:`, error.message);
});

ws.on('close', () => {
  console.log(`🔌 ${agentName} disconnected`);
  process.exit(0);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log(`\n👋 ${agentName} shutting down...`);
  ws.close();
});

console.log(`\n${agentName} is running. Press Ctrl+C to stop.`);
