// Triad Phase III-B Prototype – ML-Based Anomaly Analyzer
import fs from "fs";
import yaml from "js-yaml";
import path from "path";

const configPath = path.resolve("phase3b_prototype/adaptive_config.yaml");
const telemetryLog = path.resolve("logs/telemetry.log");

export async function analyzeTelemetry() {
  const config = yaml.load(fs.readFileSync(configPath, "utf8"));
  const data = fs.readFileSync(telemetryLog, "utf8")
    .split("\n")
    .filter(Boolean)
    .map(Number);

  if (data.length < 10) return;
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const std = Math.sqrt(data.map(x => (x - avg) ** 2).reduce((a, b) => a + b, 0) / data.length);
  const last = data[data.length - 1];
  const z = (last - avg) / std;

  if (Math.abs(z) > config.thresholds.zScoreCritical) {
    console.log(`[ALERT] Critical deviation detected (z=${z.toFixed(2)})`);
    fs.appendFileSync("logs/adaptive_events.log", `${new Date().toISOString()} CRITICAL ${z}\n`);
  } else if (Math.abs(z) > config.thresholds.zScoreWarning) {
    console.log(`[WARN] Performance anomaly (z=${z.toFixed(2)})`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) analyzeTelemetry();
