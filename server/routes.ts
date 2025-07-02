import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertPhotoSchema, insertReceiptSchema, insertDailyHoursSchema, insertToolsChecklistSchema, insertEstimateSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import sgMail from "@sendgrid/mail";
import nodemailer from "nodemailer";
import { sendInvoiceEmail, sendInvoiceEmailWithReceipts, sendEstimateEmail, sendEmail } from "./email";
import { extractReceiptDataWithOpenAI, parseReceiptText, type ReceiptData } from "./openai";
import { extractReceiptWithVision, extractReceiptFallback, type VisionReceiptData } from "./visionReceiptHandler";

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
      } else if (ext === '.pdf') {
        res.setHeader('Content-Type', 'application/pdf');
      } else if (ext === '.txt') {
        res.setHeader('Content-Type', 'text/plain');
      } else if (ext === '.doc' || ext === '.docx') {
        res.setHeader('Content-Type', 'application/msword');
      } else {
        // For files without extension, try to detect from content
        res.setHeader('Content-Type', 'application/octet-stream'); // Generic binary
      }
    }
  }));

  // Simple passcode authentication
  app.post("/api/auth/verify", (req, res) => {
    const { passcode } = req.body;
    const demoPasscode = process.env.DEMO_PASSCODE || "demo2025";
    
    if (passcode === demoPasscode) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid passcode" });
    }
  });

  // Helper function to determine user type from request
  const getUserType = (req: any) => {
    const userAgent = req.get('User-Agent') || '';
    const referer = req.get('Referer') || '';
    const host = req.get('Host') || '';
    
    // Check if this is coming from owner's direct access (Replit workspace)
    if (host.includes('replit.app') || host.includes('replit.dev') || host.includes('localhost')) {
      return 'owner';
    }
    
    // Otherwise, it's demo access
    return 'demo';
  };

  // Projects
  app.get('/api/projects', async (req, res) => {
    try {
      const userType = getUserType(req);
      const projects = await storage.getProjects(userType);
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

  // OCR endpoint for receipt processing
  app.post('/api/receipts/ocr', upload.single('receipt'), async (req, res) => {
    try {
      console.log('OCR processing request received');
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      // Check if it's an image file
      const isImage = req.file.mimetype.startsWith('image/');
      if (!isImage) {
        return res.status(400).json({ error: 'Only image files can be processed with OCR' });
      }

      // Convert image to base64
      const filePath = path.join(uploadDir, req.file.filename);
      const imageBuffer = fs.readFileSync(filePath);
      const base64Image = imageBuffer.toString('base64');

      try {
        // Try new OpenAI Vision API first for better accuracy
        console.log('Processing with OpenAI Vision API...');
        console.log('OPENAI_API_KEY available:', !!process.env.OPENAI_API_KEY);
        const ocrResult = await extractReceiptWithVision(imageBuffer, req.file.originalname);
        console.log('OpenAI Vision OCR result:', ocrResult);

        // Clean up temp file
        fs.unlinkSync(filePath);

        res.json({
          success: true,
          data: ocrResult,
          method: 'openai-vision',
          confidence: ocrResult.confidence
        });

      } catch (openaiError) {
        console.error('OpenAI Vision processing failed:', openaiError);
        
        // Use filename-based fallback as last resort
        console.log('Falling back to filename-based extraction...');
        const fallbackResult = extractReceiptFallback(req.file.originalname || 'receipt');
        
        // Clean up temp file
        fs.unlinkSync(filePath);

        res.json({
          success: true,
          data: fallbackResult,
          method: 'filename-fallback',
          error: 'OpenAI Vision API failed, manual entry required'
        });
      }

    } catch (error) {
      console.error('OCR processing error:', error);
      
      // Clean up temp file if it exists
      if (req.file) {
        const filePath = path.join(uploadDir, req.file.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ error: 'OCR processing failed: ' + errorMessage });
    }
  });

  // OCR text enhancement endpoint (text-only, much cheaper than vision)
  app.post('/api/receipts/ocr-text', async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Text content required' });
      }

      console.log('Enhancing OCR text with GPT...');
      
      try {
        // Use much cheaper text-only GPT processing
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "gpt-4", // Using text-only model, much cheaper than vision
            messages: [
              {
                role: "system",
                content: "You are an assistant that extracts structured data from receipt text. You only return JSON with these fields: 'vendor', 'amount', and 'items'."
              },
              {
                role: "user",
                content: `Extract vendor name, total amount, and main items from this receipt text. Return JSON only.\n\n${text}`
              }
            ],
            response_format: { type: "json_object" },
            max_tokens: 200
          })
        });

        if (response.ok) {
          const result = await response.json();
          const parsedData = JSON.parse(result.choices[0].message.content || '{}');
          
          res.json({
            vendor: parsedData.vendor || 'Unknown Vendor',
            amount: parseFloat(parsedData.amount) || 0,
            items: Array.isArray(parsedData.items) ? parsedData.items : []
          });
        } else {
          throw new Error(`OpenAI API error: ${response.status}`);
        }
        
      } catch (apiError) {
        console.warn('OpenAI enhancement failed, using basic parsing:', apiError);
        
        // Fallback to basic text parsing
        const lines = text.split('\n').filter(line => line.trim());
        const amountMatch = text.match(/\$?(\d+\.?\d*)/);
        const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;
        
        res.json({
          vendor: lines[0] || 'Unknown Vendor',
          amount,
          items: lines.slice(1, 4).filter(line => line.length > 2)
        });
      }

    } catch (error) {
      console.error('Text enhancement error:', error);
      res.status(500).json({ error: 'Failed to enhance text' });
    }
  });

  app.post('/api/projects/:id/receipts', upload.single('receipt'), async (req, res) => {
    try {
      console.log('Receipt upload request for project:', req.params.id);
      console.log('Request body:', req.body);
      console.log('Request file:', req.file ? { filename: req.file.filename, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size } : 'No file');
      
      const projectId = parseInt(req.params.id);
      
      const receiptData = {
        projectId,
        vendor: req.body.vendor,
        amount: req.body.amount, // Keep as string since schema expects text
        description: req.body.description || null,
        date: new Date(req.body.date),
        filename: req.file?.filename || null,
        originalName: req.file?.originalname || null,
        items: req.body.items ? JSON.parse(req.body.items) : null, // Parse items array from OCR
        ocrMethod: req.body.ocrMethod || null,
        confidence: req.body.confidence ? parseFloat(req.body.confidence) : null,
      };

      console.log('Receipt data to validate:', receiptData);
      const validatedData = insertReceiptSchema.parse(receiptData);
      console.log('Validated receipt data:', validatedData);
      
      const receipt = await storage.createReceipt(validatedData);
      console.log('Receipt saved to database:', receipt);
      
      res.status(201).json(receipt);
    } catch (error) {
      console.error('Receipt creation error:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      res.status(400).json({ error: 'Failed to create receipt', details: error instanceof Error ? error.message : 'Unknown error' });
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
      console.log('Creating hours entry with date:', req.body.date);
      
      // Parse date string directly as YYYY-MM-DD without timezone conversion
      const dateString = req.body.date;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        throw new Error('Invalid date format. Expected YYYY-MM-DD');
      }
      
      // Create date in UTC but treat it as local date to prevent shifting
      const [year, month, day] = dateString.split('-').map(Number);
      const localDate = new Date(year, month - 1, day);
      
      // Ensure the date is stored correctly without timezone conversion
      const utcDate = new Date(Date.UTC(year, month - 1, day));
      console.log('Input date:', dateString, '-> Local date:', localDate.toLocaleDateString(), '-> UTC date:', utcDate.toISOString());
      
      const hoursData = {
        projectId,
        date: utcDate, // Use UTC date to prevent timezone shifts
        hours: parseFloat(req.body.hours),
        description: req.body.description || null,
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

  // Tools Checklist routes
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
        isCompleted: 0, // Default to unchecked
      };
      const validatedData = insertToolsChecklistSchema.parse(toolData);
      const tool = await storage.createTool(validatedData);
      res.status(201).json(tool);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create tool entry' });
    }
  });

  app.put('/api/tools/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertToolsChecklistSchema.partial().parse(req.body);
      const tool = await storage.updateTool(id, updates);
      if (!tool) {
        return res.status(404).json({ error: 'Tool not found' });
      }
      res.json(tool);
    } catch (error) {
      res.status(400).json({ error: 'Invalid tool data' });
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

  // Estimates
  app.get('/api/projects/:id/estimates', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const estimates = await storage.getProjectEstimates(projectId);
      res.json(estimates);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch estimates' });
    }
  });

  app.get('/api/estimates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const estimate = await storage.getEstimate(id);
      if (!estimate) {
        return res.status(404).json({ error: 'Estimate not found' });
      }
      res.json(estimate);
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch estimate' });
    }
  });

  app.post('/api/projects/:id/estimates', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      const estimateData = {
        projectId,
        estimateNumber: req.body.estimateNumber,
        date: new Date(req.body.date),
        projectTitle: req.body.projectTitle || null,
        projectDescription: req.body.projectDescription || null,
        workStages: req.body.workStages, // JSON string
        additionalServices: req.body.additionalServices, // JSON string
        primerCoats: req.body.primerCoats || 1,
        topCoats: req.body.topCoats || 2,
        paintSuppliedBy: req.body.paintSuppliedBy,
        paintCost: req.body.paintCost || 0,
        deliveryCost: req.body.deliveryCost || 0,
        status: req.body.status || 'draft',
      };

      const validatedData = insertEstimateSchema.parse(estimateData);
      const estimate = await storage.createEstimate(validatedData);
      res.status(201).json(estimate);
    } catch (error) {
      res.status(400).json({ error: 'Failed to create estimate' });
    }
  });

  app.put('/api/estimates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = insertEstimateSchema.partial().parse(req.body);
      const estimate = await storage.updateEstimate(id, updates);
      if (!estimate) {
        return res.status(404).json({ error: 'Estimate not found' });
      }
      res.json(estimate);
    } catch (error) {
      res.status(400).json({ error: 'Invalid estimate data' });
    }
  });

  app.delete('/api/estimates/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEstimate(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Estimate not found' });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete estimate' });
    }
  });

  // Email sending endpoint with PDF attachment using Gmail SMTP
  app.post('/api/send-email-with-pdf', async (req, res) => {
    try {
      const { to, subject, text, pdfBase64, pdfFilename } = req.body;
      
      // Check if Gmail SMTP credentials are available
      if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return res.json({ 
          success: false, 
          message: 'Gmail SMTP not configured. Opening Gmail manually...', 
          fallback: true 
        });
      }

      // Create Gmail SMTP transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD
        }
      });

      // Prepare email with PDF attachment
      const mailOptions = {
        from: process.env.GMAIL_USER,
        to: to,
        subject: subject,
        text: text,
        attachments: pdfBase64 ? [{
          filename: pdfFilename,
          content: pdfBase64,
          encoding: 'base64'
        }] : []
      };

      // Send email
      await transporter.sendMail(mailOptions);
      
      res.json({ 
        success: true, 
        message: 'Email sent successfully with PDF attachment!',
        direct: true
      });
      
    } catch (error) {
      console.error('Gmail SMTP error:', error);
      
      // Fallback to manual Gmail opening
      res.json({ 
        success: false, 
        message: 'SMTP failed. Opening Gmail manually...', 
        fallback: true,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Nodemailer Gmail direct sending endpoint with receipt attachments
  app.post('/api/send-invoice-email', async (req, res) => {
    try {
      const { recipientEmail, clientName, invoiceNumber, pdfData, receiptFilenames } = req.body;
      
      console.log('Email send request:', {
        recipientEmail,
        clientName,
        invoiceNumber,
        hasReceiptFilenames: !!receiptFilenames
      });
      
      if (!recipientEmail || !clientName || !invoiceNumber || !pdfData) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Convert base64 PDF data to buffer
      const pdfBuffer = Buffer.from(pdfData, 'base64');
      
      // Prepare receipt attachments
      const receiptAttachments = [];
      if (receiptFilenames && Array.isArray(receiptFilenames)) {
        for (const filename of receiptFilenames) {
          try {
            const receiptPath = path.join(process.cwd(), 'uploads', filename);
            if (fs.existsSync(receiptPath)) {
              receiptAttachments.push({
                filename: filename,
                path: receiptPath
              });
            }
          } catch (error) {
            console.error(`Failed to attach receipt ${filename}:`, error);
          }
        }
      }
      
      const success = await sendInvoiceEmailWithReceipts(
        recipientEmail, 
        clientName, 
        invoiceNumber, 
        pdfBuffer,
        receiptAttachments
      );
      
      if (success) {
        res.json({ 
          success: true, 
          message: `Invoice email sent successfully with ${receiptAttachments.length} receipt attachments` 
        });
      } else {
        res.status(500).json({ error: 'Failed to send invoice email' });
      }
    } catch (error) {
      console.error('Email sending error:', error);
      res.status(500).json({ 
        error: 'Failed to send invoice email', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Estimate email sending endpoint
  app.post('/api/send-estimate-email', async (req, res) => {
    try {
      const { 
        recipientEmail, 
        clientName, 
        estimateNumber, 
        projectTitle, 
        totalAmount, 
        customMessage,
        pdfData 
      } = req.body;
      
      if (!recipientEmail || !clientName || !estimateNumber || !pdfData) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Convert base64 PDF data to buffer
      const pdfBuffer = Buffer.from(pdfData, 'base64');
      
      const success = await sendEstimateEmail(
        recipientEmail, 
        clientName, 
        estimateNumber, 
        projectTitle, 
        totalAmount, 
        customMessage, 
        pdfBuffer
      );
      
      if (success) {
        res.json({ success: true, message: 'Estimate email sent successfully via Gmail' });
      } else {
        res.status(500).json({ error: 'Failed to send estimate email' });
      }
    } catch (error) {
      console.error('Estimate email sending error:', error);
      res.status(500).json({ 
        error: 'Failed to send estimate email', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Generic email sending endpoint
  app.post('/api/send-email-direct', async (req, res) => {
    try {
      const { to, subject, text, html } = req.body;
      
      if (!to || !subject || !text) {
        return res.status(400).json({ error: 'Missing required email fields' });
      }

      const success = await sendEmail({ to, subject, text, html });
      
      if (success) {
        res.json({ success: true, message: 'Email sent successfully via Gmail' });
      } else {
        res.status(500).json({ error: 'Failed to send email' });
      }
    } catch (error) {
      console.error('Email sending error:', error);
      res.status(500).json({ 
        error: 'Failed to send email', 
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Keep original SendGrid endpoint for reference
  app.post('/api/send-email', async (req, res) => {
    try {
      const { to, subject, html, text } = req.body;
      
      if (!process.env.SENDGRID_API_KEY) {
        return res.status(500).json({ error: 'SendGrid API key not configured' });
      }

      sgMail.setApiKey(process.env.SENDGRID_API_KEY);

      const msg = {
        to,
        from: 'cortespainter@gmail.com', // Must be verified in SendGrid
        subject,
        text,
        html
      };

      await sgMail.send(msg);
      res.json({ success: true, message: 'Email sent successfully' });
    } catch (error: any) {
      console.error('SendGrid error:', error);
      
      // Extract more detailed error information
      let errorDetails = error.message;
      if (error.response?.body?.errors) {
        errorDetails = error.response.body.errors.map((e: any) => e.message).join(', ');
        console.error('SendGrid detailed errors:', error.response.body.errors);
      }
      
      res.status(500).json({ 
        error: 'Failed to send email', 
        details: errorDetails,
        sendgridErrors: error.response?.body?.errors || []
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
