// build_context_map.js
// Reads index and workflow logs to rebuild relationships between templates, logs, and addenda

import fs from 'fs';
import path from 'path';

// Constants
const GOVERNANCE_DIR = path.resolve('governance');
const LOGS_DIR = path.resolve('logs');
const INDEX_FILE = path.resolve('governance/index/phase_asset_index.json');

// Load the governance asset index if it exists, or create an empty structure
let governanceIndex;
try {
  const indexData = fs.readFileSync(INDEX_FILE, 'utf8');
  governanceIndex = JSON.parse(indexData);
} catch (error) {
  // If file doesn't exist, create a default structure
  console.error(`Warning: Could not load index file. Will create default structure.`);
  governanceIndex = {
    generated: new Date().toISOString(),
    totalAssets: 0,
    phases: [],
    index: {}
  };
}

// Structure to hold relationships between governance artifacts
function buildContextMap() {
  const contextMap = {
    generated: new Date().toISOString(),
    relationships: {
      phase_relationships: {},  // How phases connect to each other
      template_log_relationships: {},  // How templates lead to logs
      log_addenda_relationships: {}  // How logs lead to addenda
    },
    workflows: {
      active: [],
      completed: [],
      orphaned: []
    },
    checkpoints: {}  // Checkpoint status by phase
  };
  
  // Process the governance index to build relationships
  if (governanceIndex && governanceIndex.index) {
    const phaseIndex = governanceIndex.index;
    const phases = Object.keys(phaseIndex).sort();
    
    // Build phase relationships (which phases feed into others)
    for (let i = 0; i < phases.length - 1; i++) {
      const currentPhase = phases[i];
      const nextPhase = phases[i + 1];
      
      if (!contextMap.relationships.phase_relationships[currentPhase]) {
        contextMap.relationships.phase_relationships[currentPhase] = {
          leads_to: [],
          dependencies: []
        };
      }
      
      if (!contextMap.relationships.phase_relationships[nextPhase]) {
        contextMap.relationships.phase_relationships[nextPhase] = {
          leads_to: [],
          dependencies: []
        };
      }
      
      // Current phase leads to next phase
      contextMap.relationships.phase_relationships[currentPhase].leads_to.push(nextPhase);
      
      // Next phase depends on current phase
      contextMap.relationships.phase_relationships[nextPhase].dependencies.push(currentPhase);
    }
    
    // Process each phase
    for (const phase of phases) {
      const phaseData = phaseIndex[phase];
      
      // Initialize checkpoint status for this phase
      contextMap.checkpoints[phase] = {
        concept_alignment: false,
        architecture_alignment: false,
        pre_toggle_alignment: false,
        implementation_complete: false
      };
      
      // Connect templates to logs
      for (const template of phaseData.templates || []) {
        const templateName = path.basename(template.relativePath, '.md');
        
        // Look for logs that might reference this template
        for (const log of phaseData.logs || []) {
          const logContent = fs.readFileSync(path.join(GOVERNANCE_DIR, log.relativePath), 'utf8');
          
          // If log references the template
          if (logContent.includes(templateName) || 
              logContent.toLowerCase().includes(template.phase.toLowerCase())) {
            
            // Create template entry if it doesn't exist
            if (!contextMap.relationships.template_log_relationships[template.relativePath]) {
              contextMap.relationships.template_log_relationships[template.relativePath] = {
                generates: []
              };
            }
            
            // Add the log to the template's generates list
            contextMap.relationships.template_log_relationships[template.relativePath].generates.push(log.relativePath);
            
            // Update checkpoint status based on log content
            if (logContent.includes('Concept Alignment') && logContent.includes('completed')) {
              contextMap.checkpoints[phase].concept_alignment = true;
            }
            if (logContent.includes('Architecture Alignment') && logContent.includes('completed')) {
              contextMap.checkpoints[phase].architecture_alignment = true;
            }
            if (logContent.includes('Pre-Toggle Alignment') && logContent.includes('completed')) {
              contextMap.checkpoints[phase].pre_toggle_alignment = true;
            }
          }
        }
      }
      
      // Connect logs to addenda
      for (const log of phaseData.logs || []) {
        const logName = path.basename(log.relativePath, '.md');
        
        // Look for addenda that might reference this log
        for (const addendum of phaseData.addenda || []) {
          const addendumContent = fs.readFileSync(path.join(GOVERNANCE_DIR, addendum.relativePath), 'utf8');
          
          // If addendum references the log
          if (addendumContent.includes(logName) || 
              addendumContent.toLowerCase().includes(log.phase.toLowerCase())) {
            
            // Create log entry if it doesn't exist
            if (!contextMap.relationships.log_addenda_relationships[log.relativePath]) {
              contextMap.relationships.log_addenda_relationships[log.relativePath] = {
                closes: []
              };
            }
            
            // Add the addendum to the log's closes list
            contextMap.relationships.log_addenda_relationships[log.relativePath].closes.push(addendum.relativePath);
            
            // If addendum indicates completion
            if (addendumContent.includes('Closed') || addendumContent.includes('✅')) {
              contextMap.checkpoints[phase].implementation_complete = true;
            }
          }
        }
      }
    }
  }
  
  // Analyze workflow logs for active, completed and orphaned workflows
  try {
    const workflowLogFile = path.join(LOGS_DIR, 'workflow_trace.log');
    if (fs.existsSync(workflowLogFile)) {
      const workflowLog = fs.readFileSync(workflowLogFile, 'utf8');
      const lines = workflowLog.split('\n').filter(line => line.trim() !== '');
      
      const workflows = {};
      
      // Parse workflow log entries
      lines.forEach(line => {
        const parts = line.split(' ');
        if (parts.length < 3) return;
        
        const timestamp = parts[0];
        const status = parts[1];
        const workflowName = parts.slice(2).join(' ');
        
        if (!workflows[workflowName]) {
          workflows[workflowName] = { start: null, complete: null };
        }
        
        if (status === 'START') {
          workflows[workflowName].start = timestamp;
        } else if (status === 'COMPLETE') {
          workflows[workflowName].complete = timestamp;
        }
      });
      
      // Categorize workflows
      for (const [name, status] of Object.entries(workflows)) {
        if (status.start && status.complete) {
          contextMap.workflows.completed.push({
            name,
            started_at: status.start,
            completed_at: status.complete
          });
        } else if (status.start) {
          contextMap.workflows.active.push({
            name,
            started_at: status.start
          });
        } else if (status.complete) {
          contextMap.workflows.orphaned.push({
            name,
            completed_at: status.complete
          });
        }
      }
    }
  } catch (error) {
    console.error(`Warning: Error processing workflow logs: ${error.message}`);
  }
  
  return contextMap;
}

// Build and output the context map
const contextMap = buildContextMap();
console.log(JSON.stringify(contextMap, null, 2));
