import fetch from "node-fetch";
import fs from "fs";

const endpoints = {
  "Triad-Documents": "https://triad-documents.onrender.com/api/ping",
  "PaintBrain7": "https://paintbrain7.onrender.com/api/ping",
  "IDEA-HUB": "https://idea-hub.onrender.com/api/ping"
};

const logFile = "./triad_network_report.md";

async function checkEndpoint(name, url) {
  const start = Date.now();
  try {
    const res = await fetch(url);
    const text = await res.text();
    const duration = Date.now() - start;
    fs.appendFileSync(
      logFile,
      `✅ ${name} responded in ${duration}ms:\n${text}\n\n`
    );
  } catch (err) {
    fs.appendFileSync(
      logFile,
      `❌ ${name} failed (${err.message})\n\n`
    );
  }
}

async function main() {
  fs.writeFileSync(logFile, `# Triad Network Validation Report\n\n`);
  for (const [name, url] of Object.entries(endpoints)) {
    await checkEndpoint(name, url);
  }
  console.log("Network validation complete. Results saved to triad_network_report.md");
}

main();
