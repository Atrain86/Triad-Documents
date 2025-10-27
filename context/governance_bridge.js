// Governance Bridge – Phase III-D
// Subscribes to context and policy events to maintain unified governance state

import { contextBus, globalContext } from "./triad_context_hub.js";
import fs from "fs";

contextBus.on("contextUpdated", (ctx) => {
  if (ctx.services.governancePolicy) {
    globalContext.governance.activePolicy = ctx.services.governancePolicy;
    fs.writeFileSync("logs/governance_sync.log",
      `${new Date().toISOString()} Governance updated\n`, { flag: "a" });
    console.log("[GovernanceBridge] Governance context updated.");
  }
});
