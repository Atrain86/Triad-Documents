// Emergent Learning & Optimization Startup Script
// Loads the learning engine and schedules analysis runs

import { analyzeLogs } from "../learning/triad_learning_engine.js";
import { sendMessage, onMessage } from "../cooperative/triad_message_bus.js";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

console.log("\n[LearningEngine] Starting Emergent Learning & Optimization Layer...\n");

// Create logs directory if it doesn't exist
const logsDir = path.resolve("logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize learning trace log
const logFile = path.resolve("logs/learning_trace.log");
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, `${new Date().toISOString()} INIT Learning Engine Started\n`);
}

// Load optimization rules
const rules = yaml.load(fs.readFileSync("learning/optimization_rules.yaml", "utf8"));

// Listen for optimization requests
onMessage((msg) => {
  if (msg.intent === "request_optimization") {
    console.log(`[LearningEngine] Optimization requested by ${msg.from}`);
    
    // Log the request
    fs.appendFileSync(logFile, 
      `${new Date().toISOString()} REQUEST ${msg.from} requested optimization analysis\n`);
    
    // Perform analysis
    analyzeLogs();
    
    // Load the generated report
    const reportFile = path.resolve("logs/learning_report.json");
    if (fs.existsSync(reportFile)) {
      const report = JSON.parse(fs.readFileSync(reportFile, "utf8"));
      
      // Send results back to requester
      sendMessage("TriadDocs", msg.from, "optimization_results", {
        timestamp: new Date().toISOString(),
        suggestions: report.suggestions
      });
      
      // Log the response
      fs.appendFileSync(logFile, 
        `${new Date().toISOString()} RESPONSE Sent optimization results to ${msg.from}\n`);
    }
  }
});

// Set up global message handler for logging learning events
onMessage((msg) => {
  if (msg.intent.startsWith("optimization_")) {
    console.log(`[LearningEngine] ${msg.intent}: ${msg.from} → ${msg.to}`);
  }
});

// Send a startup notification message
sendMessage("TriadDocs", "GPT5", "record", { 
  event: "startup", 
  component: "learning-engine",
  timestamp: new Date().toISOString(),
  optimizationRules: rules
});

// Run initial analysis
console.log("[LearningEngine] Running initial optimization analysis...");
analyzeLogs();

console.log("[LearningEngine] Emergent Learning & Optimization Layer is running");
console.log(`[LearningEngine] Optimization rules loaded (threshold: ${rules.duration_threshold})`);
console.log(`[LearningEngine] Auto-apply: ${rules.auto_apply}, Governance review: ${rules.governance_review}`);
console.log("[LearningEngine] Waiting for optimization requests...\n");

// Schedule regular analysis runs
const analysisInterval = 3600000; // Every hour
setInterval(() => {
  const now = new Date().toISOString();
  console.log(`[LearningEngine] Running scheduled optimization analysis at ${now}`);
  
  // Log the scheduled run
  fs.appendFileSync(logFile, 
    `${now} SCHEDULED Running regular optimization analysis\n`);
    
  // Perform analysis
  analyzeLogs();
  
  // Log heartbeat
  console.log(`[LearningEngine] Heartbeat at ${now} - System operational`);
  
}, analysisInterval);
