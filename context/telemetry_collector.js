// Telemetry Collector with Context Hub Integration
import fs from "fs";
import path from "path";
import Ajv from "ajv";
import yaml from "js-yaml";
import cron from "node-cron";
import { updateContext, contextBus, getContext } from "./triad_context_hub.js";

// Load schema for validation
const schema = JSON.parse(
  fs.readFileSync(path.resolve("context/context_schema.json"), "utf8")
);
const ajv = new Ajv();
const validate = ajv.compile(schema);

// Service name for this instance
const SERVICE_NAME = "Triad-Documents";

// Collect and publish telemetry to Context Hub
export async function collectAndPublishTelemetry() {
  try {
    // Read the latest telemetry data
    const telemetryLog = path.resolve("logs/telemetry.log");
    const data = fs.existsSync(telemetryLog)
      ? fs.readFileSync(telemetryLog, "utf8")
          .split("\n")
          .filter(Boolean)
          .map(Number)
      : [];

    // Calculate metrics if we have enough data
    const metrics = data.length >= 10 ? calculateMetrics(data) : {};

    // Get system health status from logs
    const healthStatus = determineHealthStatus();

    // Prepare telemetry payload
    const telemetryData = {
      timestamp: new Date().toISOString(),
      metrics,
      status: healthStatus,
      alerts: getRecentAlerts()
    };

    // Publish to Context Hub
    updateContext(SERVICE_NAME, telemetryData);
    
    console.log(`[TelemetryCollector] Published telemetry to Context Hub for ${SERVICE_NAME}`);

    // Log event
    fs.appendFileSync(
      path.resolve("logs/context_events.log"),
      `${new Date().toISOString()} PUBLISH ${SERVICE_NAME}\n`
    );
  } catch (err) {
    console.error("[TelemetryCollector] Error publishing telemetry:", err.message);
  }
}

// Calculate performance metrics from telemetry data
function calculateMetrics(data) {
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const std = Math.sqrt(
    data.map(x => (x - avg) ** 2).reduce((a, b) => a + b, 0) / data.length
  );
  const last = data[data.length - 1];
  const z = (last - avg) / std;

  return {
    average: avg,
    standardDeviation: std,
    latest: last,
    zScore: z
  };
}

// Determine health status from adaptive events
function determineHealthStatus() {
  try {
    const eventsLog = path.resolve("logs/adaptive_events.log");
    if (!fs.existsSync(eventsLog)) return "unknown";

    const recentEvents = fs.readFileSync(eventsLog, "utf8")
      .split("\n")
      .filter(Boolean)
      .slice(-10);

    const hasCritical = recentEvents.some(line => line.includes("CRITICAL"));
    const hasWarning = recentEvents.some(line => line.includes("WARNING"));

    if (hasCritical) return "critical";
    if (hasWarning) return "warning";
    return "healthy";
  } catch (err) {
    console.error("[TelemetryCollector] Error determining health:", err.message);
    return "unknown";
  }
}

// Get recent alerts from adaptive events
function getRecentAlerts() {
  try {
    const eventsLog = path.resolve("logs/adaptive_events.log");
    if (!fs.existsSync(eventsLog)) return [];

    return fs.readFileSync(eventsLog, "utf8")
      .split("\n")
      .filter(Boolean)
      .slice(-5)
      .map(line => {
        const [timestamp, type, value] = line.split(" ");
        return { timestamp, type, value: parseFloat(value) };
      });
  } catch (err) {
    console.error("[TelemetryCollector] Error getting alerts:", err.message);
    return [];
  }
}

// Subscribe to context updates from other services
export function subscribeToContextUpdates() {
  contextBus.on("contextUpdated", (context) => {
    // Validate against schema
    const valid = validate(context);
    if (!valid) {
      console.error("[TelemetryCollector] Invalid context data:", validate.errors);
      return;
    }

    console.log("[TelemetryCollector] Received context update");
    
    // Log the update to context_sync.log
    const serviceNames = Object.keys(context.services).filter(name => name !== SERVICE_NAME);
    if (serviceNames.length > 0) {
      fs.appendFileSync(
        path.resolve("logs/context_sync.log"),
        `${new Date().toISOString()} SYNC_FROM ${serviceNames.join(",")}\n`
      );
    }
  });

  console.log("[TelemetryCollector] Subscribed to context updates");
}

// Create a context snapshot
export function createContextSnapshot() {
  const context = getContext();
  const snapshotDir = path.resolve("context/snapshots");
  
  // Create snapshots directory if it doesn't exist
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  // Create snapshot with timestamp filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const snapshotPath = path.join(snapshotDir, `context-${timestamp}.json`);
  
  fs.writeFileSync(snapshotPath, JSON.stringify(context, null, 2));
  console.log(`[TelemetryCollector] Created context snapshot: ${snapshotPath}`);

  // Clean up old snapshots based on retention policy
  cleanupOldSnapshots();
}

// Clean up old snapshots based on retention policy in context_sync.yaml
function cleanupOldSnapshots() {
  try {
    // Load sync configuration
    const syncConfig = yaml.load(
      fs.readFileSync(path.resolve("context/context_sync.yaml"), "utf8")
    );
    
    const retentionHours = syncConfig.retention_hours || 24;
    const snapshotDir = path.resolve("context/snapshots");
    
    if (!fs.existsSync(snapshotDir)) return;
    
    const files = fs.readdirSync(snapshotDir);
    const now = new Date();
    
    files.forEach(file => {
      const filePath = path.join(snapshotDir, file);
      const stats = fs.statSync(filePath);
      const fileAge = (now - stats.mtime) / (1000 * 60 * 60); // Age in hours
      
      if (fileAge > retentionHours) {
        fs.unlinkSync(filePath);
        console.log(`[TelemetryCollector] Deleted old snapshot: ${filePath}`);
      }
    });
  } catch (err) {
    console.error("[TelemetryCollector] Error cleaning up snapshots:", err.message);
  }
}

// Initialize collector with scheduled jobs
export function initializeCollector() {
  // Create snapshots directory
  const snapshotDir = path.resolve("context/snapshots");
  if (!fs.existsSync(snapshotDir)) {
    fs.mkdirSync(snapshotDir, { recursive: true });
  }

  // Load sync configuration
  const syncConfig = yaml.load(
    fs.readFileSync(path.resolve("context/context_sync.yaml"), "utf8")
  );

  // Schedule telemetry collection (every minute)
  cron.schedule("* * * * *", collectAndPublishTelemetry);
  
  // Schedule context snapshots (based on config)
  const snapshotInterval = syncConfig.interval_minutes || 5;
  cron.schedule(`*/${snapshotInterval} * * * *`, createContextSnapshot);

  // Subscribe to context updates from other services
  subscribeToContextUpdates();
  
  console.log(`[TelemetryCollector] Initialized with ${snapshotInterval} minute snapshot interval`);
}

// Auto-initialize if this module is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  initializeCollector();
}
