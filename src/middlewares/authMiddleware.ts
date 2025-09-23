import { Request, Response, NextFunction } from 'express';
import i18next from 'i18next';
import { verifyToken, extractTokenFromHeader, TokenExpiredError, InvalidTokenError } from '../utils/jwt.js';
import { authService } from '../services/authService.js';
import { JWTPayload } from '../types/auth.js';

// Extended request interface with user information
export interface AuthRequest extends Request {
  user?: JWTPayload;
  userId?: string;
}

// Authentication middleware - verifies JWT token
export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NO_TOKEN',
          message: 'Access token is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Check if userId exists in token
    if (!decoded.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid user token',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    // Verify user still exists and is active
    const user = await authService.verifyUser(decoded.userId);
    
    // Add user info to request
    req.user = {
      ...decoded,
      language: user.language,
    } as JWTPayload;
    req.userId = decoded.userId;
    
    // Set language from user preference
    if (user.language) {
      (req as any).language = user.language;
      // Also set i18next language
      req.lng = user.language;
      i18next.changeLanguage(user.language);
    }
    
    next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Access token has expired',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    if (error instanceof InvalidTokenError) {
      res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid access token',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // User not found or inactive
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication failed',
      },
      timestamp: new Date().toISOString(),
    });
  }
};

// Optional authentication middleware - doesn't fail if no token
export const optionalAuthenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      // No token provided, continue without authentication
      next();
      return;
    }

    // Verify token if provided
    const decoded = verifyToken(token);
    
    // Check if userId exists in token
    if (!decoded.userId) {
      // Continue without authentication if userId is missing
      next();
      return;
    }
    
    // Verify user still exists and is active
    const user = await authService.verifyUser(decoded.userId);
    
    // Add user info to request
    req.user = {
      ...decoded,
      language: user.language,
    } as JWTPayload;
    req.userId = decoded.userId;
    
    if (user.language) {
      (req as any).language = user.language;
      req.lng = user.language;
      i18next.changeLanguage(user.language);
    }
    
    next();
  } catch (error) {
    // If token is invalid, continue without authentication
    // This allows endpoints to work for both authenticated and unauthenticated users
    next();
  }
};

// Backward compatibility - alias for authenticate
export const protect = authenticate;
