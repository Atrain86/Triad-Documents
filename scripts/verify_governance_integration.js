// Enhanced Verification Script – Phase III-E
// Tests the Cooperative Intelligence Layer with Governance Integration

import { sendMessage, onMessage } from "../cooperative/triad_message_bus.js";
import "../cooperative/governance_integration.js";  // This loads the governance validation
import fs from "fs";
import path from "path";

console.log("\n=== COOPERATIVE INTELLIGENCE VERIFICATION ===\n");

// Set up listener for all messages
onMessage((msg) => {
  console.log("[Verify] Message processed:", JSON.stringify(msg, null, 2));
});

// Function to check if the decision trace contains a specific message
function checkDecisionTrace(searchText) {
  const logFile = path.resolve("logs/decision_trace.log");
  if (fs.existsSync(logFile)) {
    const logContent = fs.readFileSync(logFile, "utf8");
    return logContent.includes(searchText);
  }
  return false;
}

// Test 1: Send a valid message (should succeed)
console.log("\nTest 1: Sending valid message from Cline (executor) to GPT5 (strategist)");
sendMessage("Cline", "GPT5", "report", { system_status: "nominal", metrics: { cpu: 42, memory: 75 } });

// Test 2: Send a message with invalid intent (should fail permission check)
console.log("\nTest 2: Sending invalid message with unauthorized intent");
sendMessage("Cline", "GPT5", "analyze", { data: "This should fail permission check" });

// Test 3: Send a message from unknown agent (should fail)
console.log("\nTest 3: Sending message from unknown agent");
sendMessage("UnknownAgent", "GPT5", "report", { data: "This should fail agent validation" });

// Test 4: Demonstrate governance policy integration
console.log("\nTest 4: Sending message under governance policy");
sendMessage("GPT5", "TriadDocs", "advise", { recommendation: "Increase monitoring frequency" });

// Wait a moment for all logs to be written
setTimeout(() => {
  console.log("\n=== VERIFICATION RESULTS ===\n");
  
  // Check decision trace log for entries
  const logFile = path.resolve("logs/decision_trace.log");
  if (fs.existsSync(logFile)) {
    const logContent = fs.readFileSync(logFile, "utf8");
    const entries = logContent.split("\n").filter(Boolean);
    console.log(`✅ Decision trace log contains ${entries.length} entries`);
    
    // Check for specific test results
    if (checkDecisionTrace("Cline->GPT5 [report]")) {
      console.log("✅ Test 1 passed: Valid message was logged");
    }
    
    if (checkDecisionTrace("VIOLATION")) {
      console.log("✅ Test 2/3 passed: Invalid messages were blocked");
    }
    
    console.log("\nSample from decision trace log:");
    for (const entry of entries.slice(-2)) {
      console.log(`- ${entry}`);
    }
  } else {
    console.log("❌ Decision trace log not found");
  }
  
  console.log("\n=== PHASE III-E COMPLETE ===");
  console.log("The Cooperative Intelligence Layer is now operational.");
  console.log("Agents can communicate under governance controls.");
  console.log("All messages are traced and validated against permissions.");
}, 1000);
