import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';

const NETWORK_URL = 'http://localhost:8765/ping';
const DASHBOARD_URL = 'http://localhost:3000';
const LOG_DIR = '/Users/atrain/Documents/AI_LOCAL/triad_logs';
const TRIAD_SHARED_REPO = '/Users/atrain/Documents/AI_LOCAL/Triad-Shared';

async function validateNetworkConnectivity() {
  try {
    const networkResponse = await fetch(NETWORK_URL);
    const dashboardResponse = await fetch(DASHBOARD_URL);
    
    return {
      network: networkResponse.ok,
      dashboard: dashboardResponse.ok
    };
  } catch (error) {
    return {
      network: false,
      dashboard: false,
      error: error.message
    };
  }
}

function checkLogFiles() {
  const currentDate = new Date().toISOString().split('T')[0];
  const requiredLogPatterns = [
    `watchdog_${currentDate}.log`,
    `triad_phase_VE_autonomous_loop_init_${currentDate}.md`,
    `self_validation_${currentDate}.md`
  ];

  const existingLogs = fs.readdirSync(LOG_DIR)
    .filter(file => requiredLogPatterns.some(pattern => file.includes(pattern)));

  return {
    totalLogs: existingLogs.length,
    missingLogs: requiredLogPatterns.filter(
      pattern => !existingLogs.some(log => log.includes(pattern))
    )
  };
}

function executeGitCommands(reportPath) {
  return new Promise((resolve, reject) => {
    exec(`
      cd ${TRIAD_SHARED_REPO} && 
      git add ${reportPath} && 
      git commit -m "Self-Validation Report $(date +%Y-%m-%d)" && 
      git push origin main
    `, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

async function generateSelfValidationReport() {
  const currentDate = new Date().toISOString().split('T')[0];
  const reportPath = path.join(LOG_DIR, `self_validation_${currentDate}.md`);

  const connectivity = await validateNetworkConnectivity();
  const logStatus = checkLogFiles();

  const reportContent = `# Triad Self-Validation Report — ${currentDate}

## Network Connectivity
- Relay Server: ${connectivity.network ? '✅ Operational' : '❌ Offline'}
- Dashboard: ${connectivity.dashboard ? '✅ Operational' : '❌ Offline'}
${connectivity.error ? `- Error: ${connectivity.error}` : ''}

## Log File Validation
- Total Logs Found: ${logStatus.totalLogs}
- Missing Logs: ${logStatus.missingLogs.length > 0 ? logStatus.missingLogs.join(', ') : 'None'}

## Validation Result
${(connectivity.network && connectivity.dashboard && logStatus.missingLogs.length === 0) 
  ? '✅ All Systems Operational' 
  : '⚠️ Potential System Issues Detected'}

## Recommended Actions
${!connectivity.network ? '- Investigate Relay Server connectivity' : ''}
${!connectivity.dashboard ? '- Check Dashboard server status' : ''}
${logStatus.missingLogs.length > 0 ? `- Regenerate missing logs: ${logStatus.missingLogs.join(', ')}` : ''}

_Generated at: ${new Date().toISOString()}_`;

  fs.writeFileSync(reportPath, reportContent);
  return reportPath;
}

async function main() {
  try {
    const reportPath = await generateSelfValidationReport();
    await executeGitCommands(reportPath);
    console.log('Self-validation completed successfully');
  } catch (error) {
    console.error('Self-validation failed:', error);
  }
}

main();
