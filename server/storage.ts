import { 
  projects, 
  photos, 
  receipts, 
  dailyHours,
  toolsChecklist,
  type Project, 
  type Photo, 
  type Receipt, 
  type DailyHours,
  type ToolsChecklist,
  type InsertProject, 
  type InsertPhoto, 
  type InsertReceipt, 
  type InsertDailyHours,
  type InsertToolsChecklist
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

  // Tools Checklist
  getProjectTools(projectId: number): Promise<ToolsChecklist[]>;
  createTool(tool: InsertToolsChecklist): Promise<ToolsChecklist>;
  updateTool(id: number, tool: Partial<InsertToolsChecklist>): Promise<ToolsChecklist | undefined>;
  deleteTool(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(): Promise<Project[]> {
    try {
      const result = await db.select().from(projects);
      return result;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw new Error('Failed to fetch projects');
    }
  }

  async getProject(id: number): Promise<Project | undefined> {
    try {
      const [project] = await db.select().from(projects).where(eq(projects.id, id));
      return project || undefined;
    } catch (error) {
      console.error('Error fetching project:', error);
      throw new Error('Failed to fetch project');
    }
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    try {
      const [project] = await db
        .insert(projects)
        .values(insertProject)
        .returning();
      return project;
    } catch (error) {
      console.error('Error creating project:', error);
      throw new Error('Failed to create project');
    }
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

  async getProjectTools(projectId: number): Promise<ToolsChecklist[]> {
    const result = await db.select().from(toolsChecklist).where(eq(toolsChecklist.projectId, projectId));
    return result;
  }

  async createTool(insertTool: InsertToolsChecklist): Promise<ToolsChecklist> {
    const result = await db.insert(toolsChecklist).values(insertTool).returning();
    return result[0];
  }

  async updateTool(id: number, updates: Partial<InsertToolsChecklist>): Promise<ToolsChecklist | undefined> {
    const result = await db.update(toolsChecklist).set(updates).where(eq(toolsChecklist.id, id)).returning();
    return result[0];
  }

  async deleteTool(id: number): Promise<boolean> {
    const result = await db.delete(toolsChecklist).where(eq(toolsChecklist.id, id));
    return (result.rowCount || 0) > 0;
  }
}

export const storage = new DatabaseStorage();