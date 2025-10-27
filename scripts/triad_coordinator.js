// Triad Phase III Coordinator
import fs from "fs";
import path from "path";
import axios from "axios";
import jwt from "jsonwebtoken";
import { analyzeTelemetry } from "../phase3b_prototype/phase3b_analyzer.js";
import { recordFeedback } from "../phase3b_prototype/triad_feedback_loop.js";
import cron from "node-cron";

const CONFIG = {
  services: [
    { 
      name: "PaintBrain7", 
      url: "https://paint-track-pro.onrender.com",
      healthEndpoint: "/api/ping",
      status: "unknown",
      history: []
    },
    { 
      name: "IDEA-HUB", 
      url: "https://idea-hub-service.onrender.com",
      healthEndpoint: "/api/ping",
      status: "unknown", 
      history: []
    },
    { 
      name: "Triad-Documents", 
      url: "https://triad-documents.onrender.com",
      healthEndpoint: "/api/ping", 
      status: "unknown",
      history: []
    }
  ],
  thresholds: {
    warningResponseTime: 2000,  // ms
    criticalResponseTime: 5000, // ms
    warningFailureCount: 2,
    criticalFailureCount: 3
  }
};

// Health check function for services
async function checkServiceHealth(service) {
  try {
    const startTime = Date.now();
    const response = await axios.get(`${service.url}${service.healthEndpoint}`, { 
      timeout: 10000,
      headers: { 
        'Authorization': `Bearer ${generateJWT(service.name)}`
      }
    });
    
    const responseTime = Date.now() - startTime;
    const checkResult = {
      timestamp: new Date().toISOString(),
      responseTime,
      statusCode: response.status,
      status: response.status === 200 ? 'healthy' : 'degraded'
    };
    
    // Add to telemetry log
    fs.appendFileSync(path.resolve("logs/telemetry.log"), `${responseTime}\n`);
    
    // Add to service history
    service.history.push(checkResult);
    // Keep only last 10 entries
    if (service.history.length > 10) {
      service.history.shift();
    }
    
    console.log(`[${service.name}] Health check: ${checkResult.status} (${responseTime}ms)`);
    return checkResult;
  } catch (error) {
    const checkResult = {
      timestamp: new Date().toISOString(),
      status: 'error',
      error: error.message
    };
    
    // Add to service history
    service.history.push(checkResult);
    // Keep only last 10 entries
    if (service.history.length > 10) {
      service.history.shift();
    }
    
    console.error(`[${service.name}] Health check failed: ${error.message}`);
    return checkResult;
  }
}

// Update service status based on health check history
function updateServiceStatus(service) {
  const recentHistory = service.history.slice(-CONFIG.thresholds.criticalFailureCount);
  
  if (recentHistory.length < CONFIG.thresholds.warningFailureCount) {
    service.status = "unknown";
    return;
  }
  
  const errorCount = recentHistory.filter(check => check.status === 'error').length;
  const slowCount = recentHistory.filter(
    check => check.responseTime && check.responseTime > CONFIG.thresholds.warningResponseTime
  ).length;
  
  if (errorCount >= CONFIG.thresholds.criticalFailureCount) {
    service.status = "critical";
  } else if (errorCount >= CONFIG.thresholds.warningFailureCount || 
            slowCount >= CONFIG.thresholds.warningFailureCount) {
    service.status = "warning";
  } else {
    service.status = "healthy";
  }
  
  console.log(`[${service.name}] Status updated to: ${service.status}`);
}

// Generate JWT for service-to-service authentication
function generateJWT(serviceName) {
  const payload = {
    service: serviceName,
    role: "system",
    iat: Math.floor(Date.now() / 1000)
  };
  
  return jwt.sign(payload, process.env.TRIAD_JWT_SECRET || 'dev_secret_key', { 
    expiresIn: '1h' 
  });
}

// Restart a service that's in critical status
async function restartService(service) {
  console.log(`[${service.name}] Initiating service restart...`);
  
  try {
    // In a real implementation, this would call Render API or other deployment platform
    // For simulation, we'll just log the attempt and update logs
    
    console.log(`[${service.name}] Restart initiated, waiting for recovery...`);
    
    // Log the restart event
    fs.appendFileSync(
      path.resolve("logs/coordinator.log"),
      `${new Date().toISOString()} RESTART ${service.name}\n`
    );
    
    // Record successful feedback
    recordFeedback("success");
    
    // Return the service to unknown status to trigger fresh health checks
    service.status = "unknown";
    
  } catch (error) {
    console.error(`[${service.name}] Restart failed: ${error.message}`);
    
    // Record failure feedback
    recordFeedback("failure");
    
    // Log the failure
    fs.appendFileSync(
      path.resolve("logs/coordinator.log"),
      `${new Date().toISOString()} RESTART_FAILED ${service.name} ${error.message}\n`
    );
  }
}

// Monitor services and take action if needed
async function monitorServices() {
  for (const service of CONFIG.services) {
    await checkServiceHealth(service);
    updateServiceStatus(service);
    
    if (service.status === "critical") {
      await restartService(service);
    }
  }
}

// Export for other modules
export function getServices() {
  return CONFIG.services;
}

// Export for other modules
export { updateServiceStatus };

// Run the service monitoring periodically
async function startCoordinator() {
  console.log(`[Coordinator] Starting Triad service coordinator...`);
  
  // Ensure log directories exist
  fs.mkdirSync(path.resolve("logs"), { recursive: true });
  
  // Schedule the analyzer to run every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    try {
      console.log("[Adaptive] Running periodic telemetry analysis...");
      await analyzeTelemetry();
    } catch (err) {
      console.error("[Adaptive] Analyzer error:", err.message);
    }
  });
  
  // Initial run
  await monitorServices();
  
  // Schedule regular monitoring
  setInterval(monitorServices, 60000); // Every minute
}

// Start if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startCoordinator();
}
