import { Request, Response } from 'express';
import { authService, AuthServiceError } from '../services/auth';
import { 
  UpdateProfileRequest, 
  ChangePasswordRequest, 
  DeleteAccountRequest 
} from '../types/auth.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { getClientIP } from '../utils/emailUtils.js';
import { sendTranslatedResponse } from '../utils/translationUtils.js';
import { AppError } from '../errors/AppError.js';

export class UserManagementController {
  // Get user profile
  getProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;

    if (!userId) {
      throw new AppError('errors.auth.authenticationRequired', 401, 'AUTHENTICATION_REQUIRED');
    }

    try {
      const userProfile = await authService.getUserProfile(userId);

      sendTranslatedResponse(res, 'auth.profile.retrieved', {
        statusCode: 200,
        data: {
          user: userProfile,
        },
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError(error.message, error.statusCode, error.name);
      }
      throw error;
    }
  });

  // Update user profile
  updateProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;
    const updateData: UpdateProfileRequest = req.body;

    if (!userId) {
      throw new AppError('errors.auth.authenticationRequired', 401, 'AUTHENTICATION_REQUIRED');
    }

    try {
      const updatedProfile = await authService.updateProfile(userId, updateData);

      sendTranslatedResponse(res, 'auth.profile.updated', {
        statusCode: 200,
        data: {
          user: updatedProfile,
        },
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError(error.message, error.statusCode, error.name);
      }
      throw error;
    }
  });

  // Change password
  changePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;
    const passwordData: ChangePasswordRequest = req.body;

    if (!userId) {
      throw new AppError('errors.auth.authenticationRequired', 401, 'AUTHENTICATION_REQUIRED');
    }

    try {
      const ipAddress = getClientIP(req);
      await authService.changePassword(userId, passwordData, ipAddress);

      sendTranslatedResponse(res, 'auth.password.changed', {
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError(error.message, error.statusCode, error.name);
      }
      throw error;
    }
  });

  // Delete account (soft delete)
  deleteAccount = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;
    const deleteData: DeleteAccountRequest = req.body;

    if (!userId) {
      throw new AppError('errors.auth.authenticationRequired', 401, 'AUTHENTICATION_REQUIRED');
    }

    try {
      await authService.deleteAccount(userId, deleteData);

      sendTranslatedResponse(res, 'auth.account.deleted', {
        statusCode: 200,
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError(error.message, error.statusCode, error.name);
      }
      throw error;
    }
  });

 
  // Update user language preference
  updateLanguage = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;
    const { language } = req.body;

    if (!userId) {
      throw new AppError('errors.auth.authenticationRequired', 401, 'AUTHENTICATION_REQUIRED');
    }

    if (!language || !['en', 'fr'].includes(language)) {
      sendTranslatedResponse(res, 'auth.validation.language.invalid', {
        statusCode: 400,
        success: false,
      });
      return;
    }

    try {
      const updatedProfile = await authService.updateLanguage(userId, language as 'en' | 'fr');

      // Ensure request context reflects the updated language preference
      const authRequest = res.req as AuthRequest;
      if (authRequest.user) {
        authRequest.user.language = updatedProfile.language;
      }
      (res.req as any).language = updatedProfile.language;
      (res.req as any).lng = updatedProfile.language;

      sendTranslatedResponse(res, 'auth.language.updated', {
        statusCode: 200,
        data: {
          user: updatedProfile,
        },
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError(error.message, error.statusCode, error.name);
      }
      throw error;
    }
  });

  // Get account status
  getAccountStatus = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;

    if (!userId) {
      throw new AppError('errors.auth.authenticationRequired', 401, 'AUTHENTICATION_REQUIRED');
    }

    try {
      const user = await authService.verifyUser(userId);

      sendTranslatedResponse(res, 'auth.account.statusRetrieved', {
        statusCode: 200,
        data: {
          accountStatus: {
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            deletedAt: user.deletedAt,
          },
        },
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError(error.message, error.statusCode, error.name);
      }
      throw error;
    }
  });
}

// Export singleton instance
export const userManagementController = new UserManagementController();
