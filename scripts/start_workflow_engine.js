// Emergent Workflow Orchestration Startup Script
// Loads the workflow engine and governance integration

import "../workflow/workflow_governance_bridge.js";  // This loads the governance validation
import { startWorkflow } from "../workflow/triad_workflow_engine.js";
import { sendMessage, onMessage } from "../cooperative/triad_message_bus.js";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

console.log("\n[WorkflowEngine] Starting Emergent Workflow Orchestration Layer...\n");

// Create logs directory if it doesn't exist
const logsDir = path.resolve("logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize workflow trace log if needed
const logFile = path.resolve("logs/workflow_trace.log");
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, `${new Date().toISOString()} INIT Workflow Engine Started\n`);
}

// Load workflow registry
const workflowRegistry = yaml.load(
  fs.readFileSync(path.resolve("workflow/workflow_registry.yaml"), "utf8")
);

// Listen for workflow initiation requests
onMessage((msg) => {
  if (msg.intent === "start_registered_workflow") {
    const { name, data } = msg.data;
    const template = workflowRegistry.templates.find(t => t.name === name);
    
    if (template) {
      console.log(`[WorkflowEngine] Starting workflow ${name}`);
      // Create a workflow instance from the template
      const workflowInstance = {
        name: `${name}_${Date.now()}`,
        steps: template.steps,
        data: data || {}
      };
      
      // Start the workflow
      startWorkflow(workflowInstance);
    } else {
      console.error(`[WorkflowEngine] Unknown workflow: ${name}`);
      
      // Notify initiator
      sendMessage("TriadDocs", msg.from, "workflow_error", {
        error: `Unknown workflow: ${name}`,
        timestamp: new Date().toISOString()
      });
    }
  }
});

// Set up global message handler for logging workflow events
onMessage((msg) => {
  if (msg.intent.startsWith("workflow_")) {
    console.log(`[WorkflowEngine] ${msg.intent}: ${msg.from} → ${msg.to}`);
  }
});

// Send a startup notification message
sendMessage("TriadDocs", "GPT5", "record", { 
  event: "startup", 
  component: "workflow-engine",
  timestamp: new Date().toISOString(),
  registeredWorkflows: workflowRegistry.templates.map(t => t.name)
});

console.log("[WorkflowEngine] Emergent Workflow Orchestration Layer is running");
console.log(`[WorkflowEngine] ${workflowRegistry.templates.length} workflow templates loaded`);
console.log("[WorkflowEngine] Waiting for workflow requests...\n");

// Keep process running and log heartbeats
setInterval(() => {
  const now = new Date().toISOString();
  console.log(`[WorkflowEngine] Heartbeat at ${now} - System operational`);
  
  // Log to workflow trace
  fs.appendFileSync(logFile, 
    `${now} HEARTBEAT Workflow Engine operational\n`);
}, 60000); // Every minute
