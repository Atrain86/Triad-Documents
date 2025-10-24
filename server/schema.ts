// 📄 FILE: /server/schema.ts
import { pgTable, text, serial, integer, real, timestamp } from "drizzle-orm/pg-core";

// USERS TABLE
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  role: text("role").notNull().default("client"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// PROJECTS TABLE
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  address: text("address").notNull(),
  projectType: text("project_type").notNull().default("exterior"),
  roomCount: integer("room_count").notNull(),
  difficulty: text("difficulty").notNull(),
  status: text("status").notNull().default("estimating"),
  estimate: real("estimate"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
