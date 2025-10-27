// Workflow Governance Bridge – Phase III-F
// Connects the Workflow Engine to Governance rules for policy enforcement

import { getContext } from "../context/triad_context_hub.js";
import { onMessage, sendMessage } from "../cooperative/triad_message_bus.js";
import fs from "fs";
import path from "path";
import yaml from "js-yaml";

// Load workflow registry and policies
const workflowRegistry = yaml.load(
  fs.readFileSync(path.resolve("workflow/workflow_registry.yaml"), "utf8")
);

// Set up workflow trace logging
const logFile = path.resolve("logs/workflow_trace.log");
if (!fs.existsSync(path.dirname(logFile))) {
  fs.mkdirSync(path.dirname(logFile), { recursive: true });
}

// Initialize trace log if it doesn't exist
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, `${new Date().toISOString()} INIT Workflow Governance Bridge\n`);
}

// Policy validation function for workflows
function validateWorkflow(workflowName, initiator) {
  // Check workflow exists in registry
  const registeredWorkflow = workflowRegistry.templates.find(t => t.name === workflowName);
  if (!registeredWorkflow) {
    console.error(`[WorkflowGovernance] Unknown workflow: ${workflowName}`);
    return false;
  }
  
  // Get current governance state from Context Hub
  const context = getContext();
  if (!context.governance || !context.governance.activePolicy) {
    console.error("[WorkflowGovernance] No active governance policy found");
    return false;
  }
  
  // Log the validation
  fs.appendFileSync(logFile, 
    `${new Date().toISOString()} VALIDATE ${initiator} requested workflow ${workflowName}\n`);
  
  return true;
}

// Listen for workflow initiation requests
onMessage((msg) => {
  if (msg.intent === "initiate_workflow") {
    const { workflow, initiator } = msg.data;
    
    // Validate workflow against governance
    const isValid = validateWorkflow(workflow, initiator);
    
    if (isValid) {
      console.log(`[WorkflowGovernance] Workflow ${workflow} approved for ${initiator}`);
      
      // Notify initiator of approval
      sendMessage("TriadDocs", initiator, "workflow_approved", { 
        workflow,
        timestamp: new Date().toISOString()
      });
      
      // Log the approval
      fs.appendFileSync(logFile, 
        `${new Date().toISOString()} APPROVED ${workflow} for ${initiator}\n`);
    } else {
      console.error(`[WorkflowGovernance] Workflow ${workflow} denied for ${initiator}`);
      
      // Notify initiator of denial
      sendMessage("TriadDocs", initiator, "workflow_denied", {
        workflow,
        reason: "Failed governance validation",
        timestamp: new Date().toISOString()
      });
      
      // Log the denial
      fs.appendFileSync(logFile, 
        `${new Date().toISOString()} DENIED ${workflow} for ${initiator}\n`);
    }
  }
});

console.log("[WorkflowGovernance] Workflow Engine integrated with Governance controls");
