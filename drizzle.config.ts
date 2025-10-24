// 📄 FILE: drizzle.config.ts
import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  schema: "./server/schema.ts",
  out: "./server/migrations",

  // 👇 new syntax
  dialect: "postgresql",

  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
