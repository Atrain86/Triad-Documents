import fs from "fs";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const file = "./ai_bridge/ai_bridge.json";

async function loop() {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    const { summary, diagnostics } = data.from_cline;

    if (!summary && !diagnostics) {
      setTimeout(loop, 5000);
      return;
    }

    const res = await openai.chat.completions.create({
      model: "gpt-5",
      messages: [
        { role: "system", content: "You are GPT-5 reviewing Cline outputs and returning concise next-step instructions." },
        { role: "user", content: `Summary:\n${summary}\nDiagnostics:\n${diagnostics}` }
      ]
    });

    data.from_gpt.instructions = res.choices[0].message.content.trim();
    data.from_gpt.timestamp = new Date().toISOString();
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log("✅ Wrote new instructions to ai_bridge.json");
  } catch (err) {
    console.error("Bridge error:", err.message);
  }
  setTimeout(loop, 5000);
}

loop();
