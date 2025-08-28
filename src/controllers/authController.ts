import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { authService, AuthServiceError } from '../services/authService.js';
import { passwordResetService, PasswordResetError } from '../services/passwordResetService.js';
import { 
  RegisterRequest, 
  LoginRequest, 
  ForgotPasswordRequest, 
  ResetPasswordRequest 
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

  // Verify reset token
  verifyResetToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    try {
      const verification = await passwordResetService.verifyResetToken(token);
      
      res.status(200).json({
        success: true,
        data: {
          valid: verification.valid,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired reset token',
        },
        timestamp: new Date().toISOString(),
      });
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

  // Logout (optional - for token blacklisting if implemented)
  logout = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // For now, just return success
    // In a more advanced implementation, you might blacklist the token
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
      timestamp: new Date().toISOString(),
    });
  });

  // Check authentication status
  checkAuth = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId; // From auth middleware

    if (!userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'User is not authenticated',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      const userProfile = await authService.getUserProfile(userId);
      
      res.status(200).json({
        success: true,
        message: 'User is authenticated',
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
}

// Export singleton instance
export const authController = new AuthController();