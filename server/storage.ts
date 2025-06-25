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
import fs from 'fs';
import path from 'path';

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

export class MemStorage implements IStorage {
  private projects: Map<number, Project>;
  private photos: Map<number, Photo>;
  private receipts: Map<number, Receipt>;
  private dailyHours: Map<number, DailyHours>;
  private currentProjectId: number;
  private currentPhotoId: number;
  private currentReceiptId: number;
  private currentHoursId: number;
  private dataFile: string;

  constructor() {
    this.dataFile = path.join(process.cwd(), 'storage.json');
    
    // Load existing data or initialize
    const data = this.loadData();
    this.projects = new Map(data.projects);
    this.photos = new Map(data.photos);
    this.receipts = new Map(data.receipts);
    this.dailyHours = new Map(data.dailyHours);
    this.currentProjectId = data.currentProjectId;
    this.currentPhotoId = data.currentPhotoId;
    this.currentReceiptId = data.currentReceiptId;
    this.currentHoursId = data.currentHoursId;
  }

  private loadData() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const rawData = fs.readFileSync(this.dataFile, 'utf8');
        const parsed = JSON.parse(rawData);
        // Convert date strings back to Date objects
        if (parsed.projects) {
          parsed.projects = parsed.projects.map(([id, project]: [number, any]) => [
            id, 
            { ...project, createdAt: new Date(project.createdAt) }
          ]);
        }
        if (parsed.photos) {
          parsed.photos = parsed.photos.map(([id, photo]: [number, any]) => [
            id, 
            { ...photo, uploadedAt: new Date(photo.uploadedAt) }
          ]);
        }
        if (parsed.receipts) {
          parsed.receipts = parsed.receipts.map(([id, receipt]: [number, any]) => [
            id, 
            { ...receipt, date: new Date(receipt.date), uploadedAt: new Date(receipt.uploadedAt) }
          ]);
        }
        if (parsed.dailyHours) {
          parsed.dailyHours = parsed.dailyHours.map(([id, hours]: [number, any]) => [
            id, 
            { ...hours, date: new Date(hours.date), createdAt: new Date(hours.createdAt) }
          ]);
        }
        return parsed;
      }
    } catch (error) {
      console.error('Error loading storage data:', error);
    }
    
    return {
      projects: [],
      photos: [],
      receipts: [],
      dailyHours: [],
      currentProjectId: 1,
      currentPhotoId: 1,
      currentReceiptId: 1,
      currentHoursId: 1
    };
  }

  private saveData() {
    try {
      const data = {
        projects: Array.from(this.projects.entries()),
        photos: Array.from(this.photos.entries()),
        receipts: Array.from(this.receipts.entries()),
        dailyHours: Array.from(this.dailyHours.entries()),
        currentProjectId: this.currentProjectId,
        currentPhotoId: this.currentPhotoId,
        currentReceiptId: this.currentReceiptId,
        currentHoursId: this.currentHoursId
      };
      fs.writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error saving storage data:', error);
    }
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const project: Project = { 
      ...insertProject,
      id, 
      projectType: insertProject.projectType ?? "interior",
      status: insertProject.status || "estimating",
      estimate: insertProject.estimate || null,
      notes: insertProject.notes || null,
      clientPreferences: insertProject.clientPreferences || null,
      specialRequirements: insertProject.specialRequirements || null,
      statusDetails: insertProject.statusDetails ?? null,
      scheduledStartDate: insertProject.scheduledStartDate ?? null,
      scheduledEndDate: insertProject.scheduledEndDate ?? null,
      hourlyRate: insertProject.hourlyRate ?? 50,
      helperRate: insertProject.helperRate ?? 35,
      createdAt: new Date()
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;

    const updatedProject = { ...project, ...updates };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }

  // Photos
  async getProjectPhotos(projectId: number): Promise<Photo[]> {
    return Array.from(this.photos.values()).filter(photo => photo.projectId === projectId);
  }

  async createPhoto(insertPhoto: InsertPhoto): Promise<Photo> {
    const id = this.currentPhotoId++;
    const photo: Photo = { 
      ...insertPhoto,
      id,
      description: insertPhoto.description || null,
      uploadedAt: new Date()
    };
    this.photos.set(id, photo);
    this.saveData();
    return photo;
  }

  async deletePhoto(id: number): Promise<boolean> {
    return this.photos.delete(id);
  }

  // Receipts
  async getProjectReceipts(projectId: number): Promise<Receipt[]> {
    return Array.from(this.receipts.values()).filter(receipt => receipt.projectId === projectId);
  }

  async createReceipt(insertReceipt: InsertReceipt): Promise<Receipt> {
    const id = this.currentReceiptId++;
    const receipt: Receipt = { 
      ...insertReceipt,
      id,
      amount: insertReceipt.amount.toString(),
      filename: insertReceipt.filename || null,
      originalName: insertReceipt.originalName || null,
      description: insertReceipt.description || null,
      uploadedAt: new Date()
    };
    this.receipts.set(id, receipt);
    return receipt;
  }

  async updateReceipt(id: number, updates: Partial<InsertReceipt>): Promise<Receipt | undefined> {
    const receipt = this.receipts.get(id);
    if (!receipt) return undefined;

    const updatedReceipt = { ...receipt, ...updates };
    this.receipts.set(id, updatedReceipt);
    return updatedReceipt;
  }

  async deleteReceipt(id: number): Promise<boolean> {
    return this.receipts.delete(id);
  }

  // Daily Hours
  async getProjectHours(projectId: number): Promise<DailyHours[]> {
    return Array.from(this.dailyHours.values()).filter(hours => hours.projectId === projectId);
  }

  async createDailyHours(insertHours: InsertDailyHours): Promise<DailyHours> {
    const id = this.currentHoursId++;
    const hours: DailyHours = { 
      ...insertHours,
      id,
      description: insertHours.description || null,
      workerName: insertHours.workerName || "Primary Worker",
      hourlyRate: insertHours.hourlyRate || 50,
      createdAt: new Date()
    };
    this.dailyHours.set(id, hours);
    return hours;
  }

  async updateDailyHours(id: number, updates: Partial<InsertDailyHours>): Promise<DailyHours | undefined> {
    const hours = this.dailyHours.get(id);
    if (!hours) return undefined;

    const updatedHours = { ...hours, ...updates };
    this.dailyHours.set(id, updatedHours);
    return updatedHours;
  }

  async deleteDailyHours(id: number): Promise<boolean> {
    return this.dailyHours.delete(id);
  }
}

export const storage = new MemStorage();
