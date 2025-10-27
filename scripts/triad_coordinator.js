import { analyzeTelemetry } from "../phase3b_prototype/phase3b_analyzer.js";
import { recordFeedback } from "../phase3b_prototype/triad_feedback_loop.js";
import cron from "node-cron";

// ──────────────────────────────────────────────────────────────
// Existing imports and coordinator logic go here …

// Adaptive analysis every 15 minutes
cron.schedule("*/15 * * * *", async () => {
  try {
    console.log("[Adaptive] Running periodic telemetry analysis…");
    await analyzeTelemetry();
  } catch (err) {
    console.error("[Adaptive] Analyzer error:", err.message);
  }
});

// Feedback loop inside recovery routine
export async function recoverService() {
  try {
    // existing restart logic …
    recordFeedback("success");
  } catch (e) {
    recordFeedback("failure");
  }
}
