// 📄 FILE: server/routes/googleDriveRoutes.ts
import express from "express";
import { google } from "googleapis";

const router = express.Router();

router.post("/api/create-folder-doc", async (req, res) => {
  try {
    const { folderName, docName, content } = req.body;

    // 1️⃣ Load credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT || "{}");

    // 2️⃣ Initialize auth client
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: [
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/documents",
      ],
    });

    // 3️⃣ Await the authorized client
    const authClient = await auth.getClient();

    // 4️⃣ Initialize Drive and Docs APIs using the client
    const drive = google.drive({ version: "v3", auth: authClient });
    const docs = google.docs({ version: "v1", auth: authClient });

    // 5️⃣ Create folder
    const folder = await drive.files.create({
      requestBody: {
        name: folderName,
        mimeType: "application/vnd.google-apps.folder",
      },
      fields: "id",
    });

    // 6️⃣ Create document inside that folder
    const doc = await drive.files.create({
      requestBody: {
        name: docName,
        mimeType: "application/vnd.google-apps.document",
        parents: [folder.data.id!],
      },
      fields: "id",
    });

    // 7️⃣ Write content to document
    await docs.documents.batchUpdate({
      documentId: doc.data.id!,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content || "Hello world",
            },
          },
        ],
      },
    });

    res.json({
      folderId: folder.data.id,
      docId: doc.data.id,
      message: "Created successfully",
    });
  } catch (err: any) {
    console.error("Google Drive creation error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
