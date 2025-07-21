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

      // Simple registration - for now just return success with mock user
      const token = generateToken({
        userId: 2,
        email,
        role: 'client'
      });

      const user = {
        id: 2,
        email,
        firstName,
        lastName,
        role: 'client'
      };

      res.json({ token, user });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }

      const token = authHeader.substring(7);
      const payload = verifyToken(token);
      
      if (!payload) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      // Return user data based on token
      const user = {
        id: payload.userId,
        email: payload.email,
        firstName: payload.email === 'admin@paintbrain.com' ? 'Paint' : 'Client',
        lastName: payload.email === 'admin@paintbrain.com' ? 'Brain' : 'User',
        role: payload.role
      };

      res.json(user);
    } catch (error) {
      console.error('Auth check error:', error);
      res.status(401).json({ error: 'Authentication failed' });
    }
  });

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
      // Add default difficulty if not provided (for backward compatibility)
      const projectData = {
        ...req.body,
        difficulty: req.body.difficulty || 'medium'
      };
      const validatedData = insertProjectSchema.parse(projectData);
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
      console.log('Receipt upload request for project:', projectId);
      console.log('Request file:', req.file);
      
      if (!req.file) {
        console.log('No file received in request');
        return res.status(400).json({ error: 'No receipt file provided' });
      }

      // Use OpenAI Vision to extract receipt data from the uploaded image
      let extractedData;
      try {
        // Read file from disk since we're using diskStorage
        const filePath = path.join(uploadDir, req.file.filename);
        const imageBuffer = fs.readFileSync(filePath);
        
        const { extractReceiptWithVision } = await import('./visionReceiptHandler');
        extractedData = await extractReceiptWithVision(imageBuffer, req.file.originalname);
        console.log('Vision extraction successful:', extractedData);
      } catch (visionError) {
        console.error('Vision extraction failed, using fallback:', visionError);
        // Fallback to filename-based extraction
        extractedData = {
          vendor: req.file.originalname.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' '),
          amount: 0,
          items: [],
          date: null,
          confidence: 0.1
        };
      }
      
      const receiptData = {
        projectId,
        vendor: extractedData.vendor || 'Unknown Vendor',
        amount: String(extractedData.amount || 0), // Convert to string for schema
        description: extractedData.items?.join(', ') || null,
        date: extractedData.date ? new Date(extractedData.date) : new Date(),
        filename: req.file.filename,
        originalName: req.file.originalname,
      };

      const validatedData = insertReceiptSchema.parse(receiptData);
      const receipt = await storage.createReceipt(validatedData);
      console.log('Receipt saved successfully:', receipt);
      
      // Update challenge progress after successful receipt upload
      try {
        // Get or create challenge progress
        let progress = await db
          .select()
          .from(challengeProgress)
          .where(eq(challengeProgress.projectId, projectId))
          .limit(1);

        if (progress.length === 0) {
          // Create new progress record
          const [newProgress] = await db
            .insert(challengeProgress)
            .values({
              projectId,
              receiptsUploaded: 1,
              currentStreak: 1,
              longestStreak: 1,
              totalPoints: 10,
              level: 1,
              weeklyGoal: 5,
              weeklyProgress: 1,
              lastUploadDate: new Date()
            })
            .returning();
          
          // Award first receipt achievement
          await db.insert(userAchievements).values({
            projectId,
            achievementId: 'first_receipt'
          });

          console.log('Challenge progress created:', newProgress);
          res.status(201).json({
            ...receipt,
            challengeUpdate: { 
              progress: newProgress, 
              pointsEarned: 10,
              newAchievements: ['first_receipt']
            }
          });
          return;
        }

        // Update existing progress
        const currentProgress = progress[0];
        const now = new Date();
        const lastUpload = currentProgress.lastUploadDate ? new Date(currentProgress.lastUploadDate) : null;
        
        // Calculate streak
        let newStreak = currentProgress.currentStreak || 0;
        let streakBonus = 0;
        
        if (lastUpload) {
          const daysDiff = Math.floor((now.getTime() - lastUpload.getTime()) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            newStreak += 1;
            streakBonus = 25;
          } else if (daysDiff > 1) {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }

        const basePoints = 10;
        const totalPointsEarned = basePoints + streakBonus;
        const newTotalPoints = (currentProgress.totalPoints || 0) + totalPointsEarned;
        const newLevel = Math.floor(newTotalPoints / 100) + 1;

        // Update progress
        const [updatedProgress] = await db
          .update(challengeProgress)
          .set({
            receiptsUploaded: (currentProgress.receiptsUploaded || 0) + 1,
            currentStreak: newStreak,
            longestStreak: Math.max((currentProgress.longestStreak || 0), newStreak),
            totalPoints: newTotalPoints,
            level: newLevel,
            weeklyProgress: (currentProgress.weeklyProgress || 0) + 1,
            lastUploadDate: now
          })
          .where(eq(challengeProgress.projectId, projectId))
          .returning();

        // Check for new achievements
        const newAchievements = [];
        const receiptsCount = updatedProgress.receiptsUploaded || 0;
        const currentStreak = updatedProgress.currentStreak || 0;
        
        const achievementChecks = [
          { id: 'five_receipts', condition: receiptsCount >= 5 },
          { id: 'ten_receipts', condition: receiptsCount >= 10 },
          { id: 'receipt_ninja', condition: receiptsCount >= 25 },
          { id: 'three_day_streak', condition: currentStreak >= 3 },
          { id: 'week_streak', condition: currentStreak >= 7 },
          { id: 'level_five', condition: newLevel >= 5 },
          { id: 'point_collector', condition: newTotalPoints >= 500 }
        ];

        for (const check of achievementChecks) {
          if (check.condition) {
            try {
              await db.insert(userAchievements).values({
                projectId,
                achievementId: check.id
              });
              newAchievements.push(check.id);
            } catch (error) {
              // Achievement already exists, ignore
            }
          }
        }

        console.log('Challenge progress updated:', updatedProgress);
        res.status(201).json({
          ...receipt,
          challengeUpdate: {
            progress: updatedProgress,
            pointsEarned: totalPointsEarned,
            newAchievements
          }
        });
      } catch (challengeError) {
        console.error('Challenge update error:', challengeError);
        res.status(201).json(receipt);
      }
    } catch (error) {
      console.error('Receipt creation error:', error);
      res.status(400).json({ error: 'Failed to create receipt', details: error instanceof Error ? error.message : String(error) });
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

  // Email sending routes
  app.post('/api/send-invoice-email', async (req, res) => {
    try {
      const { recipientEmail, clientName, invoiceNumber, pdfData, receiptFilenames } = req.body;
      
      if (!recipientEmail || !clientName || !invoiceNumber || !pdfData) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: recipientEmail, clientName, invoiceNumber, pdfData' 
        });
      }

      console.log('Invoice email request received:', {
        recipientEmail,
        clientName,
        invoiceNumber,
        receiptFilenames: receiptFilenames?.length || 0
      });

      // Convert base64 PDF data to buffer
      let pdfBuffer;
      try {
        pdfBuffer = Buffer.from(pdfData, 'base64');
        console.log('PDF buffer created successfully, size:', pdfBuffer.length, 'bytes');
        
        // Validate PDF header
        if (pdfBuffer.length < 4 || pdfBuffer.toString('ascii', 0, 4) !== '%PDF') {
          throw new Error('Invalid PDF data - missing PDF header');
        }
      } catch (bufferError) {
        console.error('PDF buffer creation failed:', bufferError);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid PDF data format' 
        });
      }

      // Prepare receipt attachments if any
      const receiptAttachments = [];
      if (receiptFilenames && receiptFilenames.length > 0) {
        for (const filename of receiptFilenames) {
          const receiptPath = path.join(process.cwd(), 'uploads', filename);
          if (fs.existsSync(receiptPath)) {
            receiptAttachments.push({
              filename: filename,
              path: receiptPath
            });
          }
        }
      }

      // Send email with invoice and receipt attachments
      const success = await sendInvoiceEmailWithReceipts(
        recipientEmail,
        clientName,
        invoiceNumber,
        pdfBuffer,
        receiptAttachments
      );

      if (success) {
        console.log('Invoice email sent successfully');
        res.json({ 
          success: true, 
          message: `Invoice sent to ${recipientEmail}` 
        });
      } else {
        console.log('Invoice email failed to send');
        res.status(500).json({ 
          success: false, 
          error: 'Failed to send email. Please check email configuration.' 
        });
      }
    } catch (error) {
      console.error('Invoice email error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Server error while sending email' 
      });
    }
  });

  app.post('/api/send-estimate-email', async (req, res) => {
    try {
      const { recipientEmail, clientName, estimateNumber, projectTitle, totalAmount, customMessage, pdfData } = req.body;
      
      if (!recipientEmail || !clientName || !pdfData) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: recipientEmail, clientName, pdfData' 
        });
      }

      console.log('Estimate email request received:', {
        recipientEmail,
        clientName,
        estimateNumber,
        projectTitle,
        totalAmount
      });

      // Convert base64 PDF data to buffer
      let pdfBuffer;
      try {
        pdfBuffer = Buffer.from(pdfData, 'base64');
        console.log('Estimate PDF buffer created successfully, size:', pdfBuffer.length, 'bytes');
        
        // Validate PDF header
        if (pdfBuffer.length < 4 || pdfBuffer.toString('ascii', 0, 4) !== '%PDF') {
          throw new Error('Invalid PDF data - missing PDF header');
        }
      } catch (bufferError) {
        console.error('Estimate PDF buffer creation failed:', bufferError);
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid PDF data format' 
        });
      }

      // Send estimate email with proper parameters
      const success = await sendEstimateEmail(
        recipientEmail,
        clientName,
        estimateNumber || 'EST001',
        projectTitle || 'Painting Project',
        totalAmount || '0.00',
        customMessage || '',
        pdfBuffer
      );

      if (success) {
        console.log('Estimate email sent successfully');
        res.json({ 
          success: true, 
          message: `Estimate sent to ${recipientEmail}` 
        });
      } else {
        console.log('Estimate email failed to send');
        res.status(500).json({ 
          success: false, 
          error: 'Failed to send email. Please check email configuration.' 
        });
      }
    } catch (error) {
      console.error('Estimate email error:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Server error while sending email' 
      });
    }
  });

  // Mapbox token endpoint
  app.get("/api/mapbox-token", (req, res) => {
    const token = process.env.MAPBOX_ACCESS_TOKEN || '';
    res.json({ token });
  });

  // Basic email sending route for direct client communication
  app.post('/api/send-basic-email', async (req, res) => {
    try {
      const { to, subject, text, html } = req.body;

      if (!to || !subject || !text) {
        return res.status(400).json({ error: 'Missing required fields: to, subject, and text are required' });
      }

      console.log('Basic email request received:', {
        to,
        subject,
        hasText: !!text,
        hasHtml: !!html
      });

      // Use the existing sendEmail function from email.ts
      const { sendEmail } = await import('./email');
      const emailSent = await sendEmail({
        to,
        subject,
        text,
        html: html || text.replace(/\n/g, '<br>')
      });

      if (emailSent) {
        console.log('Basic email sent successfully');
        res.json({ success: true, message: 'Email sent successfully' });
      } else {
        console.log('Basic email failed to send');
        res.status(500).json({ error: 'Failed to send email. Please check email configuration.' });
      }
    } catch (error) {
      console.error('Basic email error:', error);
      res.status(500).json({ error: 'Server error while sending email' });
    }
  });

  // Admin routes for token usage analytics
  app.get('/api/admin/token-usage/total', async (req, res) => {
    try {
      const result = await db
        .select({
          totalTokens: sql<number>`COALESCE(SUM(${tokenUsage.tokensUsed}), 0)`.as('totalTokens'),
          totalCost: sql<number>`COALESCE(SUM(${tokenUsage.cost}), 0)`.as('totalCost')
        })
        .from(tokenUsage);

      const stats = result[0] || { totalTokens: 0, totalCost: 0 };
      res.json(stats);
    } catch (error) {
      console.error('Error fetching total token usage:', error);
      res.status(500).json({ error: 'Failed to fetch token usage statistics' });
    }
  });

  app.get('/api/admin/token-usage/by-user', async (req, res) => {
    try {
      const result = await db
        .select({
          userId: tokenUsage.userId,
          email: users.email,
          totalTokens: sql<number>`COALESCE(SUM(${tokenUsage.tokensUsed}), 0)`.as('totalTokens'),
          totalCost: sql<number>`COALESCE(SUM(${tokenUsage.cost}), 0)`.as('totalCost')
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
          icon: '📄',
          unlocked: unlockedIds.includes('five_receipts'),
          progress: Math.min(stats.receiptsUploaded, 5),
          requirement: 5
        },
        {
          id: 'ten_receipts',
          title: 'Paper Trail Master',
          description: 'Upload 10 receipts',
          icon: '📊',
          unlocked: unlockedIds.includes('ten_receipts'),
          progress: Math.min(stats.receiptsUploaded, 10),
          requirement: 10
        },
        {
          id: 'three_day_streak',
          title: 'Consistency Champion',
          description: 'Upload receipts 3 days in a row',
          icon: '🔥',
          unlocked: unlockedIds.includes('three_day_streak'),
          progress: Math.min(stats.currentStreak, 3),
          requirement: 3
        },
        {
          id: 'week_streak',
          title: 'Weekly Warrior',
          description: 'Upload receipts 7 days in a row',
          icon: '⚡',
          unlocked: unlockedIds.includes('week_streak'),
          progress: Math.min(stats.currentStreak, 7),
          requirement: 7
        },
        {
          id: 'level_five',
          title: 'Level Up Master',
          description: 'Reach level 5',
          icon: '🏆',
          unlocked: unlockedIds.includes('level_five'),
          progress: Math.min((stats.totalPoints / 100), 5),
          requirement: 5
        },
        {
          id: 'point_collector',
          title: 'Point Collector',
          description: 'Earn 500 points',
          icon: '💎',
          unlocked: unlockedIds.includes('point_collector'),
          progress: Math.min(stats.totalPoints, 500),
          requirement: 500
        },
        {
          id: 'receipt_ninja',
          title: 'Receipt Ninja',
          description: 'Upload 25 receipts',
          icon: '🥷',
          unlocked: unlockedIds.includes('receipt_ninja'),
          progress: Math.min(stats.receiptsUploaded, 25),
          requirement: 25
        }
      ];

      res.json(allAchievements);
    } catch (error) {
      console.error('Error fetching achievements:', error);
      res.status(500).json({ error: 'Failed to fetch achievements' });
    }
  });

  app.post('/api/receipt-challenge/update/:projectId', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Get current progress
      let progress = await db
        .select()
        .from(challengeProgress)
        .where(eq(challengeProgress.projectId, projectId))
        .limit(1);

      if (progress.length === 0) {
        // Create new progress record
        const [newProgress] = await db
          .insert(challengeProgress)
          .values({
            projectId,
            receiptsUploaded: 1,
            currentStreak: 1,
            longestStreak: 1,
            totalPoints: 10,
            level: 1,
            weeklyGoal: 5,
            weeklyProgress: 1,
            lastUploadDate: new Date()
          })
          .returning();
        
        // Award first receipt achievement
        await db.insert(userAchievements).values({
          projectId,
          achievementId: 'first_receipt'
        });

        return res.json({ 
          progress: newProgress, 
          pointsEarned: 10,
          newAchievements: ['first_receipt']
        });
      }

      // Update existing progress
      const currentProgress = progress[0];
      const now = new Date();
      const lastUpload = currentProgress.lastUploadDate ? new Date(currentProgress.lastUploadDate) : null;
      
      // Calculate streak
      let newStreak = currentProgress.currentStreak;
      let streakBonus = 0;
      
      if (lastUpload) {
        const daysDiff = Math.floor((now.getTime() - lastUpload.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 1) {
          // Consecutive day
          newStreak += 1;
          streakBonus = 25; // Bonus for maintaining streak
        } else if (daysDiff > 1) {
          // Streak broken
          newStreak = 1;
        }
        // Same day uploads don't affect streak
      } else {
        newStreak = 1;
      }

      // Calculate points (10 base + streak bonus)
      const basePoints = 10;
      const totalPointsEarned = basePoints + streakBonus;
      const newTotalPoints = currentProgress.totalPoints + totalPointsEarned;
      const newLevel = Math.floor(newTotalPoints / 100) + 1;

      // Update progress
      const [updatedProgress] = await db
        .update(challengeProgress)
        .set({
          receiptsUploaded: currentProgress.receiptsUploaded + 1,
          currentStreak: newStreak,
          longestStreak: Math.max(currentProgress.longestStreak, newStreak),
          totalPoints: newTotalPoints,
          level: newLevel,
          weeklyProgress: currentProgress.weeklyProgress + 1,
          lastUploadDate: now
        })
        .where(eq(challengeProgress.projectId, projectId))
        .returning();

      // Check for new achievements
      const newAchievements = [];
      const receiptsCount = updatedProgress.receiptsUploaded;
      const currentStreak = updatedProgress.currentStreak;
      
      const achievementChecks = [
        { id: 'five_receipts', condition: receiptsCount >= 5 },
        { id: 'ten_receipts', condition: receiptsCount >= 10 },
        { id: 'receipt_ninja', condition: receiptsCount >= 25 },
        { id: 'three_day_streak', condition: currentStreak >= 3 },
        { id: 'week_streak', condition: currentStreak >= 7 },
        { id: 'level_five', condition: newLevel >= 5 },
        { id: 'point_collector', condition: newTotalPoints >= 500 }
      ];

      for (const check of achievementChecks) {
        if (check.condition) {
          try {
            const [achievement] = await db.insert(userAchievements).values({
              projectId,
              achievementId: check.id
            }).returning();
            if (achievement) {
              newAchievements.push(check.id);
            }
          } catch (error) {
            // Achievement already exists, ignore
          }
        }
      }

      res.json({
        progress: updatedProgress,
        pointsEarned: totalPointsEarned,
        newAchievements
      });
    } catch (error) {
      console.error('Error updating challenge progress:', error);
      res.status(500).json({ error: 'Failed to update challenge progress' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
