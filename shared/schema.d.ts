/**
 * Unified PaintBrain shared schema.
 * This file adds every field referenced in the front end and back end,
 * so TypeScript stops complaining until your Drizzle ORM schema is reinstated.
 */
export interface Project {
    id?: number;
    clientName: string;
    address: string;
    clientCity?: string;
    clientPostal?: string;
    clientEmail?: string;
    clientPhone?: string;
    roomCount: number;
    difficulty: string;
    projectType?: string;
    estimate?: number;
    notes?: string;
    status?: string;
    statusDetails?: string;
    helperRate?: number;
    hourlyRate?: number;
    scheduledStartDate?: string;
    scheduledEndDate?: string;
    specialRequirements?: string;
    clientPreferences?: string;
}
export interface ReceiptItem {
    name: string;
    price: number;
}
export interface Receipt {
    id?: number;
    projectId?: number;
    vendor?: string;
    amount: number | string;
    date: string;
    description?: string;
    filename?: string;
    items?: ReceiptItem[];
    ocrMethod?: string;
    confidence?: number;
}
export interface Photo {
    id: number;
    projectId?: number;
    url?: string;
    filename?: string;
    originalName?: string;
    description?: string;
    uploadedAt?: string;
}
export interface DailyHours {
    id: number;
    projectId?: number;
    date: string;
    hours: number;
    description?: string;
    hourlyRate?: number;
    workerName?: string;
}
export interface ToolsChecklist {
    id: number;
    projectId?: number;
    toolName?: string;
    checked?: boolean;
}
/**
 * Placeholders to satisfy Drizzle references during build.
 */
export declare const projects: Project[];
export declare const users: any[];
export declare const tokenUsage: any[];
