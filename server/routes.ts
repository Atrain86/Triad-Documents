import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertPhotoSchema, insertReceiptSchema, insertDailyHoursSchema, insertToolsChecklistSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
const photosDir = path.join(uploadDir, 'photos');
const receiptsDir = path.join(uploadDir, 'receipts');

// Ensure directories exist
[uploadDir, photosDir, receiptsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDir, // Always save to root uploads directory
    filename: (req, file, cb) => {
      // Generate unique filename with original extension
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueName + ext);
    }
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit for high-res photos
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploaded files with proper MIME types
  app.use('/uploads', express.static(uploadDir, {
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.jpg' || ext === '.jpeg') {
        res.setHeader('Content-Type', 'image/jpeg');
      } else if (ext === '.png') {
        res.setHeader('Content-Type', 'image/png');
      } else if (ext === '.gif') {
        res.setHeader('Content-Type', 'image/gif');
      } else if (ext === '.webp') {
        res.setHeader('Content-Type', 'image/webp');
      } else if (ext === '.heic' || ext === '.heif') {
        res.setHeader('Content-Type', 'image/heic');
      } else {
        // For files without extension, try to detect from content
        res.setHeader('Content-Type', 'image/jpeg'); // Default fallback
      }
    }
  }));

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
      console.log('Received project data:', req.body);
      const validatedData = insertProjectSchema.parse(req.body);
      console.log('Validated project data:', validatedData);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      console.error('Project validation error:', error);
      res.status(400).json({ error: 'Invalid project data', details: error instanceof Error ? error.message : 'Unknown error' });
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

  app.post('/api/projects/:id/photos', upload.array('photos', 10), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      console.log('Photo upload request for project:', projectId);
      console.log('Request files:', req.files);
      console.log('Request body:', req.body);
      console.log('Files array length:', req.files ? req.files.length : 'undefined');
      
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        console.log('No files received - req.files:', req.files);
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploadedPhotos = [];
      
      for (const file of req.files) {
        const photoData = {
          projectId,
          filename: file.filename,
          originalName: file.originalname,
          description: req.body.description || null,
        };

        console.log('Photo data to save:', photoData);
        const validatedData = insertPhotoSchema.parse(photoData);
        console.log('Validated photo data:', validatedData);
        
        const photo = await storage.createPhoto(validatedData);
        console.log('Photo saved to database:', photo);
        uploadedPhotos.push(photo);
      }
      
      res.status(201).json(uploadedPhotos);
    } catch (error) {
      console.error('Photo upload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(400).json({ error: 'Failed to upload photos: ' + errorMessage });
    }
  });

  app.delete('/api/projects/:projectId/photos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get photo info before deleting to access filename
      const photos = await storage.getProjectPhotos(parseInt(req.params.projectId));
      const photo = photos.find(p => p.id === id);
      
      if (!photo) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      
      // Delete from database
      const deleted = await storage.deletePhoto(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Photo not found' });
      }
      
      // Delete physical file
      try {
        const filePath = path.join(uploadDir, photo.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log('Deleted photo file:', photo.filename);
        }
      } catch (fileError) {
        console.error('Failed to delete photo file:', fileError);
        // Continue anyway - database deletion succeeded
      }
      
      res.status(204).send();
    } catch (error) {
      console.error('Photo deletion error:', error);
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

  // Tools Checklist
  app.get('/api/projects/:id/tools', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const tools = await storage.getProjectTools(projectId);
      res.json(tools);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tools' });
    }
  });

  app.post('/api/projects/:id/tools', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const toolData = {
        projectId,
        toolName: req.body.toolName,
        isCompleted: 0,
      };

      const validatedData = insertToolsChecklistSchema.parse(toolData);
      const tool = await storage.createTool(validatedData);
      res.status(201).json(tool);
    } catch (error) {
      console.error('Error creating tool:', error);
      res.status(400).json({ error: 'Failed to create tool' });
    }
  });

  app.delete('/api/tools/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTool(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Tool not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete tool' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
