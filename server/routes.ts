import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertPhotoSchema, insertReceiptSchema, insertDailyHoursSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const upload = multer({
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files
  app.use('/uploads', express.static(uploadDir));

  // Projects
  app.get('/api/projects', async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch project' });
    }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ error: 'Invalid project data' });
    }
  });

  app.put('/api/projects/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, updates);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: 'Invalid project data' });
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProject(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // Photos
  app.get('/api/projects/:id/photos', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const photos = await storage.getProjectPhotos(projectId);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch photos' });
    }
  });

  app.post('/api/projects/:id/photos', upload.single('photo'), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      console.log('Photo upload request for project:', projectId);
      console.log('File uploaded:', req.file);
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const photoData = {
        projectId,
        filename: req.file.filename,
        originalName: req.file.originalname,
        description: req.body.description || null,
      };

      console.log('Photo data to save:', photoData);
      const validatedData = insertPhotoSchema.parse(photoData);
      console.log('Validated photo data:', validatedData);
      
      const photo = await storage.createPhoto(validatedData);
      console.log('Photo saved to database:', photo);
      
      res.status(201).json(photo);
    } catch (error) {
      console.error('Photo upload error:', error);
      res.status(400).json({ error: 'Failed to upload photo' });
    }
  });

  app.delete('/api/photos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePhoto(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete photo' });
    }
  });

  // Receipts
  app.get('/api/projects/:id/receipts', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const receipts = await storage.getProjectReceipts(projectId);
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch receipts' });
    }
  });

  app.post('/api/projects/:id/receipts', upload.single('receipt'), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const receiptData = {
        projectId,
        vendor: req.body.vendor,
        amount: parseFloat(req.body.amount),
        description: req.body.description || null,
        date: new Date(req.body.date),
        filename: req.file?.filename || null,
        originalName: req.file?.originalname || null,
      };

      const validatedData = insertReceiptSchema.parse(receiptData);
      const receipt = await storage.createReceipt(validatedData);
      res.status(201).json(receipt);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create receipt' });
    }
  });

  app.put('/api/receipts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertReceiptSchema.partial().parse(req.body);
      const receipt = await storage.updateReceipt(id, updates);
      if (!receipt) {
        return res.status(404).json({ error: 'Receipt not found' });
      }
      res.json(receipt);
    } catch (error) {
      res.status(400).json({ error: 'Invalid receipt data' });
    }
  });

  app.delete('/api/receipts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteReceipt(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Receipt not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete receipt' });
    }
  });

  // Daily Hours
  app.get('/api/projects/:id/hours', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const hours = await storage.getProjectHours(projectId);
      res.json(hours);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch hours' });
    }
  });

  app.post('/api/projects/:id/hours', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const hoursData = {
        projectId,
        date: new Date(req.body.date),
        hours: parseFloat(req.body.hours),
        description: req.body.description,
        workerName: req.body.workerName,
        hourlyRate: parseFloat(req.body.hourlyRate),
      };

      const validatedData = insertDailyHoursSchema.parse(hoursData);
      const hours = await storage.createDailyHours(validatedData);
      res.status(201).json(hours);
    } catch (error) {
      console.error('Error creating hours:', error);
      res.status(400).json({ error: 'Failed to create hours entry' });
    }
  });

  app.put('/api/hours/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertDailyHoursSchema.partial().parse(req.body);
      const hours = await storage.updateDailyHours(id, updates);
      if (!hours) {
        return res.status(404).json({ error: 'Hours entry not found' });
      }
      res.json(hours);
    } catch (error) {
      res.status(400).json({ error: 'Invalid hours data' });
    }
  });

  app.delete('/api/hours/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDailyHours(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Hours entry not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete hours entry' });
    }
  });

  // Daily Hours
  app.get('/api/projects/:id/hours', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const hours = await storage.getProjectHours(projectId);
      res.json(hours);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch hours' });
    }
  });

  app.post('/api/projects/:id/hours', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const hoursData = {
        projectId,
        date: new Date(req.body.date),
        hours: parseFloat(req.body.hours),
        description: req.body.description || null,
      };

      const validatedData = insertDailyHoursSchema.parse(hoursData);
      const hours = await storage.createDailyHours(validatedData);
      res.status(201).json(hours);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create hours entry' });
    }
  });

  app.put('/api/hours/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertDailyHoursSchema.partial().parse(req.body);
      const hours = await storage.updateDailyHours(id, updates);
      if (!hours) {
        return res.status(404).json({ error: 'Hours entry not found' });
      }
      res.json(hours);
    } catch (error) {
      res.status(400).json({ error: 'Invalid hours data' });
    }
  });

  app.delete('/api/hours/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDailyHours(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Hours entry not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete hours entry' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
