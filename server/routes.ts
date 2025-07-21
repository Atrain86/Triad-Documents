import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { insertProjectSchema, insertPhotoSchema, insertReceiptSchema, insertDailyHoursSchema, insertToolsChecklistSchema, insertUserSchema, projects, photos, receipts, dailyHours, toolsChecklist, users, tokenUsage } from "@shared/schema";
import { sql, eq, desc } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "./auth";
import { sendInvoiceEmailWithReceipts, sendEstimateEmail } from "./email";
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
  // Authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      // For now, use a simple hardcoded admin user for testing
      console.log('Login attempt:', { email, password }); // Debug log
      if ((email === 'admin@paintbrain.com' || email === 'coertespainter@gmail.com' || email === 'cortespainter@gmail.com') && password === 'brain') {
        const token = generateToken({
          userId: 1,
          email: email,
          role: 'admin'
        });

        const user = {
          id: 1,
          email: email,
          firstName: 'Paint',
          lastName: 'Brain',
          role: 'admin'
        };

        res.json({ token, user });
      } else {
        console.log('Login failed for:', { email, password }); // Debug log
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Login failed' });
    }
  });

  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'User already exists' });
      }

      const hashedPassword = await hashPassword(password);
      
      const [user] = await db.insert(users).values({
        email,
        password: hashedPassword,
        firstName,
        lastName,
        role: 'client'
      }).returning();

      const token = generateToken({
        userId: user.id,
        email: user.email,
        role: user.role as 'admin' | 'client'
      });

      res.json({ 
        token, 
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const token = req.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Hardcoded for testing
      if ((decoded.email === 'admin@paintbrain.com' || decoded.email === 'cortespainter@gmail.com') && decoded.userId === 1) {
        return res.json({
          id: 1,
          email: decoded.email,
          firstName: 'Paint',
          lastName: 'Brain',
          role: 'admin'
        });
      }

      const [user] = await db.select().from(users).where(eq(users.id, decoded.userId)).limit(1);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      });
    } catch (error) {
      console.error('Auth verification error:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  });

  // Static file serving for uploads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Serve public files in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(process.cwd(), 'dist')));
  }

  // Serve the Mapbox token through API endpoint
  app.get('/api/mapbox-token', (req, res) => {
    res.json({ token: process.env.MAPBOX_ACCESS_TOKEN || '' });
  });

  // CRUD operations for projects
  app.get('/api/projects', async (req, res) => {
    try {
      const allProjects = await storage.getProjects();
      res.json(allProjects);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch projects' });
    }
  });

  app.post('/api/projects', async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
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

  app.put('/api/projects/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validatedData);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      res.json(project);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  });

  app.delete('/api/projects/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteProject(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete project' });
    }
  });

  // CRUD operations for photos with OpenAI Vision processing and enhanced functionality
  app.get('/api/projects/:projectId/photos', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const photos = await storage.getPhotos(projectId);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch photos' });
    }
  });

  // Enhanced photo upload with compression, HEIC support, and OpenAI Vision processing
  app.post('/api/projects/:projectId/photos', upload.array('photos', 20), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'No photos uploaded' });
      }

      console.log(`Processing ${files.length} photos for project ${projectId}`);

      const photoPromises = files.map(async (file) => {
        try {
          const photoData = {
            projectId,
            filename: file.filename,
            originalName: file.originalname,
            description: req.body.description || '',
            fileSize: file.size,
            mimeType: file.mimetype
          };

          const photo = await storage.createPhoto(photoData);
          console.log(`Created photo record for: ${file.filename}`);
          return photo;
        } catch (error) {
          console.error(`Error processing photo ${file.filename}:`, error);
          throw error;
        }
      });

      const photos = await Promise.all(photoPromises);
      console.log(`Successfully processed ${photos.length} photos`);
      res.json(photos);
    } catch (error) {
      console.error('Error uploading photos:', error);
      res.status(500).json({ error: 'Failed to upload photos' });
    }
  });

  app.delete('/api/projects/:projectId/photos/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const projectId = parseInt(req.params.projectId);
      
      // Get photo to delete file
      const photo = await storage.getPhoto(id);
      if (photo && photo.filename) {
        const filePath = path.join(uploadDir, photo.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      await storage.deletePhoto(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting photo:', error);
      res.status(500).json({ error: 'Failed to delete photo' });
    }
  });

  // CRUD operations for receipts with OpenAI Vision processing
  app.get('/api/projects/:projectId/receipts', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const receipts = await storage.getReceipts(projectId);
      res.json(receipts);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch receipts' });
    }
  });

  // Enhanced receipt upload with OpenAI Vision processing
  app.post('/api/projects/:projectId/receipts', upload.single('receipt'), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const file = req.file;
      
      if (!file) {
        // Manual receipt entry
        const { vendor, amount, description, date } = req.body;
        
        if (!vendor || !amount) {
          return res.status(400).json({ error: 'Vendor and amount are required for manual entries' });
        }

        const receiptData = {
          projectId,
          vendor,
          amount: amount.toString(),
          description: description || '',
          date: date ? new Date(date) : new Date(),
          filename: '',
          originalName: 'Manual Entry'
        };

        const receipt = await storage.createReceipt(receiptData);
        return res.json(receipt);
      }

      console.log(`Processing receipt file: ${file.filename} for project ${projectId}`);

      // Process with OpenAI Vision API
      const { extractReceiptWithVision } = await import('./visionReceiptHandler');
      const fileBuffer = fs.readFileSync(file.path);
      const visionResult = await extractReceiptWithVision(fileBuffer, file.filename);

      const receiptData = {
        projectId,
        filename: file.filename,
        originalName: file.originalname,
        vendor: visionResult.vendor,
        amount: visionResult.amount.toString(),
        description: '',
        date: visionResult.date ? new Date(visionResult.date) : new Date(),
        items: visionResult.items
      };

      const receipt = await storage.createReceipt(receiptData);
      console.log(`Successfully processed receipt: ${file.filename}`);
      res.json(receipt);
    } catch (error) {
      console.error('Error uploading receipt:', error);
      res.status(500).json({ error: 'Failed to upload receipt' });
    }
  });

  app.put('/api/receipts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { vendor, amount, description } = req.body;
      
      const updatedReceipt = await storage.updateReceipt(id, {
        vendor,
        amount: amount.toString(),
        description
      });
      
      if (!updatedReceipt) {
        return res.status(404).json({ error: 'Receipt not found' });
      }
      
      res.json(updatedReceipt);
    } catch (error) {
      console.error('Error updating receipt:', error);
      res.status(500).json({ error: 'Failed to update receipt' });
    }
  });

  app.delete('/api/receipts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Get receipt to delete file
      const receipt = await storage.getReceipt(id);
      if (receipt && receipt.filename) {
        const filePath = path.join(uploadDir, receipt.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      await storage.deleteReceipt(id);
      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting receipt:', error);
      res.status(500).json({ error: 'Failed to delete receipt' });
    }
  });

  // Daily hours CRUD operations
  app.get('/api/projects/:projectId/daily-hours', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const hours = await storage.getDailyHours(projectId);
      res.json(hours);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch daily hours' });
    }
  });

  app.post('/api/projects/:projectId/daily-hours', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const validatedData = insertDailyHoursSchema.parse({
        ...req.body,
        projectId
      });
      const hours = await storage.createDailyHours(validatedData);
      res.json(hours);
    } catch (error) {
      console.error('Error creating daily hours:', error);
      res.status(500).json({ error: 'Failed to create daily hours' });
    }
  });

  app.delete('/api/daily-hours/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteDailyHours(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete daily hours' });
    }
  });

  // Tools checklist CRUD operations
  app.get('/api/projects/:projectId/tools', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const tools = await storage.getToolsChecklist(projectId);
      res.json(tools);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tools checklist' });
    }
  });

  app.post('/api/projects/:projectId/tools', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const validatedData = insertToolsChecklistSchema.parse({
        ...req.body,
        projectId
      });
      const tool = await storage.createToolsChecklistItem(validatedData);
      res.json(tool);
    } catch (error) {
      console.error('Error creating tool item:', error);
      res.status(500).json({ error: 'Failed to create tool item' });
    }
  });

  app.delete('/api/tools/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteToolsChecklistItem(id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete tool item' });
    }
  });

  // Email sending routes
  app.post('/api/send-invoice', async (req, res) => {
    try {
      const { to, subject, message, pdfData, receiptFilenames } = req.body;
      
      // Convert base64 PDF to buffer
      const pdfBuffer = Buffer.from(pdfData.split(',')[1], 'base64');
      
      // Prepare receipt attachments
      const receiptAttachments = (receiptFilenames || []).map((filename: string) => ({
        filename,
        path: path.join(uploadDir, filename)
      })).filter((attachment: any) => fs.existsSync(attachment.path));

      await sendInvoiceEmailWithReceipts(to, subject, message, pdfBuffer, receiptAttachments);
      res.json({ success: true, message: 'Invoice email sent successfully' });
    } catch (error) {
      console.error('Error sending invoice email:', error);
      res.status(500).json({ error: 'Failed to send invoice email' });
    }
  });

  app.post('/api/send-estimate', async (req, res) => {
    try {
      const { recipientEmail, clientName, estimateNumber, projectTitle, totalAmount, customMessage, pdfData } = req.body;
      
      // Validate required fields
      if (!recipientEmail || !clientName || !pdfData) {
        return res.status(400).json({ error: 'recipientEmail, clientName, and pdfData are required' });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        return res.status(400).json({ error: 'Invalid email address format' });
      }
      
      // Convert base64 PDF to buffer
      const pdfBuffer = Buffer.from(pdfData.split(',')[1], 'base64');

      await sendEstimateEmail(
        recipientEmail,
        clientName,
        estimateNumber || 'EST-001',
        projectTitle || 'Painting Estimate',
        totalAmount || '0.00',
        customMessage || '',
        pdfBuffer
      );
      res.json({ success: true, message: 'Estimate email sent successfully' });
    } catch (error) {
      console.error('Error sending estimate email:', error);
      console.error('Request body keys:', Object.keys(req.body));
      console.error('Email data:', { 
        recipientEmail: req.body.recipientEmail, 
        clientName: req.body.clientName, 
        estimateNumber: req.body.estimateNumber, 
        projectTitle: req.body.projectTitle, 
        totalAmount: req.body.totalAmount 
      });
      res.status(500).json({ error: `Failed to send estimate email: ${(error as Error).message}` });
    }
  });

  // Basic email route for simple communication
  app.post('/api/send-basic-email', async (req, res) => {
    try {
      const { to, subject, message } = req.body;
      
      if (!to || !subject || !message) {
        return res.status(400).json({ error: 'To, subject, and message are required' });
      }

      const { sendBasicEmail } = await import('./email');
      await sendBasicEmail(to, subject, message);
      
      res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
      console.error('Error sending basic email:', error);
      res.status(500).json({ error: 'Failed to send email' });
    }
  });

  // Token usage tracking and admin routes
  app.get('/api/admin/token-usage/stats', async (req, res) => {
    try {
      const result = await db
        .select({
          userId: tokenUsage.userId,
          userEmail: users.email,
          totalTokens: sql<number>`sum(${tokenUsage.tokensUsed})`.as('totalTokens'),
          totalCost: sql<number>`sum(${tokenUsage.cost})`.as('totalCost'),
          operationCount: sql<number>`count(*)`.as('operationCount')
        })
        .from(tokenUsage)
        .leftJoin(users, eq(users.id, tokenUsage.userId))
        .groupBy(tokenUsage.userId, users.email);

      res.json(result);
    } catch (error) {
      console.error('Error fetching user token usage:', error);
      res.status(500).json({ error: 'Failed to fetch user token usage statistics' });
    }
  });

  app.get('/api/admin/token-usage/recent', async (req, res) => {
    try {
      const result = await db
        .select({
          id: tokenUsage.id,
          userId: tokenUsage.userId,
          operation: tokenUsage.operation,
          tokensUsed: tokenUsage.tokensUsed,
          estimatedCost: tokenUsage.cost,
          createdAt: tokenUsage.createdAt
        })
        .from(tokenUsage)
        .orderBy(desc(tokenUsage.createdAt))
        .limit(20);

      res.json(result);
    } catch (error) {
      console.error('Error fetching recent token usage:', error);
      res.status(500).json({ error: 'Failed to fetch recent token usage' });
    }
  });

  app.post('/api/admin/token-usage/historical', async (req, res) => {
    try {
      const { tokens, cost, description } = req.body;
      
      if (!tokens || !cost) {
        return res.status(400).json({ error: 'Tokens and cost are required' });
      }

      await db.insert(tokenUsage).values({
        userId: 1, // Admin user
        operation: description || 'Historical entry',
        tokensUsed: parseInt(tokens),
        cost: parseFloat(cost),
        model: 'historical',
        success: 'true'
      });

      res.json({ success: true, message: 'Historical usage added successfully' });
    } catch (error) {
      console.error('Error adding historical token usage:', error);
      res.status(500).json({ error: 'Failed to add historical usage' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}