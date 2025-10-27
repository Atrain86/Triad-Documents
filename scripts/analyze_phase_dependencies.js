// analyze_phase_dependencies.js
// Maps how each phase's outputs feed the next; highlights required checkpoints for Phase III-H

import fs from 'fs';
import path from 'path';

// Constants
const GOVERNANCE_DIR = path.resolve('governance');
const LOGS_DIR = path.resolve('logs');
const INDEX_FILE = path.resolve('governance/index/phase_asset_index.json');
const CONTEXT_MAP_FILE = path.resolve('governance/logs/consolidation/context_map.json');

// Load the governance asset index
let governanceIndex;
try {
  const indexData = fs.readFileSync(INDEX_FILE, 'utf8');
  governanceIndex = JSON.parse(indexData);
} catch (error) {
  console.error(`Warning: Could not load index file. Will analyze based on existing files.`);
  governanceIndex = { index: {} };
}

// Load the context map if it exists
let contextMap;
try {
  const contextMapData = fs.readFileSync(CONTEXT_MAP_FILE, 'utf8');
  contextMap = JSON.parse(contextMapData);
} catch (error) {
  console.error(`Warning: Could not load context map. Will proceed without context relationships.`);
  contextMap = { relationships: { phase_relationships: {} } };
}

function analyzePhaseDependencies() {
  const dependencyGraph = {
    generated: new Date().toISOString(),
    phases: {},
    critical_paths: {},
    checkpoints: {},
    next_phase: {
      id: "Phase-III-H",
      name: "Distributed Reasoning Layer",
      dependencies: [],
      required_checkpoints: [],
      readiness: 0
    }
  };
  
  // Analyze governance files to build dependency graph
  const governanceFiles = [];
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const itemPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        scanDirectory(itemPath);
      } else if (item.isFile() && path.extname(itemPath) === '.md') {
        governanceFiles.push({
          path: itemPath,
          content: fs.readFileSync(itemPath, 'utf8'),
          relativePath: path.relative(GOVERNANCE_DIR, itemPath)
        });
      }
    }
  }
  
  // Scan the governance directory if we don't have an index
  if (!governanceIndex.totalAssets || governanceIndex.totalAssets === 0) {
    if (fs.existsSync(GOVERNANCE_DIR)) {
      scanDirectory(GOVERNANCE_DIR);
    }
  }
  
  // Define the phases we're interested in
  const phaseDefinitions = [
    { id: "Phase-I", name: "Governance Layer" },
    { id: "Phase-II", name: "API Governance Integration" },
    { id: "Phase-III-B", name: "Adaptive Remediation Layer" },
    { id: "Phase-III-C", name: "Context Synchronization Layer" },
    { id: "Phase-III-D", name: "Governance-Aware Synchronization" },
    { id: "Phase-III-E", name: "Co-operative Intelligence Layer" },
    { id: "Phase-III-F", name: "Emergent Workflow Orchestration" },
    { id: "Phase-III-G", name: "Emergent Learning & Optimization" },
    { id: "Phase-III-G.5", name: "Alignment Template Integration" },
    { id: "Phase-III-H", name: "Distributed Reasoning Layer" }
  ];
  
  // Initialize phases in dependency graph
  phaseDefinitions.forEach(phase => {
    dependencyGraph.phases[phase.id] = {
      name: phase.name,
      artifacts: {
        templates: [],
        logs: [],
        addenda: []
      },
      dependencies: [],
      dependents: [],
      completion_status: null
    };
  });
  
  // If we have a populated index, use it to build the dependency graph
  if (governanceIndex.index) {
    for (const [phaseId, phaseData] of Object.entries(governanceIndex.index)) {
      if (!dependencyGraph.phases[phaseId]) continue;
      
      // Add artifacts to the phase
      if (phaseData.templates) {
        phaseData.templates.forEach(template => {
          dependencyGraph.phases[phaseId].artifacts.templates.push(template.relativePath);
        });
      }
      
      if (phaseData.logs) {
        phaseData.logs.forEach(log => {
          dependencyGraph.phases[phaseId].artifacts.logs.push(log.relativePath);
        });
      }
      
      if (phaseData.addenda) {
        phaseData.addenda.forEach(addendum => {
          dependencyGraph.phases[phaseId].artifacts.addenda.push(addendum.relativePath);
        });
      }
      
      // Check completion status
      if (phaseData.addenda && phaseData.addenda.length > 0) {
        // Get the latest addendum
        const latestAddendum = phaseData.addenda.sort((a, b) => 
          new Date(b.modified) - new Date(a.modified))[0];
        
        try {
          const content = fs.readFileSync(path.join(GOVERNANCE_DIR, latestAddendum.relativePath), 'utf8');
          if (content.includes('Closed') || content.includes('✅')) {
            dependencyGraph.phases[phaseId].completion_status = 'completed';
          } else if (content.includes('Active') || content.includes('In Progress')) {
            dependencyGraph.phases[phaseId].completion_status = 'in_progress';
          }
        } catch (error) {
          // If we can't read the addendum, mark as unknown
          dependencyGraph.phases[phaseId].completion_status = 'unknown';
        }
      } else {
        // No addenda, check if there are logs
        if (phaseData.logs && phaseData.logs.length > 0) {
          dependencyGraph.phases[phaseId].completion_status = 'in_progress';
        } else {
          dependencyGraph.phases[phaseId].completion_status = 'not_started';
        }
      }
    }
  }
  
  // Use context map to establish dependencies if available
  if (contextMap && contextMap.relationships && contextMap.relationships.phase_relationships) {
    for (const [phaseId, relationships] of Object.entries(contextMap.relationships.phase_relationships)) {
      if (!dependencyGraph.phases[phaseId]) continue;
      
      // Add dependencies
      if (relationships.dependencies) {
        dependencyGraph.phases[phaseId].dependencies = relationships.dependencies;
      }
      
      // Add dependents
      if (relationships.leads_to) {
        dependencyGraph.phases[phaseId].dependents = relationships.leads_to;
      }
    }
  }
  
  // Otherwise, establish dependencies based on phase ordering
  if (!Object.keys(contextMap.relationships.phase_relationships).length) {
    for (let i = 0; i < phaseDefinitions.length - 1; i++) {
      const currentPhase = phaseDefinitions[i];
      const nextPhase = phaseDefinitions[i + 1];
      
      // Current phase leads to next phase
      dependencyGraph.phases[currentPhase.id].dependents.push(nextPhase.id);
      
      // Next phase depends on current phase
      dependencyGraph.phases[nextPhase.id].dependencies.push(currentPhase.id);
    }
  }
  
  // Analyze critical paths for each phase
  for (const phaseId of Object.keys(dependencyGraph.phases)) {
    dependencyGraph.critical_paths[phaseId] = [];
    
    // A phase is critical if it's a direct dependency of the next phase
    // or if it's a dependency of a critical phase
    function findCriticalPaths(currentPhaseId, path = []) {
      const newPath = [...path, currentPhaseId];
      
      // If we've reached the target phase, this is a critical path
      if (currentPhaseId === phaseId) {
        dependencyGraph.critical_paths[phaseId].push(newPath);
        return;
      }
      
      // Explore dependencies
      const phase = dependencyGraph.phases[currentPhaseId];
      if (phase && phase.dependents) {
        for (const dependent of phase.dependents) {
          // Avoid cycles
          if (!path.includes(dependent)) {
            findCriticalPaths(dependent, newPath);
          }
        }
      }
    }
    
    // Find all critical paths starting from each phase
    for (const startPhaseId of Object.keys(dependencyGraph.phases)) {
      // Skip phases that come after the current one
      const startIdx = phaseDefinitions.findIndex(p => p.id === startPhaseId);
      const currentIdx = phaseDefinitions.findIndex(p => p.id === phaseId);
      
      if (startIdx <= currentIdx) {
        findCriticalPaths(startPhaseId);
      }
    }
  }
  
  // Establish checkpoint requirements for Phase III-H
  dependencyGraph.checkpoints = contextMap.checkpoints || {};
  
  // Define requirements for Phase III-H
  const phaseIIIH = "Phase-III-H";
  dependencyGraph.next_phase.dependencies = dependencyGraph.phases[phaseIIIH].dependencies;
  
  // Required checkpoints for Phase III-H
  const requiredCheckpoints = [
    { phase: "Phase-III-G.5", checkpoint: "implementation_complete", status: false },
    { phase: "Phase-III-G", checkpoint: "implementation_complete", status: false },
    { phase: "Phase-III-F", checkpoint: "implementation_complete", status: false }
  ];
  
  // Check if required checkpoints are met
  for (const requirement of requiredCheckpoints) {
    const { phase, checkpoint } = requirement;
    if (dependencyGraph.checkpoints[phase] && dependencyGraph.checkpoints[phase][checkpoint]) {
      requirement.status = true;
    }
    
    dependencyGraph.next_phase.required_checkpoints.push(requirement);
  }
  
  // Calculate readiness percentage
  const completedCheckpoints = dependencyGraph.next_phase.required_checkpoints.filter(r => r.status).length;
  const totalCheckpoints = dependencyGraph.next_phase.required_checkpoints.length;
  dependencyGraph.next_phase.readiness = Math.round((completedCheckpoints / totalCheckpoints) * 100);
  
  return dependencyGraph;
}

// Generate the dependency graph and output it
const dependencyGraph = analyzePhaseDependencies();
console.log(JSON.stringify(dependencyGraph, null, 2));
