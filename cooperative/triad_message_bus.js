// Triad Message Bus – Phase III-E
// Provides publish/subscribe messaging between agents under governance control.

import { EventEmitter } from "events";
export const messageBus = new EventEmitter();

export function sendMessage(from, to, intent, data) {
  const msg = { from, to, intent, data, timestamp: new Date().toISOString() };
  messageBus.emit("message", msg);
  console.log(`[MessageBus] ${from} → ${to}: ${intent}`);
}

export function onMessage(handler) {
  messageBus.on("message", handler);
}
