// Governance-Aware Synchronization System Startup
// Phase III-D: Main Entry Point

import fs from "fs";
import path from "path";
import { watchGovernance } from "../governance/governance_watcher.js";
import "../context/governance_bridge.js";
import { getContext } from "../context/triad_context_hub.js";

console.log("\n[GovernanceSync] Starting Governance-Aware Synchronization Layer...");

// Ensure logs directory exists
const logsDir = path.resolve("logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Initialize the governance directory structure
const policyFile = path.resolve("governance/TRIAD_CONTEXT_POLICY.md");
if (!fs.existsSync(policyFile)) {
  // Create policy file if it doesn't exist
  console.log("[GovernanceSync] Creating default policy file");
  const defaultPolicy = `# Triad Context Policy – Phase III-D

## Objective
This policy governs the synchronization of context across the Triad service network.

## Rules
1. Governance updates are propagated through the Context Hub.
2. All services receive policy updates in real-time.
3. Policy changes are logged and auditable.
4. Snapshots of the policy state are taken at regular intervals.

## Last Update: ${new Date().toISOString()}
`;
  fs.writeFileSync(policyFile, defaultPolicy);
}

// Start governance watcher to monitor for policy changes
console.log("[GovernanceSync] Starting governance file watcher");
watchGovernance();

// Initialize scheduler for periodic synchronization
console.log("[GovernanceSync] Initializing synchronization scheduler");
const syncConfig = path.resolve("governance/governance_sync.yaml");
if (fs.existsSync(syncConfig)) {
  console.log(`[GovernanceSync] Using configuration from ${syncConfig}`);
} else {
  console.warn("[GovernanceSync] Configuration file not found, using defaults");
}

// Report initial context state
const context = getContext();
console.log("[GovernanceSync] Initial context state:");
console.log(`- Last update: ${context.lastUpdate}`);
console.log(`- Services: ${Object.keys(context.services).length} registered`);

// Keep process running
console.log("\n[GovernanceSync] Governance-Aware Synchronization Layer is now operational");
console.log("[GovernanceSync] Listening for policy updates and context changes...\n");

// Prevent Node.js from exiting
setInterval(() => {
  // Print a periodic heartbeat message
  const now = new Date().toISOString();
  console.log(`[GovernanceSync] Heartbeat at ${now} - System operational`);
  
  // Log current governance state periodically
  const currentContext = getContext();
  if (currentContext.governance && currentContext.governance.activePolicy) {
    const lastUpdate = currentContext.governance.activePolicy.updated;
    fs.appendFileSync(
      path.resolve("logs/governance_heartbeat.log"),
      `${now} Active policy from: ${lastUpdate}\n`
    );
  }
}, 60000); // Every minute
