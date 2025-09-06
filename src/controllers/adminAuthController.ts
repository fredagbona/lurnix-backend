import { Request, Response } from 'express';
import { adminAuthService, AdminLoginRequest, AdminRegisterRequest } from '../services/adminAuthService.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { AdminAuthRequest } from '../middlewares/adminAuthMiddleware.js';

export class AdminAuthController {
  // Register a new admin (only super_admin can do this)
  register = asyncHandler(async (req: AdminAuthRequest, res: Response): Promise<void> => {
    const registerData: AdminRegisterRequest = req.body;
    
    // Add the creator's name if available
    if (req.admin) {
      registerData.createdBy = req.admin.name;
    }
    
    const result = await adminAuthService.register(registerData);
    
    res.status(201).json({
      success: true,
      message: 'Admin registered successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  });

  // Login admin
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const loginData: AdminLoginRequest = req.body;
    
    const result = await adminAuthService.login(loginData);
    
    res.status(200).json({
      success: true,
      message: 'Admin logged in successfully',
      data: result,
      timestamp: new Date().toISOString()
    });
  });

  // Get current admin profile
  getProfile = asyncHandler(async (req: AdminAuthRequest, res: Response): Promise<void> => {
    if (!req.admin || !req.adminId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    const admin = await adminAuthService.verifyAdmin(req.adminId);
    
    res.status(200).json({
      success: true,
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        createdAt: admin.createdAt
      },
      timestamp: new Date().toISOString()
    });
  });

  // Change admin password
  changePassword = asyncHandler(async (req: AdminAuthRequest, res: Response): Promise<void> => {
    if (!req.adminId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    const { currentPassword, newPassword } = req.body;
    
    await adminAuthService.changePassword(req.adminId, currentPassword, newPassword);
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
      timestamp: new Date().toISOString()
    });
  });
}

// Export singleton instance
export const adminAuthController = new AdminAuthController();
