// 📄 FILE: server/routes/googleDriveRoutes.ts
import express from "express";
import { createGoogleAPIService } from "../../../Triad-Documents/common/googleAPI/index.js";

const router = express.Router();

router.post("/api/create-folder-doc", async (req, res) => {
  try {
    const { folderName, docName, content } = req.body;

    // Use the consolidated GoogleAPIService from Triad-Documents
    const googleApi = createGoogleAPIService();
    
    // Create folder
    const folderId = await googleApi.createFolder(folderName);
    
    // Create document in folder
    const result = await googleApi.createDocumentInFolder(folderId, docName, content || "Hello world");

    res.json({
      folderId: result.folderId,
      docId: result.docId,
      message: "Created successfully",
    });
  } catch (err: any) {
    console.error("Google Drive creation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// New route that uses the exportToGoogleDocs helper
router.post("/api/export-doc", async (req, res) => {
  try {
    const { project, content } = req.body;
    
    if (!project || !content) {
      return res.status(400).json({ error: "Missing project or content" });
    }

    // Use the consolidated GoogleAPIService from Triad-Documents
    const googleApi = createGoogleAPIService();
    const documentUrl = await googleApi.exportToGoogleDocs(project, content);
    
    res.json({
      success: true,
      documentUrl,
      message: "Document created successfully",
    });
  } catch (err: any) {
    console.error("Google Docs export error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
