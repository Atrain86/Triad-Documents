// Governance Integration Bridge – Phase III-E
// Connects the Message Bus to Governance rules for policy enforcement

import { onMessage } from "./triad_message_bus.js";
import { getContext } from "../context/triad_context_hub.js";
import fs from "fs";
import path from "path";

// Load agent registry and role policy
const agentRegistry = JSON.parse(
  fs.readFileSync(path.resolve("cooperative/agent_registry.json"), "utf8")
);

const rolePolicy = fs.readFileSync(
  path.resolve("cooperative/role_policy.yaml"), "utf8"
);

// Set up decision trace logging
const logFile = path.resolve("logs/decision_trace.log");
if (!fs.existsSync(path.dirname(logFile))) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
}

// Policy validation function
function validatePermission(from, intent) {
  const agent = agentRegistry[from];
  if (!agent) {
    console.error(`[Governance] Unknown agent: ${from}`);
    return false;
  }
  
  if (!agent.permissions.includes(intent)) {
    console.error(`[Governance] Agent ${from} does not have permission for ${intent}`);
    return false;
  }
  
  return true;
}

// Subscribe to all messages for governance validation
onMessage((msg) => {
  const { from, to, intent, data, timestamp } = msg;
  
  // Log the message to decision trace
  fs.appendFileSync(logFile, 
    `${timestamp} ${from}->${to} [${intent}] ${JSON.stringify(data)}\n`
  );

  // Check permission against governance rules
  if (!validatePermission(from, intent)) {
    // Log governance violation
    fs.appendFileSync(logFile, 
      `${new Date().toISOString()} VIOLATION ${from} attempted ${intent} without permission\n`
    );
    return;
  }
  
  // Check current governance state from Context Hub
  const context = getContext();
  if (context.governance && context.governance.activePolicy) {
    console.log(`[Governance] Message validated under policy from: ${context.governance.activePolicy.updated}`);
  }
});

console.log("[Governance] Cooperative Intelligence Layer integrated with Governance controls");
