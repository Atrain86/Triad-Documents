import { 
  projects, 
  photos, 
  receipts, 
  dailyHours,
  toolsChecklist,
  estimates,
  users,
  tokenUsage,
  type Project, 
  type Photo, 
  type Receipt, 
  type DailyHours,
  type ToolsChecklist,
  type Estimate,
  type User,
  type TokenUsage,
  type InsertProject, 
  type InsertPhoto, 
  type InsertReceipt, 
  type InsertDailyHours,
  type InsertToolsChecklist,
  type InsertEstimate,
  type InsertUser,
  type InsertTokenUsage
} from "@shared/schema";
import { db } from "./db";
import { eq, and, like, not, isNotNull, desc, sum } from "drizzle-orm";

export interface IStorage {
  // Projects
  getProjects(userId?: number): Promise<Project[]>;
  getProject(id: number, userId?: number): Promise<Project | undefined>;
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

  // Estimates
  getProjectEstimates(projectId: number): Promise<Estimate[]>;
  getEstimate(id: number): Promise<Estimate | undefined>;
  createEstimate(estimate: InsertEstimate): Promise<Estimate>;
  updateEstimate(id: number, estimate: Partial<InsertEstimate>): Promise<Estimate | undefined>;
  deleteEstimate(id: number): Promise<boolean>;

  // User management
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserLastLogin(id: number): Promise<void>;
  
  // Token usage tracking
  logTokenUsage(usage: InsertTokenUsage): Promise<TokenUsage>;
  getUserTokenUsage(userId: number, limit?: number): Promise<TokenUsage[]>;
  getTotalTokenUsage(): Promise<{ totalTokens: number; totalCost: number; }>;
  getTokenUsageByUser(): Promise<{ userId: number; email: string; totalTokens: number; totalCost: number; }[]>;
}

export class DatabaseStorage implements IStorage {
  async getProjects(userId?: number): Promise<Project[]> {
    try {
      if (userId) {
        // Return projects for specific user
        const result = await db.select().from(projects).where(eq(projects.userId, userId));
        return result;
      } else {
        // Admin access - return all projects
        const result = await db.select().from(projects);
        return result;
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw new Error('Failed to fetch projects');
    }
  }

  async getProject(id: number, userId?: number): Promise<Project | undefined> {
    try {
      if (userId) {
        // User-specific access - ensure user owns the project
        const [project] = await db.select()
          .from(projects)
          .where(and(eq(projects.id, id), eq(projects.userId, userId)));
        return project || undefined;
      } else {
        // Admin access - return any project
        const [project] = await db.select().from(projects).where(eq(projects.id, id));
        return project || undefined;
      }
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

  async getProjectEstimates(projectId: number): Promise<Estimate[]> {
    const result = await db.select().from(estimates).where(eq(estimates.projectId, projectId));
    return result;
  }

  async getEstimate(id: number): Promise<Estimate | undefined> {
    const result = await db.select().from(estimates).where(eq(estimates.id, id));
    return result[0];
  }

  async createEstimate(insertEstimate: InsertEstimate): Promise<Estimate> {
    const result = await db.insert(estimates).values(insertEstimate).returning();
    return result[0];
  }

  async updateEstimate(id: number, updates: Partial<InsertEstimate>): Promise<Estimate | undefined> {
    const result = await db.update(estimates).set(updates).where(eq(estimates.id, id)).returning();
    return result[0];
  }

  async deleteEstimate(id: number): Promise<boolean> {
    const result = await db.delete(estimates).where(eq(estimates.id, id));
    return (result.rowCount || 0) > 0;
  }

  // User management methods
  async getUserById(id: number): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error('Error fetching user by id:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email));
      return user;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      throw new Error('Failed to fetch user');
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const [user] = await db.insert(users).values(insertUser).returning();
      return user;
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUserLastLogin(id: number): Promise<void> {
    try {
      await db.update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, id));
    } catch (error) {
      console.error('Error updating user last login:', error);
      throw new Error('Failed to update user last login');
    }
  }

  // Token usage tracking methods
  async logTokenUsage(usage: InsertTokenUsage): Promise<TokenUsage> {
    try {
      const [tokenUsageRecord] = await db.insert(tokenUsage).values(usage).returning();
      return tokenUsageRecord;
    } catch (error) {
      console.error('Error logging token usage:', error);
      throw new Error('Failed to log token usage');
    }
  }

  async getUserTokenUsage(userId: number, limit = 50): Promise<TokenUsage[]> {
    try {
      return await db.select()
        .from(tokenUsage)
        .where(eq(tokenUsage.userId, userId))
        .orderBy(desc(tokenUsage.createdAt))
        .limit(limit);
    } catch (error) {
      console.error('Error fetching user token usage:', error);
      throw new Error('Failed to fetch user token usage');
    }
  }

  async getTotalTokenUsage(): Promise<{ totalTokens: number; totalCost: number; }> {
    try {
      const result = await db
        .select({
          totalTokens: tokenUsage.tokensUsed,
          totalCost: tokenUsage.cost
        })
        .from(tokenUsage);
      
      const totals = result.reduce(
        (acc, row) => ({
          totalTokens: acc.totalTokens + (row.totalTokens || 0),
          totalCost: acc.totalCost + (row.totalCost || 0)
        }),
        { totalTokens: 0, totalCost: 0 }
      );
      
      return totals;
    } catch (error) {
      console.error('Error calculating total token usage:', error);
      throw new Error('Failed to calculate total token usage');
    }
  }

  async getTokenUsageByUser(): Promise<{ userId: number; email: string; totalTokens: number; totalCost: number; }[]> {
    try {
      const result = await db
        .select({
          userId: users.id,
          email: users.email,
          tokensUsed: tokenUsage.tokensUsed,
          cost: tokenUsage.cost
        })
        .from(tokenUsage)
        .innerJoin(users, eq(tokenUsage.userId, users.id));
      
      // Group by user and sum tokens/cost
      const userTotals = result.reduce((acc, row) => {
        const key = `${row.userId}-${row.email}`;
        if (!acc[key]) {
          acc[key] = {
            userId: row.userId,
            email: row.email,
            totalTokens: 0,
            totalCost: 0
          };
        }
        acc[key].totalTokens += row.tokensUsed || 0;
        acc[key].totalCost += row.cost || 0;
        return acc;
      }, {} as Record<string, { userId: number; email: string; totalTokens: number; totalCost: number; }>);
      
      return Object.values(userTotals);
    } catch (error) {
      console.error('Error fetching token usage by user:', error);
      throw new Error('Failed to fetch token usage by user');
    }
  }
}

export const storage = new DatabaseStorage();