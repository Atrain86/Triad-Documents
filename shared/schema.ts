import { pgTable, text, serial, integer, real, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").default(1), // Owner of the project (defaults to first admin user)
  clientName: text("client_name").notNull(),
  address: text("address").notNull(),
  clientCity: text("client_city"),
  clientPostal: text("client_postal"),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  projectType: text("project_type").notNull().default("exterior"), // interior or exterior
  roomCount: integer("room_count").notNull(),
  difficulty: text("difficulty").notNull(),
  status: text("status").notNull().default("in-progress"),
  estimate: real("estimate"),
  notes: text("notes"),
  clientPreferences: text("client_preferences"),
  specialRequirements: text("special_requirements"),
  statusDetails: text("status_details"), // For tracking estimate approval status, etc.
  scheduledStartDate: timestamp("scheduled_start_date"),
  scheduledEndDate: timestamp("scheduled_end_date"),
  hourlyRate: real("hourly_rate").default(50), // Default painter rate
  helperRate: real("helper_rate").default(35), // Default helper rate
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const photos = pgTable("photos", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  description: text("description"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  vendor: text("vendor").notNull(),
  amount: text("amount").notNull(), // Store as text for decimal precision
  description: text("description"),
  filename: text("filename"),
  originalName: text("original_name"),
  items: text("items").array(), // Store itemized list from OCR
  ocrMethod: text("ocr_method"), // Track how data was extracted
  confidence: real("confidence"), // OCR confidence score
  date: timestamp("date").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const dailyHours = pgTable("daily_hours", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  date: timestamp("date").notNull(),
  hours: real("hours").notNull(),
  description: text("description"),
  workerName: text("worker_name").default("Primary Worker"),
  hourlyRate: real("hourly_rate").notNull().default(50),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const toolsChecklist = pgTable("tools_checklist", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  toolName: text("tool_name").notNull(),
  isCompleted: integer("is_completed").default(0), // 0 = unchecked, 1 = checked
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  estimateNumber: text("estimate_number").notNull(),
  date: timestamp("date").notNull(),
  projectTitle: text("project_title"),
  projectDescription: text("project_description"),
  
  // Work stages (stored as JSON)
  workStages: text("work_stages").notNull(), // JSON string
  
  // Additional services (stored as JSON)
  additionalServices: text("additional_services").notNull(), // JSON string
  
  // Paint details
  primerCoats: integer("primer_coats").default(1),
  topCoats: integer("top_coats").default(2),
  paintSuppliedBy: text("paint_supplied_by").notNull(), // 'contractor' or 'client'
  paintCost: real("paint_cost").default(0),
  deliveryCost: real("delivery_cost").default(0),
  
  // Status
  status: text("status").default("draft"), // 'draft', 'sent', 'approved', 'rejected'
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// User authentication table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  password: text("password").notNull(), // bcrypt hashed
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("client"), // 'admin' or 'client'
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

// Token usage tracking for OpenAI API calls
export const tokenUsage = pgTable("token_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  operation: text("operation").notNull(), // 'receipt_ocr', 'vision_analysis', etc.
  tokensUsed: integer("tokens_used").notNull(),
  cost: real("cost").notNull(), // Cost in USD
  model: text("model").notNull(), // 'gpt-4o', etc.
  imageSize: integer("image_size"), // Image size in bytes for vision calls
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

export const insertPhotoSchema = createInsertSchema(photos).omit({
  id: true,
  uploadedAt: true,
});

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  uploadedAt: true,
});

export const insertDailyHoursSchema = createInsertSchema(dailyHours).omit({
  id: true,
  createdAt: true,
});

export const insertToolsChecklistSchema = createInsertSchema(toolsChecklist).omit({
  id: true,
  createdAt: true,
});

export const insertEstimateSchema = createInsertSchema(estimates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastLoginAt: true,
});

export const insertTokenUsageSchema = createInsertSchema(tokenUsage).omit({
  id: true,
  createdAt: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertPhoto = z.infer<typeof insertPhotoSchema>;
export type Photo = typeof photos.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;
export type Receipt = typeof receipts.$inferSelect;
export type InsertDailyHours = z.infer<typeof insertDailyHoursSchema>;
export type DailyHours = typeof dailyHours.$inferSelect;
export type InsertToolsChecklist = z.infer<typeof insertToolsChecklistSchema>;
export type ToolsChecklist = typeof toolsChecklist.$inferSelect;
export type InsertEstimate = z.infer<typeof insertEstimateSchema>;
export type Estimate = typeof estimates.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTokenUsage = z.infer<typeof insertTokenUsageSchema>;
export type TokenUsage = typeof tokenUsage.$inferSelect;
