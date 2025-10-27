// verify_governance_integrity.js
// Verifies telemetry, ensuring no pending governance exceptions

import fs from 'fs';
import path from 'path';

// Constants
const GOVERNANCE_DIR = path.resolve('governance');
const LOGS_DIR = path.resolve('logs');
const WORKFLOW_LOG = path.join(LOGS_DIR, 'workflow_trace.log');
const CONTEXT_MAP_FILE = path.resolve('governance/logs/consolidation/context_map.json');

// Load the context map if it exists
let contextMap;
try {
  const contextMapData = fs.readFileSync(CONTEXT_MAP_FILE, 'utf8');
  contextMap = JSON.parse(contextMapData);
} catch (error) {
  console.error(`Warning: Could not load context map. Creating new structure.`);
  contextMap = {
    workflows: {
      active: [],
      completed: [],
      orphaned: []
    }
  };
}

function verifyGovernanceIntegrity() {
  const report = {
    timestamp: new Date().toISOString(),
    integrity_checks: {
      workflow_checks: {
        orphaned_workflows: [],
        incomplete_workflows: [],
        status: "PASS"
      },
      governance_checks: {
        incomplete_phases: [],
        missing_addenda: [],
        status: "PASS"
      }
    },
    exceptions: [],
    integrity_status: "PASS"
  };
  
  // Check for orphaned workflows
  if (contextMap.workflows && contextMap.workflows.orphaned) {
    report.integrity_checks.workflow_checks.orphaned_workflows = contextMap.workflows.orphaned;
    
    if (contextMap.workflows.orphaned.length > 0) {
      report.integrity_checks.workflow_checks.status = "FAIL";
      
      for (const workflow of contextMap.workflows.orphaned) {
        report.exceptions.push({
          type: "orphaned_workflow",
          workflow: workflow.name,
          details: `Workflow completed without a start event: ${workflow.completed_at}`
        });
      }
    }
  }
  
  // Check for incomplete workflows
  if (contextMap.workflows && contextMap.workflows.active) {
    report.integrity_checks.workflow_checks.incomplete_workflows = contextMap.workflows.active;
    
    // Check if any active workflow has been running for too long (30 minutes)
    const now = new Date();
    for (const workflow of contextMap.workflows.active) {
      const startTime = new Date(workflow.started_at);
      const runTime = (now - startTime) / 60000; // convert to minutes
      
      if (runTime > 30) {
        report.integrity_checks.workflow_checks.status = "FAIL";
        
        report.exceptions.push({
          type: "stalled_workflow",
          workflow: workflow.name,
          started_at: workflow.started_at,
          runtime_minutes: Math.round(runTime),
          details: `Workflow has been running for ${Math.round(runTime)} minutes without completing`
        });
      }
    }
  }
  
  // Check governance directory for incomplete phases or missing addenda
  const templates = new Map();
  const logs = new Map();
  const addenda = new Map();
  
  // Function to recursively scan directories
  function scanDir(dir, relativePath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);
      const entryRelativePath = path.join(relativePath, entry.name);
      
      if (entry.isDirectory()) {
        scanDir(entryPath, entryRelativePath);
      } else if (entry.isFile() && path.extname(entry.name) === '.md') {
        const content = fs.readFileSync(entryPath, 'utf8');
        
        // Determine which collection this belongs to based on its path
        if (entryRelativePath.startsWith('templates/')) {
          templates.set(entryRelativePath, { path: entryPath, content });
        } else if (entryRelativePath.startsWith('logs/')) {
          logs.set(entryRelativePath, { path: entryPath, content });
        } else if (entryRelativePath.startsWith('addenda/')) {
          addenda.set(entryRelativePath, { path: entryPath, content });
        }
      }
    }
  }
  
  // Scan governance directory
  if (fs.existsSync(GOVERNANCE_DIR)) {
    scanDir(GOVERNANCE_DIR);
    
    // Check for logs without matching addenda
    for (const [logPath, log] of logs) {
      // Look for addenda that reference this log
      let hasMatchingAddendum = false;
      const logBaseName = path.basename(logPath, '.md');
      
      for (const [, addendum] of addenda) {
        if (addendum.content.includes(logBaseName)) {
          hasMatchingAddendum = true;
          break;
        }
      }
      
      if (!hasMatchingAddendum && !logPath.includes('consolidation/')) {
        report.integrity_checks.governance_checks.missing_addenda.push(logPath);
        
        report.exceptions.push({
          type: "missing_addendum",
          log: logPath,
          details: "Log file does not have a corresponding addendum"
        });
        
        report.integrity_checks.governance_checks.status = "FAIL";
      }
    }
    
    // Check for phase identification in templates, logs and addenda
    const phaseRegex = /phase[-_\s]*(iii|3)[-_\s]*([a-h](?:\.5)?)/i;
    const phaseStatuses = new Map();
    
    // Check templates
    for (const [templatePath, template] of templates) {
      const phaseMatch = template.content.match(phaseRegex);
      if (phaseMatch) {
        const phase = `Phase-III-${phaseMatch[2].toUpperCase()}`;
        if (!phaseStatuses.has(phase)) {
          phaseStatuses.set(phase, { templates: [], logs: [], addenda: [] });
        }
        phaseStatuses.get(phase).templates.push(templatePath);
      }
    }
    
    // Check logs
    for (const [logPath, log] of logs) {
      const phaseMatch = log.content.match(phaseRegex);
      if (phaseMatch) {
        const phase = `Phase-III-${phaseMatch[2].toUpperCase()}`;
        if (!phaseStatuses.has(phase)) {
          phaseStatuses.set(phase, { templates: [], logs: [], addenda: [] });
        }
        phaseStatuses.get(phase).logs.push(logPath);
      }
    }
    
    // Check addenda
    for (const [addendumPath, addendum] of addenda) {
      const phaseMatch = addendum.content.match(phaseRegex);
      if (phaseMatch) {
        const phase = `Phase-III-${phaseMatch[2].toUpperCase()}`;
        if (!phaseStatuses.has(phase)) {
          phaseStatuses.set(phase, { templates: [], logs: [], addenda: [] });
        }
        phaseStatuses.get(phase).addenda.push(addendumPath);
      }
    }
    
    // Check for incomplete phases (phases with logs but no addenda)
    for (const [phase, artifacts] of phaseStatuses) {
      if (artifacts.logs.length > 0 && artifacts.addenda.length === 0) {
        report.integrity_checks.governance_checks.incomplete_phases.push(phase);
        
        report.exceptions.push({
          type: "incomplete_phase",
          phase,
          details: `Phase has ${artifacts.logs.length} logs but no addenda`
        });
        
        report.integrity_checks.governance_checks.status = "FAIL";
      }
    }
  }
  
  // If any check failed, mark overall integrity as failed
  if (report.integrity_checks.workflow_checks.status === "FAIL" || 
      report.integrity_checks.governance_checks.status === "FAIL") {
    report.integrity_status = "FAIL";
  }
  
  // Handle exceptions detected during governance verification
  if (report.exceptions.length > 0) {
    // Log exceptions
    console.error(`Governance exceptions detected: ${report.exceptions.length}`);
    for (const exception of report.exceptions) {
      console.error(`- ${exception.type}: ${exception.details}`);
    }
  } else {
    console.log("No governance exceptions detected");
  }
  
  return report;
}

// Generate integrity report
const integrityReport = verifyGovernanceIntegrity();
console.log(JSON.stringify(integrityReport, null, 2));
