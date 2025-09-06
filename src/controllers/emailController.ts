import { Request, Response } from 'express';
import { emailService } from '../services/emailService.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export class EmailController {
  // Get email service status
  getEmailStatus = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const status = emailService.getStatus();
      const connectivity = await emailService.testConnection();
      
      res.status(200).json({
        success: true,
        data: {
          ...status,
          connectivity,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Get available email templates
  getEmailTemplates = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const templates = emailService.getAvailableTemplates();
      
      res.status(200).json({
        success: true,
        data: {
          templates,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Send test email
  sendTestEmail = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { to, template, templateData } = req.body;

    if (!to) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_RECIPIENT',
          message: 'Email recipient is required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      if (template) {
        // Create template email options
        await emailService.sendTemplateEmail({
          to,
          subject: 'Test Template Email',
          templateName: template,
          templateData: templateData || {}
        });
      } else {
        // Send a default test email
        await emailService.sendEmail({
          to,
          subject: 'Test Email from Lurnix',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <h1>Test Email</h1>
              <p>This is a test email from Lurnix.</p>
              <p>If you received this email, it means the email service is working correctly.</p>
              <p>Sent at: ${new Date().toLocaleString()}</p>
            </div>
          `,
          text: `
            Test Email
            
            This is a test email sent from the Lurnix API.
            Sent at: ${new Date().toISOString()}
            Sent by: ${req.user?.username || 'Unknown'}
          `
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Test email sent successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Send welcome email (for testing)
  sendWelcomeEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, fullname, username } = req.body;

    if (!email || !fullname || !username) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Email, fullname, and username are required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      await emailService.sendWelcomeEmail(email, fullname, username);
      
      res.status(200).json({
        success: true,
        message: 'Welcome email sent successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Send password reset email (for testing)
  sendPasswordResetEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, fullname, resetToken } = req.body;

    if (!email || !fullname || !resetToken) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'Email, fullname, and resetToken are required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    try {
      await emailService.sendPasswordResetEmail(email, fullname, resetToken);
      
      res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Test email connectivity
  testEmailConnectivity = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const isConnected = await emailService.testConnection();
      
      res.status(200).json({
        success: true,
        data: {
          connected: isConnected,
          message: isConnected ? 'Email service is connected' : 'Email service connection failed',
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });
}

// Export singleton instance
export const emailController = new EmailController();