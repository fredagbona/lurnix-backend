import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { authService, AuthServiceError, EmailNotVerifiedError } from '../services/authService.js';
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

export class AuthController {
  // User registration
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const registerData: RegisterRequest = req.body;

    try {
      const result = await authService.register(registerData);
      
      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: result,
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
      throw error; // Let global error handler deal with unexpected errors
    }
  });

  // User login
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const loginData: LoginRequest = req.body;

    try {
      const result = await authService.login(loginData);
      
      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: result,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof EmailNotVerifiedError) {
        // Special handling for unverified email
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.name,
            message: error.message,
            requiresVerification: true
          },
          timestamp: new Date().toISOString(),
        });
        return;
      } else if (error instanceof AuthServiceError) {
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

  // Forgot password
  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const forgotPasswordData: ForgotPasswordRequest = req.body;

    try {
      // Check rate limiting
      if (passwordResetService.isRateLimited(forgotPasswordData.email)) {
        res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many password reset requests. Please try again later.',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      // Initiate password reset
      const result = await passwordResetService.initiatePasswordReset(forgotPasswordData);
      
      // For security, always return success regardless of whether email exists
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a password reset link has been sent.',
        timestamp: new Date().toISOString(),
      });

      // Email is sent automatically by the password reset service
      if (result.token && result.userId) {
        console.log(`Password reset initiated for user ${result.userId}`);
      }
    } catch (error) {
      if (error instanceof PasswordResetError) {
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

  // Reset password
  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const resetPasswordData: ResetPasswordRequest = req.body;

    try {
      await passwordResetService.resetPassword(resetPasswordData);
      
      res.status(200).json({
        success: true,
        message: 'Password has been reset successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      if (error instanceof PasswordResetError) {
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

 

  // Refresh token
  refreshToken = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId; // From auth middleware

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
      const newToken = await authService.refreshToken(userId);
      
      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newToken,
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

  // Verify email with token
  verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    try {
      const result = await authService.verifyEmail(token);
      
      res.status(200).json({
        success: true,
        message: 'Email verified successfully',
        data: result,
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

  // Resend verification email
  resendVerification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    try {
      await authService.resendVerificationEmail(email);
      
      // Always return success for security (don't reveal if email exists)
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a verification email has been sent.',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      // Log error but don't expose details
      console.error('Resend verification error:', error);
      
      // Always return success for security
      res.status(200).json({
        success: true,
        message: 'If an account with that email exists, a verification email has been sent.',
        timestamp: new Date().toISOString(),
      });
    }
  });
}

// Export singleton instance
export const authController = new AuthController();