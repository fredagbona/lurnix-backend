import { Request, Response } from 'express';
import { authService, AuthServiceError } from '../services/authService.js';
import { 
  UpdateProfileRequest, 
  ChangePasswordRequest, 
  DeleteAccountRequest 
} from '../types/auth.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { getClientIP } from '../utils/emailUtils.js';

export class UserManagementController {
  // Get user profile
  getProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const userProfile = await authService.getUserProfile(userId);
      
      res.status(200).json({
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          user: userProfile,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.name,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      throw error;
    }
  });

  // Update user profile
  updateProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;
    const updateData: UpdateProfileRequest = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const updatedProfile = await authService.updateProfile(userId, updateData);
      
      res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        data: {
          user: updatedProfile,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.name,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      throw error;
    }
  });

  // Change password
  changePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;
    const passwordData: ChangePasswordRequest = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const ipAddress = getClientIP(req);
      await authService.changePassword(userId, passwordData, ipAddress);
      
      res.status(200).json({
        success: true,
        message: 'Password changed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.name,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      throw error;
    }
  });

  // Delete account (soft delete)
  deleteAccount = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;
    const deleteData: DeleteAccountRequest = req.body;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      await authService.deleteAccount(userId, deleteData);
      
      res.status(200).json({
        success: true,
        message: 'Account deleted successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.name,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      throw error;
    }
  });

 
  // Get account status
  getAccountStatus = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const user = await authService.verifyUser(userId);
      
      res.status(200).json({
        success: true,
        data: {
          accountStatus: {
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            deletedAt: user.deletedAt,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.name,
            message: error.message,
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }
      throw error;
    }
  });
}

// Export singleton instance
export const userManagementController = new UserManagementController();