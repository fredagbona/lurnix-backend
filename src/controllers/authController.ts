import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { authService, AuthServiceError, EmailNotVerifiedError } from '../services/authService.js';
import i18next from 'i18next';
import { passwordResetService, PasswordResetError } from '../services/passwordResetService.js';
import { 
  RegisterRequest, 
  LoginRequest, 
  ForgotPasswordRequest, 
  ResetPasswordRequest,
  VerifyEmailRequest,
  ResendVerificationRequest
} from '../types/auth.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { sendTranslatedResponse } from '../utils/translationUtils.js';
import { AppError } from '../errors/AppError.js';

export class AuthController {
  // User registration
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const registerData: RegisterRequest = req.body;

    try {
      const result = await authService.register(registerData);
      
      sendTranslatedResponse(res, 'auth.register.success', {
        statusCode: 201,
        data: result
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError('auth.register.failed', error.statusCode, error.name);
      }
      throw error; // Let global error handler deal with unexpected errors
    }
  });

  // User login
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const loginData: LoginRequest = req.body;

    try {
      const result = await authService.login(loginData);
      
      // Set the language based on the user's preference
      (req as any).language = result.user.language;
      i18next.changeLanguage(result.user.language);
      
      sendTranslatedResponse(res, 'auth.login.success', {
        statusCode: 200,
        data: result
      });
    } catch (error) {
      if (error instanceof EmailNotVerifiedError) {
        throw new AppError('auth.verification.required', error.statusCode, error.name, true, {
          requiresVerification: true
        });
      } else if (error instanceof AuthServiceError) {
        throw new AppError('auth.login.failed', error.statusCode, error.name);
      }
      throw error;
    }
  });

  // Forgot password
  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const forgotPasswordData: ForgotPasswordRequest = req.body;

    try {
      // Check rate limiting
      if (passwordResetService.isRateLimited(forgotPasswordData.email)) {
        throw new AppError('errors.rateLimit.passwordReset', 429, 'RATE_LIMIT_EXCEEDED');
      }

      // Initiate password reset
      const result = await passwordResetService.initiatePasswordReset(forgotPasswordData);
      
      // For security, always return success regardless of whether email exists
      sendTranslatedResponse(res, 'auth.password.resetInitiated', {
        statusCode: 200
      });

      // Email is sent automatically by the password reset service
      if (result.token && result.userId) {
        console.log(`Password reset initiated for user ${result.userId}`);
      }
    } catch (error) {
      if (error instanceof PasswordResetError) {
        throw new AppError('auth.password.resetFailed', error.statusCode, error.name);
      }
      throw error;
    }
  });

  // Reset password with token
  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const resetPasswordData: ResetPasswordRequest = req.body;

    try {
      const result = await passwordResetService.resetPassword(resetPasswordData);
      
      if (result.success) {
        sendTranslatedResponse(res, 'auth.password.resetSuccess', {
          statusCode: 200
        });
      } else {
        throw new AppError('auth.password.resetFailed', 400, 'PASSWORD_RESET_FAILED');
      }
    } catch (error) {
      if (error instanceof PasswordResetError) {
        throw new AppError('auth.password.error', error.statusCode, error.name);
      }
      throw error;
    }
  });

 

  // Refresh token
  refreshToken = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId; // From auth middleware

    if (!userId) {
      throw new AppError('auth.login.required', 401, 'AUTHENTICATION_REQUIRED');
    }

    try {
      const newToken = await authService.refreshToken(userId);
      
      sendTranslatedResponse(res, 'auth.token.refreshed', {
        statusCode: 200,
        data: {
          token: newToken,
        }
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError('auth.token.refreshFailed', error.statusCode, error.name);
      }
      throw error;
    }
  });

  // Verify email with token
  verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    try {
      const result = await authService.verifyEmail(token);
      
      sendTranslatedResponse(res, 'auth.email.verificationSuccess', {
        statusCode: 200,
        data: result
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError('auth.email.verificationFailed', error.statusCode, error.name);
      }
      throw error;
    }
  });

  // Resend verification email
  resendVerification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    try {
      await authService.resendVerificationEmail(email);
      
      // Always return success for security (don't reveal if email exists)
      sendTranslatedResponse(res, 'auth.email.resendVerification', {
        statusCode: 200
      });
    } catch (error) {
      // Log error but don't expose details
      console.error('Resend verification error:', error);
      
      // Always return success for security
      sendTranslatedResponse(res, 'auth.email.resendVerification', {
        statusCode: 200
      });
    }
  });
}

// Export singleton instance
export const authController = new AuthController();