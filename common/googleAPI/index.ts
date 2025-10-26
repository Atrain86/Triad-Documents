import { google, docs_v1, drive_v3 } from 'googleapis';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * GoogleAPIService - Consolidated service for Google Docs and Drive operations
 * Supports both service account key file and JSON credentials from environment variable
 */
export class GoogleAPIService {
  private docs: docs_v1.Docs;
  private drive: drive_v3.Drive;

  /**
   * Initialize the Google API service with credentials
   * @param options Configuration options
   * @param options.keyFilePath Path to the service account key file (optional)
   * @param options.credentials JSON credentials string or object (optional)
   */
  constructor(options: {
    keyFilePath?: string;
    credentials?: string | object;
  }) {
    if (!options.keyFilePath && !options.credentials) {
      throw new Error('Either keyFilePath or credentials must be provided');
    }

    const auth = this.initializeAuth(options);
    this.docs = google.docs({ version: 'v1', auth });
    this.drive = google.drive({ version: 'v3', auth });
  }

  /**
   * Initialize the authentication client
   */
  private initializeAuth(options: {
    keyFilePath?: string;
    credentials?: string | object;
  }) {
    const scopes = [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
      'https://www.googleapis.com/auth/drive.file'
    ];

    if (options.keyFilePath) {
      return new google.auth.GoogleAuth({
        keyFile: options.keyFilePath,
        scopes
      });
    } else {
      const credentials = typeof options.credentials === 'string'
        ? JSON.parse(options.credentials)
        : options.credentials;

      return new google.auth.GoogleAuth({
        credentials,
        scopes
      });
    }
  }

  /**
   * Create a Google Doc and write content to it
   * @param title The title of the document
   * @param content The content to write to the document
   * @returns The URL of the created document
   */
  async createDocument(title: string, content: string): Promise<{
    documentId: string;
    documentUrl: string;
  }> {
    try {
      // 1. Create a new document
      const createResponse = await this.docs.documents.create({
        requestBody: { title }
      });

      const documentId = createResponse.data.documentId;
      const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;

      // 2. Insert the content into the document
      await this.docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content,
              },
            },
          ],
        },
      });

      // 3. Move the document into My Drive for visibility
      await this.drive.files.update({
        fileId: documentId,
        addParents: 'root',
        fields: 'id, parents',
      });

      return { documentId, documentUrl };
    } catch (error) {
      console.error('❌ Error creating Google Doc:', error);
      throw new Error('Failed to create document in Google Docs.');
    }
  }

  /**
   * Create a folder in Google Drive
   * @param folderName The name of the folder to create
   * @returns The ID of the created folder
   */
  async createFolder(folderName: string): Promise<string> {
    try {
      const folder = await this.drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id',
      });

      return folder.data.id;
    } catch (error) {
      console.error('❌ Error creating folder in Google Drive:', error);
      throw new Error('Failed to create folder in Google Drive.');
    }
  }

  /**
   * Create a document inside a folder
   * @param folderId The ID of the folder
   * @param docName The name of the document
   * @param content The content of the document
   * @returns Object with folder and document IDs
   */
  async createDocumentInFolder(folderId: string, docName: string, content: string): Promise<{
    folderId: string;
    docId: string;
  }> {
    try {
      // Create document inside the folder
      const doc = await this.drive.files.create({
        requestBody: {
          name: docName,
          mimeType: 'application/vnd.google-apps.document',
          parents: [folderId],
        },
        fields: 'id',
      });

      // Write content to document
      await this.docs.documents.batchUpdate({
        documentId: doc.data.id,
        requestBody: {
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: content || 'Hello world',
              },
            },
          ],
        },
      });

      return {
        folderId,
        docId: doc.data.id,
      };
    } catch (error) {
      console.error('❌ Error creating document in folder:', error);
      throw new Error('Failed to create document in Google Drive folder.');
    }
  }

  /**
   * Export project to Google Docs - convenient wrapper for createDocument
   * @param project The project name (used as document title)
   * @param notes The content to write into the doc
   * @returns The URL of the created document
   */
  async exportToGoogleDocs(project: string, notes: string): Promise<string> {
    try {
      const { documentUrl } = await this.createDocument(project, notes);
      return documentUrl;
    } catch (error) {
      console.error('❌ Error exporting to Google Docs:', error);
      throw new Error('Failed to export document to Google Docs.');
    }
  }
}

/**
 * Factory function to create a GoogleAPIService instance from environment variables
 * Supports both GOOGLE_SERVICE_ACCOUNT and GOOGLE_SERVICE_ACCOUNT_PATH
 */
export function createGoogleAPIService(): GoogleAPIService {
  // Check for credentials in environment variable first
  if (process.env.GOOGLE_SERVICE_ACCOUNT) {
    return new GoogleAPIService({
      credentials: process.env.GOOGLE_SERVICE_ACCOUNT
    });
  }

  // Check for path to service account key file
  const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
  if (serviceAccountPath) {
    return new GoogleAPIService({
      keyFilePath: serviceAccountPath
    });
  }

  // Try to locate service account key file in standard location
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const standardKeyPath = path.join(__dirname, '../../../google-service-account.json');
    
    if (fs.existsSync(standardKeyPath)) {
      return new GoogleAPIService({
        keyFilePath: standardKeyPath
      });
    }
  } catch (error) {
    console.warn('Could not check for standard service account key location');
  }

  throw new Error(
    'Google service account credentials not found. Please set GOOGLE_SERVICE_ACCOUNT or GOOGLE_SERVICE_ACCOUNT_PATH environment variable.'
  );
}
