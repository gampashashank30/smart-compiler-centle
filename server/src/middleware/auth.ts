import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { CONFIG } from '../config.js';

export interface AuthUser {
  id: string;
  email?: string;
  displayName: string;
  isGuest: boolean;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function generateToken(user: AuthUser): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      isGuest: user.isGuest
    },
    CONFIG.JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If no token, assign default demo/guest session so user is never blocked from trying features
    req.user = {
      id: 'guest-default-user',
      displayName: 'Guest Developer',
      isGuest: true
    };
    return next();
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, CONFIG.JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      email: decoded.email,
      displayName: decoded.displayName,
      isGuest: !!decoded.isGuest
    };
    next();
  } catch (err) {
    req.user = {
      id: 'guest-default-user',
      displayName: 'Guest Developer',
      isGuest: true
    };
    next();
  }
}
