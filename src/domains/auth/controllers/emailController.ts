import { Request, Response } from 'express';
import { emailService } from '../../../services/communication';
import { asyncHandler } from '../../../middlewares/errorMiddleware.js';
import { AuthRequest } from '../../../middlewares/authMiddleware.js';
import { sendTranslatedResponse } from '../../../utils/translationUtils.js';
import { AppError } from '../../../errors/AppError.js';
import { I18nRequest } from '../../../config/i18n/types.js';

export class EmailController {
  // Get email service status
  getEmailStatus = asyncHandler(async (req: I18nRequest, res: Response): Promise<void> => {
    try {
      const status = emailService.getStatus();
      const connectivity = await emailService.testConnection();
      
      sendTranslatedResponse(res, 'email.status.success', {
        statusCode: 200,
        data: {
          ...status,
          connectivity,
        }
      });
    } catch (error) {
      throw error;
    }
  });

  // Get available email templates
  getEmailTemplates = asyncHandler(async (req: I18nRequest, res: Response): Promise<void> => {
    try {
      const templates = emailService.getAvailableTemplates();
      
      sendTranslatedResponse(res, 'email.templates.success', {
        statusCode: 200,
        data: { templates }
      });
    } catch (error) {
      throw error;
    }
  });

  // Send test email
  sendTestEmail = asyncHandler(async (req: AuthRequest & I18nRequest, res: Response): Promise<void> => {
    const { to, template, templateData } = req.body;
    const language = (req.language || 'en') as 'en' | 'fr';

    if (!to) {
      throw new AppError('email.errors.missingRecipient', 400, 'MISSING_RECIPIENT');
    }

    try {
      if (template) {
        // Create template email options
        await emailService.sendTemplateEmail({
          to,
          toName: req.body.fullname || 'User',
          subject: 'Test Template Email',
          templateName: template,
          templateData: templateData || {},
          language
        });
      } else {
        // Send a default test email
        const subjects = {
          en: 'Test Email from Lurnix',
          fr: 'Email de test de Lurnix'
        } as const;
        
        type EmailContent = {
          title: string;
          description: string;
          confirmation: string;
          sentBy: string;
        }
        
        const content: Record<'en' | 'fr', EmailContent> = {
          en: {
            title: 'Test Email',
            description: 'This is a test email from Lurnix.',
            confirmation: 'If you received this email, it means the email service is working correctly.',
            sentBy: `Sent by: ${req.user?.username || 'Unknown'}`
          },
          fr: {
            title: 'Email de test',
            description: 'Ceci est un email de test de Lurnix.',
            confirmation: 'Si vous avez reçu cet email, cela signifie que le service email fonctionne correctement.',
            sentBy: `Envoyé par : ${req.user?.username || 'Inconnu'}`
          }
        };

        const dateFormatter = new Intl.DateTimeFormat(language === 'fr' ? 'fr-FR' : 'en-US', {
          dateStyle: 'full',
          timeStyle: 'long'
        });

        await emailService.sendEmail({
          to,
          subject: subjects[language],
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
              <h1>${content[language].title}</h1>
              <p>${content[language].description}</p>
              <p>${content[language].confirmation}</p>
              <p>${dateFormatter.format(new Date())}</p>
            </div>
          `,
          text: `
            ${content[language].title}
            
            ${content[language].description}
            ${content[language].confirmation}
            ${dateFormatter.format(new Date())}
            ${content[language].sentBy}
          `
        });
      }
      
      sendTranslatedResponse(res, 'email.test.success', {
        statusCode: 200,
        data: { sent: true }
      });
    } catch (error) {
      throw error;
    }
  });

  // Send welcome email (for testing)
  sendWelcomeEmail = asyncHandler(async (req: I18nRequest, res: Response): Promise<void> => {
    const { email, fullname, username } = req.body;
    const language = (req.language || 'en') as 'en' | 'fr';

    if (!email || !fullname || !username) {
      throw new AppError('email.welcome.missingParameters', 400, 'MISSING_PARAMETERS');
    }

    try {
      await emailService.sendWelcomeEmail(email, fullname, username, language);
      
      sendTranslatedResponse(res, 'email.welcome.success', {
        statusCode: 200,
        data: { sent: true }
      });
    } catch (error) {
      throw error;
    }
  });

  // Send password reset email (for testing)
  sendPasswordResetEmail = asyncHandler(async (req: I18nRequest, res: Response): Promise<void> => {
    const { email, fullname, resetToken } = req.body;
    const language = (req.language || 'en') as 'en' | 'fr';

    if (!email || !fullname || !resetToken) {
      throw new AppError('email.reset.missingParameters', 400, 'MISSING_PARAMETERS');
    }

    try {
      await emailService.sendPasswordResetEmail(email, fullname, resetToken, language);
      
      sendTranslatedResponse(res, 'email.reset.success', {
        statusCode: 200,
        data: { sent: true }
      });
    } catch (error) {
      throw error;
    }
  });

  // Test email connectivity
  testEmailConnectivity = asyncHandler(async (req: I18nRequest, res: Response): Promise<void> => {
    try {
      const isConnected = await emailService.testConnection();
      
      sendTranslatedResponse(res, isConnected ? 'email.connectivity.success' : 'email.connectivity.failed', {
        statusCode: 200,
        data: { connected: isConnected }
      });
    } catch (error) {
      throw error;
    }
  });
}

// Export singleton instance
export const emailController = new EmailController();