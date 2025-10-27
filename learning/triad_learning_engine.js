// Triad Learning Engine – Phase III-G
// Analyzes workflow & telemetry logs to suggest optimizations.

import fs from "fs";
import path from "path";
import Ajv from "ajv";
import yaml from "js-yaml";

const ajv = new Ajv();
const schema = JSON.parse(fs.readFileSync("learning/learning_schema.json","utf8"));
const validate = ajv.compile(schema);
const rules = yaml.load(fs.readFileSync("learning/optimization_rules.yaml","utf8"));

export function analyzeLogs() {
  const workflowLog = fs.readFileSync(path.resolve("logs/workflow_trace.log"),"utf8").split("\n");
  const suggestions = [];
  const durations = {};

  workflowLog.forEach(line => {
    const match = line.match(/START|COMPLETE/);
    if (!match) return;
    const parts = line.split(" ");
    const status = parts[1];
    const name = parts.slice(2).join(" ");
    if (!durations[name]) durations[name] = { start:null, end:null };
    if (status === "START") durations[name].start = new Date(parts[0]);
    if (status === "COMPLETE") durations[name].end = new Date(parts[0]);
  });

  for (const [name, t] of Object.entries(durations)) {
    if (t.start && t.end) {
      const ms = t.end - t.start;
      const mins = ms / 60000;
      if (mins > rules.duration_threshold) {
        suggestions.push({ workflow:name, duration:mins, suggestion:"Reduce interval" });
      }
    }
  }

  const report = { timestamp:new Date().toISOString(), suggestions };
  if (validate(report)) {
    fs.writeFileSync("logs/learning_report.json", JSON.stringify(report,null,2));
    console.log("[LearningEngine] Report generated.");
  } else {
    console.error("[LearningEngine] Invalid report format:", validate.errors);
  }
}
