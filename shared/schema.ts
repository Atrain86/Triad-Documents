import { pgTable, text, serial, integer, real, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  role: text("role").notNull().default("client"), // admin or client
  isActive: text("is_active").default("true"), // keeping as text for compatibility
  gmailEmail: text("gmail_email"),
  gmailRefreshToken: text("gmail_refresh_token"),
  gmailConnectedAt: timestamp("gmail_connected_at"),
  logoUrl: text("logo_url"), // Path to uploaded logo file
  logoOriginalName: text("logo_original_name"), // Original filename
  logoUploadedAt: timestamp("logo_uploaded_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastLoginAt: timestamp("last_login_at"),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  clientName: text("client_name").notNull(),
  address: text("address").notNull(),
  clientCity: text("client_city"),
  clientPostal: text("client_postal"),
  clientEmail: text("client_email"),
  clientPhone: text("client_phone"),
  projectType: text("project_type").notNull().default("exterior"), // interior or exterior
  roomCount: integer("room_count").notNull(),
  difficulty: text("difficulty").default("medium").notNull(),
  status: text("status").notNull().default("estimating"),
  estimate: real("estimate"),
  notes: text("notes"),
  clientPreferences: text("client_preferences"),
  specialRequirements: text("special_requirements"),
  statusDetails: text("status_details"), // For tracking estimate approval status, etc.
  scheduledStartDate: timestamp("scheduled_start_date"),
  scheduledEndDate: timestamp("scheduled_end_date"),
  hourlyRate: real("hourly_rate").default(50), // Default painter rate
  helperRate: real("helper_rate").default(35), // Default helper rate
  userId: integer("user_id"),
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
  date: timestamp("date").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  items: text("items").array(), // Array field that exists in DB
  ocrMethod: text("ocr_method"), // Field that exists in DB
  confidence: real("confidence"), // Field that exists in DB
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
  isCompleted: integer("is_completed").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tokenUsage = pgTable("token_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  operation: text("operation"),
  tokensUsed: integer("tokens_used"),
  cost: real("cost"),
  model: text("model"),
  imageSize: integer("image_size"),
  success: text("success"), // Using text instead of boolean for compatibility
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const estimates = pgTable("estimates", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull(),
  content: text("content"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id"),
  data: text("data"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const logoLibrary = pgTable("logo_library", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  isDemo: text("is_demo").default("false"), // "true" for demo logos, "false" for uploaded
  uploadedBy: integer("uploaded_by"), // user ID who uploaded it
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userLogos = pgTable("user_logos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  logoType: text("logo_type").notNull(), // 'homepage', 'invoice', 'estimate', 'business'
  logoUrl: text("logo_url").notNull(), // Path to uploaded logo file
  logoOriginalName: text("logo_original_name").notNull(), // Original filename
  isActive: text("is_active").default("true"),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});



export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
}).extend({
  // Make difficulty optional in form since we provide a default
  difficulty: z.string().optional().default("medium"),
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
}).extend({
  date: z.string().transform((str) => {
    // If it's already a YYYY-MM-DD format, append time for proper timestamp and convert to Date
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(`${str}T12:00:00.000Z`); // Use noon UTC to avoid timezone issues
    }
    // If it includes time, extract just the date part and use noon UTC
    if (str.includes('T')) {
      const datePart = str.split('T')[0];
      return new Date(`${datePart}T12:00:00.000Z`);
    }
    return new Date(str);
  }),
});

export const updateDailyHoursSchema = createInsertSchema(dailyHours).omit({
  id: true,
  createdAt: true,
  projectId: true, // Omit projectId for updates since it shouldn't change
}).extend({
  date: z.string().transform((str) => {
    // If it's already a YYYY-MM-DD format, append time for proper timestamp and convert to Date
    if (str.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return new Date(`${str}T12:00:00.000Z`); // Use noon UTC to avoid timezone issues
    }
    // If it includes time, extract just the date part and use noon UTC
    if (str.includes('T')) {
      const datePart = str.split('T')[0];
      return new Date(`${datePart}T12:00:00.000Z`);
    }
    return new Date(str);
  }),
});

export const insertToolsChecklistSchema = createInsertSchema(toolsChecklist).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertLogoLibrarySchema = createInsertSchema(logoLibrary).omit({
  id: true,
  createdAt: true,
});

export const insertUserLogosSchema = createInsertSchema(userLogos).omit({
  id: true,
  uploadedAt: true,
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
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertLogoLibrary = z.infer<typeof insertLogoLibrarySchema>;
export type LogoLibrary = typeof logoLibrary.$inferSelect;
export type InsertUserLogos = z.infer<typeof insertUserLogosSchema>;
export type UserLogos = typeof userLogos.$inferSelect;
