import "dotenv/config";
import express, { Request, Response } from "express";
import cors from "cors";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
import router from "./routes.js";
import googleDriveRoutes from "./routes/googleDriveRoutes.js";

const { Pool } = pkg;
const app = express();

// ✅ Middleware
app.use(
  cors({
    origin: [/http:\/\/localhost:\d+$/], // Allow any localhost port
    credentials: true,
  })
);
app.use(express.json());

// ✅ Environment variables
const port = process.env.PORT || 5001;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL must be set in .env");
}

// ✅ Database connection
console.log("🟢 Connecting to Render Postgres...");
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});
export const db = drizzle(pool);

// ✅ Route mounting (correct base path)
app.use("/api", router);
app.use("/api", googleDriveRoutes);

// ✅ Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "Paint Brain backend is running!" });
});

app.get("/api/ping", (_req: Request, res: Response) => {
  res.status(200).json({ message: "Server is alive", timestamp: new Date().toISOString() });
});

// ✅ Start server
app.listen(port, () => {
  console.log(`✅ Paint Brain server running on http://localhost:${port}`);
});
