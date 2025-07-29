import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { insertProjectSchema, insertPhotoSchema, insertReceiptSchema, insertDailyHoursSchema, updateDailyHoursSchema, insertToolsChecklistSchema, insertUserSchema, projects, photos, receipts, dailyHours, toolsChecklist, users, tokenUsage } from "@shared/schema";
import { sql, eq, desc } from "drizzle-orm";
import { hashPassword, verifyPassword, generateToken, verifyToken } from "./auth";
import { sendInvoiceEmailWithReceipts, sendEstimateEmail } from "./email";
import { gmailAuthService } from "./gmailAuth";
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

// Helper function to extract vendor name from filename
function extractVendorFromFilename(filename: string): string {
  const name = path.parse(filename).name;
  
  // Remove timestamps and random numbers, keep only the business name
  let cleaned = name.replace(/^\d{13}-\d+/, '') // Remove timestamp prefix like "1753495988478-369320617"
                   .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
                   .replace(/\d{4,}/g, '') // Remove long number sequences (store IDs, etc.)
                   .replace(/\b(receipt|invoice|bill|pdf|doc|txt)\b/gi, '') // Remove common receipt words
                   .replace(/\s+/g, ' ') // Clean up multiple spaces
                   .trim();
  
  // If we get an empty string or very short result, extract from original filename
  if (!cleaned || cleaned.length < 2) {
    // Try to extract meaningful text from original filename (e.g., "cloverdale_receipt.pdf" → "Cloverdale")
    cleaned = filename.replace(/\.[^/.]+$/, '') // Remove extension
                    .replace(/[-_]/g, ' ') // Replace separators with spaces
                    .replace(/\b(receipt|invoice|bill|scan|document)\b/gi, '') // Remove receipt-related words
                    .replace(/\d+/g, '') // Remove all numbers
                    .replace(/\s+/g, ' ') // Clean up spaces
                    .trim();
    
    // If still empty, use descriptive fallback
    if (!cleaned || cleaned.length < 2) {
      const ext = path.extname(filename).toLowerCase();
      if (ext === '.pdf') cleaned = 'PDF Receipt';
      else if (['.doc', '.docx'].includes(ext)) cleaned = 'Document';
      else if (['.txt'].includes(ext)) cleaned = 'Text File';
      else cleaned = 'Unknown Vendor';
    }
  }
  
  // Capitalize properly for business names (e.g., "cloverdale" → "Cloverdale")
  return cleaned.replace(/\b\w/g, l => l.toUpperCase()).replace(/\s+/g, ' ').trim();
}

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
      // Ensure difficulty has a default value if not provided
      const dataWithDefaults = {
        ...req.body,
        difficulty: req.body.difficulty || "medium"
      };
      const validatedData = insertProjectSchema.parse(dataWithDefaults);
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
      const userId = 1; // Default user ID for tracking
      
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

      let receiptData;
      
      // Check if file is an image (for Vision API processing)
      const isImage = file.mimetype.startsWith('image/') || 
                     file.originalname.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp|heic|heif)$/);
      
      // Check if file is a PDF that we can process
      const isPdf = file.mimetype === 'application/pdf' || 
                   file.originalname.toLowerCase().endsWith('.pdf');
      
      if (isImage) {
        // Process with OpenAI Vision API for images
        try {
          console.log(`Processing image receipt with Vision API: ${file.originalname}`);
          const { extractReceiptWithVision } = await import('./visionReceiptHandler');
          const fileBuffer = fs.readFileSync(file.path);
          const visionResult = await extractReceiptWithVision(fileBuffer, file.originalname, userId);

          receiptData = {
            projectId,
            filename: file.filename,
            originalName: file.originalname,
            vendor: visionResult.vendor,
            amount: visionResult.amount.toString(),
            description: '',
            date: visionResult.date ? new Date(visionResult.date) : new Date(),
            items: visionResult.items,
            ocrMethod: 'openai_vision',
            confidence: visionResult.confidence
          };
        } catch (visionError) {
          console.log('Vision API failed, using filename fallback:', visionError);
          // Fallback to filename parsing for images if Vision API fails
          receiptData = {
            projectId,
            filename: file.filename,
            originalName: file.originalname,
            vendor: extractVendorFromFilename(file.originalname),
            amount: '0',
            description: `File upload: ${file.originalname}`,
            date: new Date(),
            items: [],
            ocrMethod: 'filename_fallback',
            confidence: 0.3
          };
        }
      } else if (isPdf) {
        // For PDF files, convert first page to image and process with Vision API
        try {
          console.log(`Processing PDF receipt with Vision API: ${file.originalname}`);
          const { extractReceiptFromPdf } = await import('./visionReceiptHandler');
          const fileBuffer = fs.readFileSync(file.path);
          const visionResult = await extractReceiptFromPdf(fileBuffer, file.originalname, userId);

          receiptData = {
            projectId,
            filename: file.filename,
            originalName: file.originalname,
            vendor: visionResult.vendor,
            amount: visionResult.amount.toString(),
            description: '',
            date: visionResult.date ? new Date(visionResult.date) : new Date(),
            items: visionResult.items,
            ocrMethod: 'openai_vision_pdf',
            confidence: visionResult.confidence
          };
        } catch (pdfError) {
          console.log('PDF Vision processing failed, using filename fallback:', pdfError);
          // Fallback to filename parsing for PDFs if Vision API fails
          receiptData = {
            projectId,
            filename: file.filename,
            originalName: file.originalname,
            vendor: extractVendorFromFilename(file.originalname),
            amount: '0',
            description: `PDF requires manual data entry: ${file.originalname}`,
            date: new Date(),
            items: [],
            ocrMethod: 'pdf_fallback',
            confidence: 0.2
          };
        }
      } else {
        // For other non-image files (DOC, etc.), use filename parsing
        console.log(`Non-image/PDF file detected: ${file.mimetype}, using filename parsing`);
        receiptData = {
          projectId,
          filename: file.filename,
          originalName: file.originalname,
          vendor: extractVendorFromFilename(file.originalname),
          amount: '0',
          description: `File upload: ${file.originalname}`,
          date: new Date(),
          items: [],
          ocrMethod: 'filename_only',
          confidence: 0.2
        };
      }

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

  app.put('/api/daily-hours/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = updateDailyHoursSchema.parse(req.body);
      const updatedHours = await storage.updateDailyHours(id, validatedData);
      res.json(updatedHours);
    } catch (error) {
      console.error('Error updating daily hours:', error);
      res.status(500).json({ error: 'Failed to update daily hours' });
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

  app.post('/api/send-estimate-email', async (req, res) => {
    try {
      const { recipientEmail, clientName, estimateNumber, projectTitle, totalAmount, customMessage, pdfData } = req.body;
      
      // Debug: Log what we received
      console.log('Received estimate request:');
      console.log('- recipientEmail:', recipientEmail);
      console.log('- clientName:', clientName);
      console.log('- pdfData type:', typeof pdfData);
      console.log('- pdfData length:', pdfData ? pdfData.length : 'undefined');

      // Validate required fields
      if (!recipientEmail || !clientName) {
        return res.status(400).json({ error: 'recipientEmail and clientName are required' });
      }
      
      if (!pdfData || typeof pdfData !== 'string') {
        return res.status(400).json({ error: 'PDF data must be provided as base64 string' });
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(recipientEmail)) {
        return res.status(400).json({ error: 'Invalid email address format' });
      }

      // Convert base64 PDF to buffer
      const base64Data = pdfData.includes(',') ? pdfData.split(',')[1] : pdfData;
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      console.log('Successfully created PDF buffer, size:', pdfBuffer.length, 'bytes');

      // Send estimate email with PDF buffer
      try {
        const { sendEstimateEmail } = await import('./email');
        
        const emailSent = await sendEstimateEmail(
          recipientEmail,
          clientName,
          estimateNumber || 'EST-001',
          projectTitle || 'Painting Estimate',
          totalAmount || '0.00',
          customMessage || '',
          pdfBuffer
        );
        
        if (emailSent) {
          res.json({ success: true, message: 'Estimate email sent successfully' });
        } else {
          // Fallback to basic email without attachments
          const { sendBasicEmail } = await import('./email');
          const fallbackMessage = `Hi ${clientName},\n\nPlease find your estimate for ${projectTitle || 'your painting project'}.\n\nTotal Estimate: $${totalAmount || '0.00'}\n\nI'll send the PDF separately due to email size limits.\n\nBest regards,\nA-Frame Painting\ncortespainter@gmail.com`;
          
          const fallbackSent = await sendBasicEmail(recipientEmail, `Your Painting Estimate from A-Frame Painting`, fallbackMessage);
          
          if (fallbackSent) {
            res.json({ success: true, message: 'Estimate sent successfully (without PDF attachment due to size)' });
          } else {
            res.status(500).json({ error: 'Failed to send email via both methods' });
          }
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        res.status(500).json({ error: `Email service error: ${(emailError as Error).message}` });
      }
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

  // Invoice email route with PDF attachment
  app.post('/api/send-invoice-email', async (req, res) => {
    try {
      const { recipientEmail, clientName, invoiceNumber, pdfData, receiptFilenames, customMessage } = req.body;
      
      console.log('Invoice email request received:', {
        recipientEmail,
        clientName,
        invoiceNumber,
        hasPdfData: !!pdfData,
        pdfDataLength: pdfData?.length || 0,
        receiptCount: receiptFilenames?.length || 0,
        hasCustomMessage: !!customMessage
      });
      
      if (!recipientEmail || !clientName || !invoiceNumber || !pdfData) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required fields: recipientEmail, clientName, invoiceNumber, pdfData' 
        });
      }

      // Validate PDF data size (limit to reasonable size)
      if (pdfData.length > 50 * 1024 * 1024) { // 50MB limit
        return res.status(400).json({ 
          success: false, 
          error: 'PDF data too large. Please reduce PDF size.' 
        });
      }

      // Convert base64 PDF to buffer
      const base64Data = pdfData.includes(',') ? pdfData.split(',')[1] : pdfData;
      const pdfBuffer = Buffer.from(base64Data, 'base64');
      console.log('PDF buffer created, size:', pdfBuffer.length, 'bytes');

      // Validate PDF buffer size
      if (pdfBuffer.length === 0) {
        return res.status(400).json({ 
          success: false, 
          error: 'Invalid PDF data - empty buffer' 
        });
      }

      // Prepare receipt attachments
      const receiptAttachments = (receiptFilenames || []).map((filename: string) => ({
        filename,
        path: path.join(uploadDir, filename)
      })).filter((attachment: any) => fs.existsSync(attachment.path));

      console.log('Receipt attachments prepared:', receiptAttachments.length);

      // Send email with PDF and receipt attachments
      try {
        const { sendInvoiceEmailWithReceipts } = await import('./email');
        
        const emailSent = await sendInvoiceEmailWithReceipts(recipientEmail, clientName, invoiceNumber, pdfBuffer, receiptAttachments, customMessage);
        
        if (emailSent) {
          console.log('Invoice email sent successfully to:', recipientEmail);
          res.json({ success: true, message: 'Invoice email sent successfully' });
        } else {
          console.log('Invoice email failed to send via primary method, trying fallback...');
          
          // Fallback to basic email without attachments
          const { sendBasicEmail } = await import('./email');
          const fallbackMessage = `Hi ${clientName},\n\nPlease find your invoice for project #${invoiceNumber}.\n\nI'll send the PDF separately due to email size limits.\n\nBest regards,\nA-Frame Painting\ncortespainter@gmail.com`;
          
          const fallbackSent = await sendBasicEmail(recipientEmail, `Invoice #${invoiceNumber} from A-Frame Painting`, fallbackMessage);
          
          if (fallbackSent) {
            res.json({ success: true, message: 'Email sent successfully (without attachments due to size)' });
          } else {
            res.status(500).json({ success: false, error: 'Failed to send email via both methods' });
          }
        }
      } catch (emailError) {
        console.error('Email sending error:', emailError);
        res.status(500).json({ 
          success: false, 
          error: `Email service error: ${(emailError as Error).message}` 
        });
      }
      
    } catch (error) {
      console.error('Error sending invoice email:', error);
      res.status(500).json({ 
        success: false, 
        error: `Failed to send invoice email: ${(error as Error).message}` 
      });
    }
  });

  // Test OpenAI operations for comprehensive tracking (simulate real usage patterns)
  app.post('/api/test/openai/text-generation', async (req, res) => {
    try {
      const { prompt, userId = 1 } = req.body;
      const { trackedOpenAI } = await import('./openaiWithTracking');
      
      const response = await trackedOpenAI.chatCompletions({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a helpful assistant for painting contractors." },
          { role: "user", content: prompt || "Generate a professional estimate description for interior house painting." }
        ],
        max_tokens: 200,
        temperature: 0.7
      }, {
        userId,
        operation: 'text_generation',
        description: 'AI-powered text generation for estimates/quotes'
      });

      res.json({ 
        success: true, 
        content: response.choices[0].message.content,
        usage: response.usage 
      });
    } catch (error) {
      console.error('Text generation test failed:', error);
      res.status(500).json({ error: 'Text generation failed' });
    }
  });

  app.post('/api/test/openai/code-analysis', async (req, res) => {
    try {
      const { code, userId = 1 } = req.body;
      const { trackedOpenAI } = await import('./openaiWithTracking');
      
      const response = await trackedOpenAI.chatCompletions({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a code analysis assistant. Analyze the provided code and suggest improvements." },
          { role: "user", content: code || "function calculateEstimate(rooms, difficulty) { return rooms * 100 * difficulty; }" }
        ],
        max_tokens: 300,
        temperature: 0.3
      }, {
        userId,
        operation: 'code_analysis',
        description: 'AI code review and optimization suggestions'
      });

      res.json({ 
        success: true, 
        analysis: response.choices[0].message.content,
        usage: response.usage 
      });
    } catch (error) {
      console.error('Code analysis test failed:', error);
      res.status(500).json({ error: 'Code analysis failed' });
    }
  });

  app.post('/api/test/openai/debugging-help', async (req, res) => {
    try {
      const { errorMessage, userId = 1 } = req.body;
      const { trackedOpenAI } = await import('./openaiWithTracking');
      
      const response = await trackedOpenAI.chatCompletions({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a debugging assistant. Help solve coding errors with clear explanations." },
          { role: "user", content: errorMessage || "React error: Cannot read property 'map' of undefined in component rendering." }
        ],
        max_tokens: 400,
        temperature: 0.2
      }, {
        userId,
        operation: 'debugging_assistance',
        description: 'AI debugging and error resolution'
      });

      res.json({ 
        success: true, 
        solution: response.choices[0].message.content,
        usage: response.usage 
      });
    } catch (error) {
      console.error('Debugging assistance test failed:', error);
      res.status(500).json({ error: 'Debugging assistance failed' });
    }
  });

  // Token usage tracking and admin routes
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

  // Gmail OAuth2 Routes - Only triggered manually
  app.get('/api/gmail/auth/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const authUrl = gmailAuthService.generateAuthUrl(userId);
      res.redirect(authUrl);
    } catch (error) {
      console.error('Error generating Gmail auth URL:', error);
      res.status(500).json({ error: 'Failed to generate Gmail authentication URL' });
    }
  });


  app.get('/api/gmail/callback', async (req, res) => {
    try {
      const { code, state: userId, error } = req.query;
      
      console.log('Gmail OAuth callback received:', { 
        hasCode: !!code, 
        userId, 
        error,
        fullQuery: req.query 
      });

      if (error) {
        console.error('OAuth error from Google:', error);
        return res.status(400).send(`❌ OAuth Error: ${error}`);
      }

      if (!code || !userId) {
        console.error('Missing required OAuth parameters:', { code: !!code, userId });
        return res.status(400).send('❌ Missing authorization code or user ID');
      }

      const result = await gmailAuthService.handleCallback(code as string, userId as string);

      if (result.success) {
        res.send(`
          <html>
            <head><title>Gmail Connected</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #4CAF50;">✅ Gmail Connected Successfully!</h2>
              <p>Your Gmail account <strong>${result.email}</strong> has been connected.</p>
              <p>You can now close this window and return to the app.</p>
              <script>
                setTimeout(() => {
                  window.close();
                }, 3000);
              </script>
            </body>
          </html>
        `);
      } else {
        console.error('OAuth callback failed with error:', result.error);
        res.status(400).send(`
          <html>
            <head><title>Gmail Connection Failed</title></head>
            <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
              <h2 style="color: #f44336;">❌ Gmail Connection Failed</h2>
              <p><strong>Error:</strong> ${result.error}</p>
              <div style="background: #f5f5f5; padding: 15px; margin: 20px 0; border-radius: 5px; text-align: left;">
                <h3>Possible Solutions:</h3>
                <ul>
                  <li>Check if your Gmail account is added as a test user in Google Cloud Console</li>
                  <li>Verify OAuth consent screen is configured properly</li>
                  <li>Try connecting with a different Gmail account</li>
                  <li>Contact administrator if issue persists</li>
                </ul>
              </div>
              <p>You can close this window and try again.</p>
            </body>
          </html>
        `);
      }
    } catch (error) {
      console.error('Gmail OAuth callback error:', error);
      res.status(500).send('❌ Gmail authentication failed');
    }
  });

  app.get('/api/gmail/status/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const isConnected = await gmailAuthService.isGmailConnected(parseInt(userId));
      
      if (isConnected) {
        const [user] = await db.select({ gmailEmail: users.gmailEmail })
          .from(users)
          .where(eq(users.id, parseInt(userId)));
        
        res.json({ connected: true, gmailAddress: user?.gmailEmail });
      } else {
        res.json({ connected: false });
      }
    } catch (error) {
      console.error('Error checking Gmail status:', error);
      res.json({ connected: false });
    }
  });

  app.post('/api/gmail/send', async (req, res) => {
    try {
      const { userId, to, subject, message, htmlMessage, attachments } = req.body;

      if (!userId || !to || !subject || !message) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const result = await gmailAuthService.sendEmail(parseInt(userId), {
        to,
        subject,
        message,
        htmlMessage,
        attachments
      });

      if (result.success) {
        res.json({ success: true, messageId: result.messageId });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error('Error sending Gmail:', error);
      res.status(500).json({ error: 'Failed to send email via Gmail' });
    }
  });

  app.delete('/api/gmail/disconnect/:userId', async (req, res) => {
    try {
      const { userId } = req.params;
      const success = await gmailAuthService.disconnectGmail(parseInt(userId));
      
      if (success) {
        res.json({ success: true });
      } else {
        res.status(500).json({ error: 'Failed to disconnect Gmail' });
      }
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      res.status(500).json({ error: 'Failed to disconnect Gmail' });
    }
  });

  // Logo upload and management routes
  app.post('/api/users/:userId/logo', upload.single('logo'), async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const logoFile = req.file;

      if (!logoFile) {
        return res.status(400).json({ error: 'No logo file provided' });
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
      if (!allowedTypes.includes(logoFile.mimetype)) {
        fs.unlinkSync(logoFile.path); // Delete uploaded file
        return res.status(400).json({ error: 'Invalid file type. Only JPG, PNG, and SVG files are allowed.' });
      }

      // Validate file size (5MB max)
      if (logoFile.size > 5 * 1024 * 1024) {
        fs.unlinkSync(logoFile.path); // Delete uploaded file
        return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
      }

      // Check if user already has a logo and delete it
      const [existingUser] = await db.select({ logoUrl: users.logoUrl })
        .from(users)
        .where(eq(users.id, userId));

      if (existingUser?.logoUrl) {
        const oldLogoPath = path.join(process.cwd(), existingUser.logoUrl);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      const logoUrl = `uploads/${logoFile.filename}`;

      // Update user with new logo information
      await db.update(users)
        .set({
          logoUrl,
          logoOriginalName: logoFile.originalname,
          logoUploadedAt: new Date()
        })
        .where(eq(users.id, userId));

      res.json({
        success: true,
        logoUrl,
        originalName: logoFile.originalname
      });
    } catch (error) {
      console.error('Logo upload error:', error);
      // Clean up uploaded file if there was an error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  });

  app.get('/api/users/:userId/logo', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      const [user] = await db.select({
        logoUrl: users.logoUrl,
        logoOriginalName: users.logoOriginalName,
        logoUploadedAt: users.logoUploadedAt
      })
      .from(users)
      .where(eq(users.id, userId));

      if (!user?.logoUrl) {
        return res.json({ logo: null });
      }

      res.json({
        logo: {
          url: user.logoUrl,
          originalName: user.logoOriginalName,
          uploadedAt: user.logoUploadedAt
        }
      });
    } catch (error) {
      console.error('Error fetching user logo:', error);
      res.status(500).json({ error: 'Failed to fetch logo' });
    }
  });

  app.delete('/api/users/:userId/logo', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      // Get current logo info
      const [user] = await db.select({ logoUrl: users.logoUrl })
        .from(users)
        .where(eq(users.id, userId));

      if (user?.logoUrl) {
        // Delete the logo file
        const logoPath = path.join(process.cwd(), user.logoUrl);
        if (fs.existsSync(logoPath)) {
          fs.unlinkSync(logoPath);
        }

        // Update database to remove logo references
        await db.update(users)
          .set({
            logoUrl: null,
            logoOriginalName: null,
            logoUploadedAt: null
          })
          .where(eq(users.id, userId));
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error removing logo:', error);
      res.status(500).json({ error: 'Failed to remove logo' });
    }
  });

  app.post('/api/users/:userId/logo/demo', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const { demoLogoPath } = req.body;

      if (!demoLogoPath) {
        return res.status(400).json({ error: 'Demo logo path is required' });
      }

      // Validate that user is admin (you may want to add proper role checking)
      const [user] = await db.select({ role: users.role })
        .from(users)
        .where(eq(users.id, userId));

      if (user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required for demo logos' });
      }

      // Remove existing logo if any
      const [existingUser] = await db.select({ logoUrl: users.logoUrl })
        .from(users)
        .where(eq(users.id, userId));

      if (existingUser?.logoUrl && !existingUser.logoUrl.startsWith('demo-logos/')) {
        const oldLogoPath = path.join(process.cwd(), existingUser.logoUrl);
        if (fs.existsSync(oldLogoPath)) {
          fs.unlinkSync(oldLogoPath);
        }
      }

      // Set demo logo
      await db.update(users)
        .set({
          logoUrl: demoLogoPath,
          logoOriginalName: path.basename(demoLogoPath),
          logoUploadedAt: new Date()
        })
        .where(eq(users.id, userId));

      res.json({
        success: true,
        logoUrl: demoLogoPath
      });
    } catch (error) {
      console.error('Error setting demo logo:', error);
      res.status(500).json({ error: 'Failed to set demo logo' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}