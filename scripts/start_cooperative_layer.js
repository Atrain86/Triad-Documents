// Co-operative Intelligence Layer Startup Script
// Loads the message bus and governance integration

import "../cooperative/governance_integration.js";  // This loads the governance validation
import { sendMessage, onMessage } from "../cooperative/triad_message_bus.js";
import fs from "fs";
import path from "path";

console.log("\n[CooperativeLayer] Starting Co-operative Intelligence Layer...\n");

// Create logs directory if it doesn't exist
const logsDir = path.resolve("logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize decision trace log
const logFile = path.resolve("logs/decision_trace.log");
fs.appendFileSync(logFile, 
  `${new Date().toISOString()} SYSTEM Cooperative Intelligence Layer started\n`
);

// Set up global message handler for logging
onMessage((msg) => {
  console.log(`[CooperativeLayer] Message: ${msg.from} → ${msg.to}: ${msg.intent}`);
});

// Send a startup notification message
sendMessage("TriadDocs", "GPT5", "record", { 
  event: "startup", 
  timestamp: new Date().toISOString(),
  component: "cooperative-layer"
});

console.log("[CooperativeLayer] Cooperative Intelligence Layer is running");
console.log("[CooperativeLayer] Message bus and governance integration active");
console.log("[CooperativeLayer] Waiting for agent communication...\n");

// Keep process running and log heartbeats
setInterval(() => {
  const now = new Date().toISOString();
  console.log(`[CooperativeLayer] Heartbeat at ${now} - System operational`);
}, 60000); // Every minute
