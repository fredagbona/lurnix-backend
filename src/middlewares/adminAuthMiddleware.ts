import { Request, Response, NextFunction } from 'express';
import { verifyToken, extractTokenFromHeader, TokenExpiredError, InvalidTokenError } from '../utils/jwt.js';
import { adminRepository } from '../repositories/adminRepository.js';
import { AdminRole } from '../types/auth';

// Extended request interface with admin information
export interface AdminAuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
    role: AdminRole;
    name: string;
    language?: string;
  };
  adminId?: string;
}

// Admin authentication middleware - verifies JWT token for admins
export const authenticateAdmin = async (req: AdminAuthRequest, res: Response, next: NextFunction): Promise<void> => {
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
    const payload = verifyToken(token);
    
    // Check if the token contains admin ID
    if (!payload.adminId) {
      res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'Invalid admin token' } 
      });
      return;
    }
    
    const adminId = payload.adminId;

    // Verify admin still exists
    const admin = await adminRepository.findById(adminId);
    if (!admin) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Admin not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    // Add admin info to request
    req.admin = {
      id: admin.id,
      email: admin.email,
      role: admin.role,
      name: admin.name,
      language: admin.language || 'en'
    };
    req.adminId = admin.id;
    
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

    // Other errors
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

// Role-based middleware for admin access control
export const requireRole = (allowedRoles: AdminRole[]) => {
  return (req: AdminAuthRequest, res: Response, next: NextFunction) => {
    if (!req.admin) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' } 
      });
    }

    if (!allowedRoles.includes(req.admin.role)) {
      return res.status(403).json({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } 
      });
    }

    next();
  };
};

// Convenience middleware for super admin role
export const requireSuperAdmin = requireRole([AdminRole.SUPER_ADMIN]);

// Convenience middleware for manager role (includes super admin)
export const requireManager = requireRole([AdminRole.SUPER_ADMIN, AdminRole.MANAGER]);

// Convenience middleware for support role (includes super admin and manager)
export const requireSupport = requireRole([AdminRole.SUPER_ADMIN, AdminRole.MANAGER, AdminRole.SUPPORT]);

// Alias for requireRole to match the import in quizRoutes.ts
export const checkAdminRole = requireRole;
