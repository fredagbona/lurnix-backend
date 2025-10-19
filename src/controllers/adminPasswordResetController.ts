import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { adminPasswordResetService } from '../services/auth';
import { validateRequest } from '../middlewares/validation.js';
import { forgotPasswordSchema, resetPasswordSchema } from '../validation/adminSchemas.js';

export class AdminPasswordResetController {
  // Request password reset
  forgotPassword = [
    validateRequest(forgotPasswordSchema),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { email } = req.body;
      
      const result = await adminPasswordResetService.requestPasswordReset(email);
      
      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    })
  ];

  // Reset password with token
  resetPassword = [
    validateRequest(resetPasswordSchema),
    asyncHandler(async (req: Request, res: Response): Promise<void> => {
      const { token, newPassword } = req.body;
      
      const result = await adminPasswordResetService.resetPassword(token, newPassword);
      
      res.status(200).json({
        success: true,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    })
  ];

}

// Export singleton instance
export const adminPasswordResetController = new AdminPasswordResetController();
