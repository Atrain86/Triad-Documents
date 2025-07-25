import { google } from 'googleapis';
import { db } from './db';
import { eq } from 'drizzle-orm';
import { users } from '../shared/schema';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/gmail.readonly',
];

export class GmailAuthService {
  private oAuth2Client: any;
  private isConfigured: boolean = false;

  constructor() {
    if (!process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET) {
      console.warn('Gmail OAuth2 credentials not configured. Gmail integration will be disabled.');
      this.isConfigured = false;
      return;
    }

    try {
      // Use current accessible domain for redirect URI
      const redirectUri = process.env.REPLIT_DEV_DOMAIN 
        ? `https://${process.env.REPLIT_DEV_DOMAIN}/api/gmail/callback`
        : process.env.GMAIL_REDIRECT_URI;
      
      this.oAuth2Client = new google.auth.OAuth2(
        process.env.GMAIL_CLIENT_ID,
        process.env.GMAIL_CLIENT_SECRET,
        redirectUri
      );
      this.isConfigured = true;
      console.log('Gmail OAuth2 client initialized successfully with redirect URI:', redirectUri);
    } catch (error) {
      console.error('Failed to initialize Gmail OAuth2 client:', error);
      this.isConfigured = false;
    }
  }

  // Generate Gmail OAuth2 login URL
  generateAuthUrl(userId: string): string {
    if (!this.isConfigured) {
      throw new Error('Gmail OAuth2 not configured. Please set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REDIRECT_URI environment variables.');
    }
    return this.oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: SCOPES,
      state: userId, // Pass user ID to maintain context
    });
  }

  // Handle OAuth2 callback and save tokens
  async handleCallback(code: string, userId: string): Promise<{ success: boolean; email?: string; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Gmail OAuth2 not configured' };
    }
    try {
      const { tokens } = await this.oAuth2Client.getToken(code);
      this.oAuth2Client.setCredentials(tokens);

      // Get user's Gmail profile
      const gmail = google.gmail({ version: 'v1', auth: this.oAuth2Client });
      const profile = await gmail.users.getProfile({ userId: 'me' });
      const gmailAddress = profile.data.emailAddress;

      if (!gmailAddress) {
        return { success: false, error: 'Could not retrieve Gmail address' };
      }

      // Save or update user's Gmail credentials in database
      await db.update(users)
        .set({ 
          gmailEmail: gmailAddress,
          gmailRefreshToken: tokens.refresh_token,
          gmailConnectedAt: new Date()
        })
        .where(eq(users.id, parseInt(userId)));

      return { success: true, email: gmailAddress };
    } catch (error) {
      console.error('Gmail OAuth callback error:', error);
      return { success: false, error: 'Authentication failed' };
    }
  }

  // Get authenticated Gmail client for a user
  async getGmailClient(userId: number): Promise<any> {
    if (!this.isConfigured) {
      throw new Error('Gmail OAuth2 not configured');
    }
    try {
      // Get user's refresh token from database
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId));

      if (!user || !user.gmailRefreshToken) {
        throw new Error('User has not connected their Gmail account');
      }

      // Set up OAuth2 client with refresh token
      this.oAuth2Client.setCredentials({
        refresh_token: user.gmailRefreshToken
      });

      return google.gmail({ version: 'v1', auth: this.oAuth2Client });
    } catch (error) {
      console.error('Error getting Gmail client:', error);
      throw error;
    }
  }

  // Send email using user's Gmail account
  async sendEmail(userId: number, options: {
    to: string;
    subject: string;
    message: string;
    htmlMessage?: string;
    attachments?: Array<{ filename: string; content: string; mimeType: string }>;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!this.isConfigured) {
      return { success: false, error: 'Gmail OAuth2 not configured' };
    }
    try {
      const gmail = await this.getGmailClient(userId);

      // Build email message
      let emailContent = `To: ${options.to}\r\nSubject: ${options.subject}\r\n`;
      
      if (options.attachments && options.attachments.length > 0) {
        // Multipart email with attachments
        const boundary = `boundary_${Date.now()}`;
        emailContent += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
        
        // Email body
        emailContent += `--${boundary}\r\n`;
        if (options.htmlMessage) {
          emailContent += `Content-Type: text/html; charset=UTF-8\r\n\r\n${options.htmlMessage}\r\n\r\n`;
        } else {
          emailContent += `Content-Type: text/plain; charset=UTF-8\r\n\r\n${options.message}\r\n\r\n`;
        }
        
        // Attachments
        for (const attachment of options.attachments) {
          emailContent += `--${boundary}\r\n`;
          emailContent += `Content-Type: ${attachment.mimeType}\r\n`;
          emailContent += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
          emailContent += `Content-Transfer-Encoding: base64\r\n\r\n`;
          emailContent += attachment.content + '\r\n\r\n';
        }
        
        emailContent += `--${boundary}--`;
      } else {
        // Simple email without attachments
        if (options.htmlMessage) {
          emailContent += `Content-Type: text/html; charset=UTF-8\r\n\r\n${options.htmlMessage}`;
        } else {
          emailContent += `\r\n${options.message}`;
        }
      }

      // Encode message for Gmail API
      const rawMessage = Buffer.from(emailContent)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      // Send email
      const result = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: rawMessage },
      });

      return { success: true, messageId: result.data.id };
    } catch (error) {
      console.error('Gmail send error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send email';
      return { success: false, error: errorMessage };
    }
  }

  // Check if user has connected their Gmail
  async isGmailConnected(userId: number): Promise<boolean> {
    try {
      const [user] = await db.select()
        .from(users)
        .where(eq(users.id, userId));
      
      return !!(user && user.gmailRefreshToken);
    } catch (error) {
      console.error('Error checking Gmail connection:', error);
      return false;
    }
  }

  // Disconnect user's Gmail
  async disconnectGmail(userId: number): Promise<boolean> {
    try {
      await db.update(users)
        .set({ 
          gmailEmail: null,
          gmailRefreshToken: null,
          gmailConnectedAt: null
        })
        .where(eq(users.id, userId));
      
      return true;
    } catch (error) {
      console.error('Error disconnecting Gmail:', error);
      return false;
    }
  }
}

export const gmailAuthService = new GmailAuthService();