// Verification Script – Phase III-E
import { sendMessage, onMessage } from "../cooperative/triad_message_bus.js";

onMessage((msg) => {
  console.log("[Verify] Received:", msg);
});

sendMessage("Cline", "GPT5", "status_update", { cpu: 42 });
