import dotenv from "dotenv";
dotenv.config(); // Load .env file at startup

import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

console.log("🟢 Connecting to Render Postgres...");
const client = postgres(process.env.DATABASE_URL, { ssl: "require" });
export const db = drizzlePg(client, { schema });
