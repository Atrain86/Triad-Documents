import express from "express";
import { register, login, logout, me } from "./controllers/authController.js";
import {
  getProjects,
  createProject,
  updateProject,
  deleteProject,
} from "./controllers/projectController.js";

const router = express.Router();

// Triad API Governance Integration - Health Check Endpoint
router.get("/api/ping", (req, res) => {
  res.json({
    message: "Server is alive",
    service: "PaintBrain7",
    timestamp: new Date().toISOString(),
    version: "1.0.0"
  });
});

router.post("/api/auth/register", register);
router.post("/api/auth/login", login);
router.post("/api/auth/logout", logout);
router.get("/api/auth/me", me);

router.get("/api/projects", getProjects);
router.post("/api/projects", createProject);
router.put("/api/projects/:id", updateProject);
router.delete("/api/projects/:id", deleteProject);

export default router;
