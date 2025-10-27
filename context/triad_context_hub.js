// Triad Context Hub – Phase III-C Initialization
// Event-driven state bus connecting all Triad services.

import EventEmitter from "events";
export const contextBus = new EventEmitter();

export const globalContext = {
  lastUpdate: new Date().toISOString(),
  services: {},
  governance: {},
};

export function updateContext(source, data) {
  globalContext.services[source] = {
    ...data,
    updated: new Date().toISOString(),
  };
  globalContext.lastUpdate = new Date().toISOString();
  contextBus.emit("contextUpdated", globalContext);
  console.log(`[ContextHub] ${source} updated context.`);
}

export function getContext() {
  return globalContext;
}
