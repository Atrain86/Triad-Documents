import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure Neon WebSocket settings with proper error handling
try {
  neonConfig.webSocketConstructor = ws;
  neonConfig.wsProxy = (host: string) => `${host}:443/v2`;
  neonConfig.useSecureWebSocket = true;
  neonConfig.pipelineConnect = false;
  
  // Add connection pool timeout and retry settings
  neonConfig.poolQueryViaFetch = true;
  neonConfig.fetchConnectionCache = true;
} catch (error) {
  console.warn('WebSocket configuration warning:', error);
}

// Create pool with conservative connection settings
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 10,  // Reduce max connections to avoid overwhelm
  idleTimeoutMillis: 15000,  // Shorter idle timeout
  connectionTimeoutMillis: 10000,  // Longer connection timeout
  maxUses: 7500,  // Limit connection reuse
  allowExitOnIdle: false
});

// Add pool error handling
pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

export const db = drizzle({ client: pool, schema });