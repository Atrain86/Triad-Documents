import { WebSocketServer } from "ws";
import { processInputForModel } from "/Users/atrain/Documents/AI_LOCAL/utils/chunker.js";

const wss = new WebSocketServer({ port: 8765 });
console.log("🚀 Triad Relay Server running on ws://localhost:8765");

// Mock LLM states
const llmStates = {
  gpt5: {
    id: 'gpt5',
    name: 'GPT-5',
    status: 'online',
    lastPing: Date.now(),
    responseTime: 45,
    model: 'gpt-5-turbo',
    temperature: 0.7,
    maxTokens: 4096
  },
  klein: {
    id: 'klein',
    name: 'Klein',
    status: 'online',
    lastPing: Date.now(),
    responseTime: 38,
    model: 'klein-v2',
    temperature: 0.8,
    maxTokens: 8192
  },
  claude: {
    id: 'claude',
    name: 'Claude',
    status: 'online',
    lastPing: Date.now(),
    responseTime: 52,
    model: 'claude-3-opus',
    temperature: 0.6,
    maxTokens: 4096
  }
};

// System stats
const systemStats = {
  uptime: process.uptime(),
  memory: process.memoryUsage(),
  connections: 0,
  messagesProcessed: 0,
  startTime: Date.now()
};

// Mock responses for each LLM
const generateMockResponse = (llmId, message) => {
  const responses = {
    gpt5: {
      prefix: "GPT-5: ",
      style: "analytical and comprehensive",
      emoji: "🤖"
    },
    klein: {
      prefix: "Klein: ",
      style: "creative and innovative",
      emoji: "🎨"
    },
    claude: {
      prefix: "Claude: ",
      style: "thoughtful and detailed",
      emoji: "📚"
    }
  };

  const llmInfo = responses[llmId];
  return `${llmInfo.emoji} ${llmInfo.prefix}I received your message: "${message}". As a ${llmInfo.style} AI, I'm here to help! [This is a mock response - actual LLM integration pending]`;
};

// Update LLM status periodically
setInterval(() => {
  Object.keys(llmStates).forEach(llmId => {
    llmStates[llmId].lastPing = Date.now();
    llmStates[llmId].responseTime = Math.floor(Math.random() * 50) + 20;
    // Randomly set one LLM offline occasionally for testing
    if (Math.random() > 0.95) {
      llmStates[llmId].status = 'offline';
    } else {
      llmStates[llmId].status = 'online';
    }
  });
  systemStats.uptime = process.uptime();
  systemStats.memory = process.memoryUsage();
}, 5000);

wss.on("connection", (ws) => {
  console.log("🔗 Dashboard connected to relay");
  systemStats.connections++;
  
  // Send initial connection confirmation
  ws.send(JSON.stringify({ 
    type: "status", 
    message: "Connected to Triad relay server",
    timestamp: Date.now()
  }));

  // Set up ping interval to keep connection alive
  const pingInterval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.ping();
    }
  }, 30000);

  ws.on("message", (msg) => {
    console.log("📩 Message received:", msg.toString());
    systemStats.messagesProcessed++;
    
    try {
      const data = JSON.parse(msg.toString());
      console.log("📦 Parsed data:", data);
      
      // Handle different message types
      switch (data.type) {
        case 'ping':
          // Respond to ping with pong
          ws.send(JSON.stringify({ 
            type: 'pong',
            id: data.id,
            timestamp: Date.now()
          }));
          break;

        case 'get_llm_status':
          // Send LLM status update
          ws.send(JSON.stringify({
            type: 'llm_status',
            payload: Object.values(llmStates),
            timestamp: Date.now()
          }));
          break;

        case 'get_system_stats':
          // Send system stats
          ws.send(JSON.stringify({
            type: 'system_stats',
            payload: {
              ...systemStats,
              uptime: Math.floor(systemStats.uptime),
              timestamp: Date.now()
            }
          }));
          break;

        case 'chat':
          // Handle chat messages to LLMs
          const { llmId, message } = data.payload || {};
          if (llmId && message) {
            // Process message through chunker
            const safeChunks = processInputForModel(message);
            
            // Simulate processing delay
            setTimeout(() => {
              // Send typing indicator
              ws.send(JSON.stringify({
                type: 'llm_typing',
                payload: { llmId, isTyping: true },
                timestamp: Date.now()
              }));

              // Simulate response delay
              setTimeout(() => {
                // Send response from specific LLM
                const response = generateMockResponse(llmId, message);
                ws.send(JSON.stringify({
                  type: 'chat_response',
                  payload: {
                    llmId,
                    message: response,
                    originalMessage: message,
                    timestamp: Date.now()
                  }
                }));

                // Stop typing indicator
                ws.send(JSON.stringify({
                  type: 'llm_typing',
                  payload: { llmId, isTyping: false },
                  timestamp: Date.now()
                }));
              }, 1000 + Math.random() * 2000); // 1-3 second delay
            }, 100);
          }
          break;

        case 'control':
          // Handle control commands
          const { command } = data.payload || {};
          console.log("🎛️ Control command:", command);
          
          // Send acknowledgment
          ws.send(JSON.stringify({
            type: 'control_response',
            payload: {
              command,
              status: 'executed',
              message: `Command '${command}' executed successfully`
            },
            timestamp: Date.now()
          }));
          break;

        case 'handshake':
          // Respond to handshake
          ws.send(JSON.stringify({
            type: 'handshake_ack',
            payload: {
              serverVersion: '5.B-fixed',
              capabilities: ['chat', 'status', 'control'],
              llms: Object.keys(llmStates)
            },
            timestamp: Date.now()
          }));
          break;

        default:
          // Echo unknown message types
          ws.send(JSON.stringify({ 
            type: "echo", 
            message: data,
            timestamp: Date.now()
          }));
      }
    } catch (err) {
      console.error("❌ Error parsing message:", err);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to parse message',
        error: err.message,
        timestamp: Date.now()
      }));
    }
  });

  ws.on("pong", () => {
    console.log("🏓 Pong received from client");
  });

  ws.on("error", (error) => {
    console.error("⚠️  WebSocket error:", error);
  });

  ws.on("close", () => {
    console.log("❌ Dashboard disconnected");
    systemStats.connections--;
    clearInterval(pingInterval);
  });
});

wss.on("error", (error) => {
  console.error("❌ Server error:", error);
});

console.log("✅ WebSocket server ready and listening for connections");
console.log("📊 Mock LLMs initialized: GPT-5, Klein, Claude");
