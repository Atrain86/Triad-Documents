// Triad Workflow Engine – Phase III-F
// Coordinates multi-step workflows among Triad agents.

import fs from "fs";
import { sendMessage, onMessage } from "../cooperative/triad_message_bus.js";
import Ajv from "ajv";

const ajv = new Ajv();
const schema = JSON.parse(fs.readFileSync("workflow/workflow_schema.json", "utf8"));
const validate = ajv.compile(schema);

export function startWorkflow(definition) {
  if (!validate(definition)) {
    console.error("[WorkflowEngine] Invalid workflow definition:", validate.errors);
    return;
  }
  fs.appendFileSync("logs/workflow_trace.log",
    `${new Date().toISOString()} START ${definition.name}\n`);
  definition.steps.forEach((step, i) => {
    sendMessage(step.owner, "TriadDocs", "workflow_step_start", { step, index: i });
  });
}

onMessage((msg) => {
  if (msg.intent === "workflow_step_complete") {
    fs.appendFileSync("logs/workflow_trace.log",
      `${new Date().toISOString()} COMPLETE step ${msg.data.index}\n`);
  }
});
