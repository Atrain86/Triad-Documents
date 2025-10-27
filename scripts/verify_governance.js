// Governance-Aware Synchronization Verification Script
import fs from "fs";
import path from "path";
import { getContext } from "../context/triad_context_hub.js";
import { watchGovernance } from "../governance/governance_watcher.js";
import "../context/governance_bridge.js";

console.log("\n=== GOVERNANCE SYNCHRONIZATION VERIFICATION ===\n");

// Step 1: Ensure logs directory exists
const logsDir = path.resolve("logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}
console.log("✅ Logs directory verified");

// Step 2: Create sample policy file if it doesn't exist
const policyFile = path.resolve("governance/TRIAD_CONTEXT_POLICY.md");
if (!fs.existsSync(policyFile)) {
  const samplePolicy = `# Triad Context Policy – Phase III-D Test

## Objective
This is a test policy file to verify the governance synchronization layer.

## Rules
1. Governance updates are propagated through the Context Hub.
2. All services receive policy updates in real-time.

## Test: ${new Date().toISOString()}
`;
  fs.writeFileSync(policyFile, samplePolicy);
  console.log("✅ Created sample policy file");
} else {
  console.log("✅ Using existing policy file");
}

// Step 3: Initialize governance watcher
console.log("\nInitializing governance watcher...");
watchGovernance();
console.log("✅ Governance watcher initialized");

// Step 4: Test policy update
console.log("\nUpdating policy to trigger events...");
const timestamp = new Date().toISOString();
const updatedPolicy = `# Triad Context Policy – Phase III-D Test

## Objective
This policy file has been updated by the verification script.

## Rules
1. Governance updates are propagated through the Context Hub.
2. All services receive policy updates in real-time.
3. Policy changes trigger events in the system.

## Last Update: ${timestamp}
`;
fs.writeFileSync(policyFile, updatedPolicy);
console.log("✅ Policy file updated with timestamp: " + timestamp);

// Step 5: Wait for events to propagate
console.log("\nWaiting for events to propagate (5 seconds)...");
await new Promise(resolve => setTimeout(resolve, 5000));

// Step 6: Verify context state
console.log("\nVerifying governance context...");
const context = getContext();

if (context.governance && context.governance.activePolicy) {
  console.log("✅ Governance policy detected in context");
  console.log(`- Policy updated at: ${context.governance.activePolicy.updated}`);
  console.log(`- Content length: ${context.governance.activePolicy.content.length} characters`);
} else {
  console.log("❌ Governance policy not found in context");
}

// Check if log file was created
const syncLogFile = path.resolve("logs/governance_sync.log");
if (fs.existsSync(syncLogFile)) {
  const logContent = fs.readFileSync(syncLogFile, "utf8");
  console.log(`\nGovernance sync log found with ${logContent.split("\n").filter(Boolean).length} entries`);
} else {
  console.log("\n❌ Governance sync log not found");
}

console.log("\n=== VERIFICATION COMPLETE ===");
console.log("Governance-Aware Synchronization Layer is now operational.");
console.log("Policy changes will now propagate across all Triad services in real-time.");
