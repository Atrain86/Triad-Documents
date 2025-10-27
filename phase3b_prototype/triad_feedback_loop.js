// Triad Phase III-B Prototype – Feedback Loop Engine
import fs from "fs";
import yaml from "js-yaml";
import path from "path";

const configPath = path.resolve("phase3b_prototype/adaptive_config.yaml");

export function recordFeedback(result) {
  const config = yaml.load(fs.readFileSync(configPath, "utf8"));
  const feedback = {
    timestamp: new Date().toISOString(),
    result,
  };

  const logFile = path.resolve("logs/feedback.log");
  fs.appendFileSync(logFile, JSON.stringify(feedback) + "\n");

  // Adjust thresholds slightly based on success rate
  if (result === "success") config.thresholds.zScoreWarning += 0.05;
  if (result === "failure") config.thresholds.zScoreWarning -= 0.05;

  fs.writeFileSync(configPath, yaml.dump(config));
  console.log(`[FeedbackLoop] Updated thresholds:`, config.thresholds);
}
