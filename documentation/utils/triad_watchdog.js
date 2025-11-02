import { exec } from "child_process";
import fs from "fs";
import path from "path";

const CHECK_INTERVAL = 30000;  // 30s
const TIMEOUT_LIMIT = 60000;   // 60s
const LOG_DIR = "/Users/atrain/Documents/AI_LOCAL/triad_logs";
const SAFE_BOOT = "/Users/atrain/Documents/AI_LOCAL/utils/triad_safe_boot.sh";
const RELAY_URL = "http://localhost:8765/ping";

let lastResponse = Date.now();

async function pingRelay() {
  try {
    const res = await fetch(RELAY_URL);
    if (res.ok) lastResponse = Date.now();
  } catch (err) {
    // ignore fetch errors, we'll handle timeout separately
  }
}

function log(message) {
  const file = path.join(LOG_DIR, `watchdog_${new Date().toISOString().split("T")[0]}.log`);
  fs.appendFileSync(file, `[${new Date().toISOString()}] ${message}\n`);
}

function checkHealth() {
  const diff = Date.now() - lastResponse;
  if (diff > TIMEOUT_LIMIT) {
    log("⚠️ No response from relay. Triggering Safe Boot...");
    exec(`bash "${SAFE_BOOT}"`, (err) => {
      if (err) log("❌ Safe Boot failed: " + err.message);
      else log("✅ Safe Boot executed successfully.");
    });
    lastResponse = Date.now();
  }
}

setInterval(async () => {
  await pingRelay();
  checkHealth();
}, CHECK_INTERVAL);

log("🟢 Triad Watchdog started. Monitoring relay and Cline responsiveness.");
