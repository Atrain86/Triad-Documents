// Triad Coordinator - Phase III-C Integration
import { analyzeTelemetry } from "../phase3b_prototype/phase3b_analyzer.js";
import { recordFeedback } from "../phase3b_prototype/triad_feedback_loop.js";
import { initializeCollector, collectAndPublishTelemetry } from "../context/telemetry_collector.js";
import cron from "node-cron";

// Initialize the Context Hub integration
console.log("[Coordinator] Starting Triad service coordinator...");
initializeCollector();

// Perform initial telemetry collection and publish
collectAndPublishTelemetry().catch(err => {
  console.error("[Coordinator] Initial telemetry collection failed:", err.message);
});

// Adaptive analysis every 15 minutes
cron.schedule("*/15 * * * *", async () => {
  try {
    console.log("[Adaptive] Running periodic telemetry analysis…");
    await analyzeTelemetry();
    
    // After analysis, publish fresh telemetry to Context Hub
    await collectAndPublishTelemetry();
  } catch (err) {
    console.error("[Adaptive] Analyzer error:", err.message);
  }
});

// Feedback loop inside recovery routine
export async function recoverService() {
  try {
    // existing restart logic …
    recordFeedback("success");
    
    // Update context after successful recovery
    await collectAndPublishTelemetry();
  } catch (e) {
    recordFeedback("failure");
  }
}

// Log startup confirmation
console.log("[Coordinator] Context Hub integration active");
console.log("[Coordinator] Service state synchronization enabled");
