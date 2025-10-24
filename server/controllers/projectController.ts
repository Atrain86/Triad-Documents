import { Request, Response } from "express";
import { projects } from "../../shared/schema";

export async function getProjects(req: Request, res: Response) {
  return res.json(projects);
}

export async function createProject(req: Request, res: Response) {
  const project = req.body;
  projects.push(project);
  return res.json({ success: true, project });
}

export async function updateProject(req: Request, res: Response) {
  const { id } = req.params;
  const updatedProject = req.body;
  const projectIndex = projects.findIndex(p => p.id === id);
  
  if (projectIndex === -1) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }
  
  projects[projectIndex] = { ...projects[projectIndex], ...updatedProject };
  return res.json({ success: true, project: projects[projectIndex] });
}

export async function deleteProject(req: Request, res: Response) {
  const { id } = req.params;
  const projectIndex = projects.findIndex(p => p.id === id);
  
  if (projectIndex === -1) {
    return res.status(404).json({ success: false, message: "Project not found" });
  }
  
  projects.splice(projectIndex, 1);
  return res.json({ success: true, message: "Project deleted" });
}
