import { Request, Response } from 'express';
import { adminAuthService, AdminLoginRequest, AdminRegisterRequest } from '../services/auth';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { AdminAuthRequest } from '../middlewares/adminAuthMiddleware.js';
import { I18nRequest } from '../config/i18n/types.js';
import { sendTranslatedResponse } from '../utils/translationUtils.js';
import { AppError } from '../errors/AppError.js';

export class AdminAuthController {
  // Register a new admin (only super_admin can do this)
  register = asyncHandler(async (req: AdminAuthRequest & I18nRequest, res: Response): Promise<void> => {
    const registerData: AdminRegisterRequest = req.body;
    
    // Add the creator's name if available
    if (req.admin) {
      registerData.createdBy = req.admin.name;
    }
    
    const result = await adminAuthService.register(registerData);
    
    sendTranslatedResponse(res, 'admin.auth.registerSuccess', {
      statusCode: 201,
      data: result
    });
  });

  // Login admin
  login = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    const { email, password } = req.body;
    
    const result = await adminAuthService.login({ email, password });
    
    sendTranslatedResponse(res, 'admin.auth.loginSuccess', {
      statusCode: 200,
      data: result
    });
  });
  getProfile = asyncHandler(async (req: AdminAuthRequest & I18nRequest, res: Response): Promise<void> => {
    if (!req.admin || !req.adminId) {
      throw new AppError('admin.auth.unauthorized', 401);
    }
    
    const admin = await adminAuthService.verifyAdmin(req.adminId);
    
    sendTranslatedResponse(res, 'admin.auth.profileRetrieved', {
      statusCode: 200,
      data: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        language: admin.language || 'en',
        createdAt: admin.createdAt
      }
    });
  });

  // Change admin password
  changePassword = asyncHandler(async (req: AdminAuthRequest & I18nRequest, res: Response): Promise<void> => {
    if (!req.adminId) {
      throw new AppError('admin.auth.unauthorized', 401);
    }
    
    const { currentPassword, newPassword } = req.body;
    
    await adminAuthService.changePassword(req.adminId, currentPassword, newPassword);
    
    sendTranslatedResponse(res, 'admin.auth.passwordChanged', {
      statusCode: 200
    });
  });

  updateLanguage = asyncHandler(async (req: AdminAuthRequest & I18nRequest, res: Response): Promise<void> => {
    if (!req.adminId) {
      throw new AppError('admin.auth.unauthorized', 401);
    }

    const { language } = req.body as { language: 'en' | 'fr' };

    const updatedProfile = await adminAuthService.updateLanguage(req.adminId, language);

    (req as any).language = language;
    (req as any).lng = language;
    if (req.admin) {
      req.admin.language = language;
    }

    sendTranslatedResponse(res, 'admin.auth.languageUpdated', {
      statusCode: 200,
      data: {
        admin: updatedProfile
      }
    });
  });
}

// Export singleton instance
export const adminAuthController = new AdminAuthController();
