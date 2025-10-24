import OpenAI from "openai";
import storage from "./storage";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simplified wrapper (removed Replit-specific .save())
export const trackedPrompt = async (prompt: string) => {
  console.log("Prompt:", prompt);
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });
  return completion.choices[0].message.content;
};

export default openai;
