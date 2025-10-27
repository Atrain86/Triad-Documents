// Governance Watcher – Phase III-D
// Watches governance policies and emits updates to the Context Hub

import fs from "fs";
import path from "path";
import { updateContext } from "../context/triad_context_hub.js";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const schema = JSON.parse(fs.readFileSync(path.resolve("governance/policy_schema.json"), "utf8"));
const validate = ajv.compile(schema);
const policyFile = path.resolve("governance/TRIAD_CONTEXT_POLICY.md");

export function watchGovernance() {
  fs.watchFile(policyFile, { interval: 5000 }, () => {
    try {
      const raw = fs.readFileSync(policyFile, "utf8");
      const policyObj = { content: raw, updated: new Date().toISOString() };
      if (validate(policyObj)) {
        updateContext("governancePolicy", policyObj);
        console.log("[GovernanceWatcher] Policy change detected and broadcast.");
      } else {
        console.error("[GovernanceWatcher] Invalid policy format:", validate.errors);
      }
    } catch (err) {
      console.error("[GovernanceWatcher] Error reading policy:", err);
    }
  });
}
