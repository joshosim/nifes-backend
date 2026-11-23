import { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest {
  headers: Request['headers'];
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware: RequestHandler = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    (req as AuthRequest).user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};