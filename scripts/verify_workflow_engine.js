// Verification Script – Phase III-F
import { startWorkflow } from "../workflow/triad_workflow_engine.js";

const testWorkflow = {
  name: "Test_Workflow",
  steps: [
    { task: "pingServices", owner: "Cline" },
    { task: "reviewResults", owner: "GPT5", dependencies: ["pingServices"] },
    { task: "logCompletion", owner: "TriadDocs", dependencies: ["reviewResults"] }
  ]
};

startWorkflow(testWorkflow);
