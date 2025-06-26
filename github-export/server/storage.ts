import { 
  projects, 
  photos, 
  receipts, 
  dailyHours,
  type Project, 
  type Photo, 
  type Receipt, 
  type DailyHours,
  type InsertProject, 
  type InsertPhoto, 
  type InsertReceipt, 
  type InsertDailyHours 
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Photos
  getProjectPhotos(projectId: number): Promise<Photo[]>;
  createPhoto(photo: InsertPhoto): Promise<Photo>;
  deletePhoto(id: number): Promise<boolean>;

  // Receipts
  getProjectReceipts(projectId: number): Promise<Receipt[]>;
  createReceipt(receipt: InsertReceipt): Promise<Receipt>;
  updateReceipt(id: number, receipt: Partial<InsertReceipt>): Promise<Receipt | undefined>;
  deleteReceipt(id: number): Promise<boolean>;

  // Daily Hours
  getProjectHours(projectId: number): Promise<DailyHours[]>;
  createDailyHours(hours: InsertDailyHours): Promise<DailyHours>;
  updateDailyHours(id: number, hours: Partial<InsertDailyHours>): Promise<DailyHours | undefined>;
  deleteDailyHours(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    const result = await db.select().from(projects);
    return result;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db
      .insert(projects)
      .values(insertProject)
      .returning();
    return project;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db
      .update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return project || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Photos
  async getProjectPhotos(projectId: number): Promise<Photo[]> {
    const result = await db.select().from(photos).where(eq(photos.projectId, projectId));
    return result;
  }

  async createPhoto(insertPhoto: InsertPhoto): Promise<Photo> {
    const [photo] = await db
      .insert(photos)
      .values(insertPhoto)
      .returning();
    return photo;
  }

  async deletePhoto(id: number): Promise<boolean> {
    const result = await db.delete(photos).where(eq(photos.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Receipts
  async getProjectReceipts(projectId: number): Promise<Receipt[]> {
    const result = await db.select().from(receipts).where(eq(receipts.projectId, projectId));
    return result;
  }

  async createReceipt(insertReceipt: InsertReceipt): Promise<Receipt> {
    const [receipt] = await db
      .insert(receipts)
      .values(insertReceipt)
      .returning();
    return receipt;
  }

  async updateReceipt(id: number, updates: Partial<InsertReceipt>): Promise<Receipt | undefined> {
    const [receipt] = await db
      .update(receipts)
      .set(updates)
      .where(eq(receipts.id, id))
      .returning();
    return receipt || undefined;
  }

  async deleteReceipt(id: number): Promise<boolean> {
    const result = await db.delete(receipts).where(eq(receipts.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Daily Hours
  async getProjectHours(projectId: number): Promise<DailyHours[]> {
    const result = await db.select().from(dailyHours).where(eq(dailyHours.projectId, projectId));
    return result;
  }

  async createDailyHours(insertHours: InsertDailyHours): Promise<DailyHours> {
    const [hours] = await db
      .insert(dailyHours)
      .values(insertHours)
      .returning();
    return hours;
  }

  async updateDailyHours(id: number, updates: Partial<InsertDailyHours>): Promise<DailyHours | undefined> {
    const [hours] = await db
      .update(dailyHours)
      .set(updates)
      .where(eq(dailyHours.id, id))
      .returning();
    return hours || undefined;
  }

  async deleteDailyHours(id: number): Promise<boolean> {
    const result = await db.delete(dailyHours).where(eq(dailyHours.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();