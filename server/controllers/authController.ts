import { Request, Response } from "express";
import { users } from "../../shared/schema";

export async function register(req: Request, res: Response) {
  const { name, email, password } = req.body;
  console.log("Stub register", name, email, password);
  return res.json({ success: true });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;
  console.log("Stub login", email, password);
  return res.json({ success: true });
}

export async function logout(req: Request, res: Response) {
  console.log("Stub logout");
  return res.json({ success: true });
}

export async function me(req: Request, res: Response) {
  console.log("Stub me route");
  return res.json({ user: null });
}
