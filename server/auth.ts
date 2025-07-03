import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';
import type { User } from '@shared/schema';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface TokenPayload {
  userId: number;
  email: string;
  role: 'admin' | 'client';
}

const JWT_SECRET = process.env.JWT_SECRET!;
const SALT_ROUNDS = 12;

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '90d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    return null;
  }
}

export async function authenticateToken(
  req: any, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  const payload = verifyToken(token);
  if (!payload) {
    res.status(403).json({ error: 'Invalid or expired token' });
    return;
  }

  try {
    const user = await storage.getUserById(payload.userId);
    if (!user || !user.isActive) {
      res.status(403).json({ error: 'User not found or inactive' });
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export async function requireAdmin(
  req: any, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

export async function requireOwnershipOrAdmin(
  req: any, 
  res: Response, 
  next: NextFunction
): Promise<void> {
  const { projectId } = req.params;
  
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // Admin can access everything
  if (req.user.role === 'admin') {
    next();
    return;
  }

  // Check if user owns the project
  try {
    const project = await storage.getProject(parseInt(projectId));
    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (project.userId !== req.user.id) {
      res.status(403).json({ error: 'Access denied - not project owner' });
      return;
    }

    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(500).json({ error: 'Access validation failed' });
  }
}