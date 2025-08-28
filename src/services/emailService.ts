import { EmailServiceError } from '../errors/AppError';

// Use node-fetch for Node.js compatibility
const fetch = globalThis.fetch || require('node-fetch');

// Email template types
export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

// Email sending options
export interface EmailOptions {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: Record<string, any>;
  attachments?: Array<{
    filename: string;
    data: Buffer | string;
    contentType?: string;
  }>;
  tags?: string[];
  priority?: 'high' | 'normal' | 'low';
}

// Mailzeet API interfaces
interface MailzeetSender {
  email: string;
  name: string;
}

interface MailzeetRecipient {
  email: string;
  name?: string;
}

interface MailzeetPayload {
  sender: MailzeetSender;
  recipients: MailzeetRecipient[];
  subject: string;
  text?: string;
  html?: string;
  template_id?: string;
  params?: Record<string, any>;
}

// Email service configuration
interface EmailConfig {
  apiKey: string;
  apiUrl: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

export class EmailService {
  private config: EmailConfig;
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.config = {
      apiKey: process.env.MAILZEET_API_KEY || '',
      apiUrl: process.env.MAILZEET_API_URL || 'https://api.mailzeet.com/v1/mails',
      fromEmail: process.env.FROM_EMAIL || 'noreply@lurnix.com',
      fromName: process.env.FROM_NAME || 'Lurnix',
      enabled: process.env.EMAIL_ENABLED !== 'false',
    };

    this.initializeTemplates();
  }

  // Initialize email templates
  private initializeTemplates(): void {
    // Welcome email template
    this.templates.set('welcome', {
      subject: 'Welcome to Lurnix!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Lurnix, {{fullname}}!</h1>
          <p>Thank you for joining our AI-powered learning platform.</p>
          <p>Your account has been successfully created with the username: <strong>{{username}}</strong></p>
          <p>You can now start your learning journey by logging into your account.</p>
          <div style="margin: 30px 0;">
            <a href="{{loginUrl}}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Get Started
            </a>
          </div>
          <p>If you have any questions, feel free to contact our support team.</p>
          <p>Best regards,<br>The Lurnix Team</p>
        </div>
      `,
      text: `
        Welcome to Lurnix, {{fullname}}!
        
        Thank you for joining our AI-powered learning platform.
        Your account has been successfully created with the username: {{username}}
        
        You can now start your learning journey by logging into your account at: {{loginUrl}}
        
        If you have any questions, feel free to contact our support team.
        
        Best regards,
        The Lurnix Team
      `,
    });

    // Password reset email template
    this.templates.set('passwordReset', {
      subject: 'Reset Your Lurnix Password',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Password Reset Request</h1>
          <p>Hello {{fullname}},</p>
          <p>We received a request to reset your password for your Lurnix account.</p>
          <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
          <div style="margin: 30px 0;">
            <a href="{{resetUrl}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Reset Password
            </a>
          </div>
          <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
          <p>For security reasons, this link will expire in 1 hour.</p>
          <p>Best regards,<br>The Lurnix Team</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            If the button doesn't work, copy and paste this link into your browser:<br>
            {{resetUrl}}
          </p>
        </div>
      `,
      text: `
        Password Reset Request
        
        Hello {{fullname}},
        
        We received a request to reset your password for your Lurnix account.
        
        Please visit the following link to reset your password (expires in 1 hour):
        {{resetUrl}}
        
        If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
        
        Best regards,
        The Lurnix Team
      `,
    });

    // Password changed confirmation email
    this.templates.set('passwordChanged', {
      subject: 'Your Lurnix Password Has Been Changed',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Password Changed Successfully</h1>
          <p>Hello {{fullname}},</p>
          <p>This email confirms that your Lurnix account password has been successfully changed.</p>
          <p><strong>Change Details:</strong></p>
          <ul>
            <li>Date: {{changeDate}}</li>
            <li>Time: {{changeTime}}</li>
            <li>IP Address: {{ipAddress}}</li>
          </ul>
          <p>If you didn't make this change, please contact our support team immediately.</p>
          <div style="margin: 30px 0;">
            <a href="{{supportUrl}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">
              Contact Support
            </a>
          </div>
          <p>Best regards,<br>The Lurnix Team</p>
        </div>
      `,
      text: `
        Password Changed Successfully
        
        Hello {{fullname}},
        
        This email confirms that your Lurnix account password has been successfully changed.
        
        Change Details:
        - Date: {{changeDate}}
        - Time: {{changeTime}}
        - IP Address: {{ipAddress}}
        
        If you didn't make this change, please contact our support team immediately at: {{supportUrl}}
        
        Best regards,
        The Lurnix Team
      `,
    });

    // Account deletion confirmation email
    this.templates.set('accountDeleted', {
      subject: 'Your Lurnix Account Has Been Deleted',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Account Deletion Confirmation</h1>
          <p>Hello {{fullname}},</p>
          <p>This email confirms that your Lurnix account has been successfully deleted.</p>
          <p><strong>Deletion Details:</strong></p>
          <ul>
            <li>Username: {{username}}</li>
            <li>Email: {{email}}</li>
            <li>Deletion Date: {{deletionDate}}</li>
          </ul>
          <p>Your account data has been deactivated and will be permanently removed from our systems within 30 days.</p>
          <p>If you deleted your account by mistake, please contact our support team within 30 days to restore it.</p>
          <p>Thank you for being part of the Lurnix community.</p>
          <p>Best regards,<br>The Lurnix Team</p>
        </div>
      `,
      text: `
        Account Deletion Confirmation
        
        Hello {{fullname}},
        
        This email confirms that your Lurnix account has been successfully deleted.
        
        Deletion Details:
        - Username: {{username}}
        - Email: {{email}}
        - Deletion Date: {{deletionDate}}
        
        Your account data has been deactivated and will be permanently removed from our systems within 30 days.
        
        If you deleted your account by mistake, please contact our support team within 30 days to restore it.
        
        Thank you for being part of the Lurnix community.
        
        Best regards,
        The Lurnix Team
      `,
    });
  }

  // Send email using template
  async sendTemplateEmail(
    templateName: string,
    to: string,
    templateData: Record<string, any> = {}
  ): Promise<void> {
    if (!this.config.enabled) {
      console.log(`Email service disabled. Would send ${templateName} email to ${to}`);
      return;
    }

    const template = this.templates.get(templateName);
    if (!template) {
      throw new EmailServiceError(`Email template '${templateName}' not found`);
    }

    // Replace template variables
    const subject = this.replaceTemplateVariables(template.subject, templateData);
    const html = this.replaceTemplateVariables(template.html, templateData);
    const text = this.replaceTemplateVariables(template.text, templateData);

    await this.sendEmail({
      to,
      subject,
      html,
      text,
      tags: [templateName],
    });
  }

  // Send custom email using Mailzeet API
  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.config.enabled) {
      console.log(`Email service disabled. Would send email to ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      return;
    }

    if (!this.config.apiKey) {
      throw new EmailServiceError('Mailzeet API key not configured. Check MAILZEET_API_KEY environment variable.');
    }

    try {
      // Prepare recipients
      const recipients: MailzeetRecipient[] = Array.isArray(options.to)
        ? options.to.map(email => ({ email }))
        : [{ email: options.to }];

      // Prepare Mailzeet payload
      const payload: MailzeetPayload = {
        sender: {
          email: this.config.fromEmail,
          name: this.config.fromName,
        },
        recipients,
        subject: options.subject,
      };

      // Add content
      if (options.html) {
        payload.html = options.html;
      }

      if (options.text) {
        payload.text = options.text;
      }

      // Add template data if using template
      if (options.template) {
        payload.template_id = options.template;
        if (options.templateData) {
          payload.params = options.templateData;
        }
      }

      // Prepare headers
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      };

      // Send email via Mailzeet API
      const response = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Mailzeet API error: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`);
      }

      const result = await response.json();
      console.log(`Email sent successfully to ${options.to}. Response:`, result);
    } catch (error) {
      console.error('Failed to send email:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new EmailServiceError(`Failed to send email: ${errorMessage}`);
    }
  }

  // Send welcome email
  async sendWelcomeEmail(
    email: string,
    fullname: string,
    username: string
  ): Promise<void> {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
    
    await this.sendTemplateEmail('welcome', email, {
      fullname,
      username,
      loginUrl,
    });
  }

  // Send password reset email
  async sendPasswordResetEmail(
    email: string,
    fullname: string,
    resetToken: string
  ): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    await this.sendTemplateEmail('passwordReset', email, {
      fullname,
      resetUrl,
    });
  }

  // Send password changed confirmation email
  async sendPasswordChangedEmail(
    email: string,
    fullname: string,
    ipAddress: string
  ): Promise<void> {
    const now = new Date();
    const supportUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/support`;
    
    await this.sendTemplateEmail('passwordChanged', email, {
      fullname,
      changeDate: now.toLocaleDateString(),
      changeTime: now.toLocaleTimeString(),
      ipAddress,
      supportUrl,
    });
  }

  // Send account deletion confirmation email
  async sendAccountDeletedEmail(
    email: string,
    fullname: string,
    username: string
  ): Promise<void> {
    const deletionDate = new Date().toLocaleDateString();
    
    await this.sendTemplateEmail('accountDeleted', email, {
      fullname,
      username,
      email,
      deletionDate,
    });
  }

  // Utility method to replace template variables
  private replaceTemplateVariables(template: string, data: Record<string, any>): string {
    let result = template;
    
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, data[key] || '');
    });
    
    return result;
  }

  // Test email connectivity with Mailzeet
  async testConnection(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    if (!this.config.apiKey) {
      return false;
    }

    try {
      // Test connection by making a simple API call to Mailzeet
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      };

      const response = await fetch(this.config.apiUrl.replace('/mails', '/account'), {
        method: 'GET',
        headers,
      });

      return response.ok;
    } catch (error) {
      console.error('Email service connectivity test failed:', error);
      return false;
    }
  }

  // Get email service status
  getStatus(): {
    enabled: boolean;
    configured: boolean;
    apiUrl: string;
    fromEmail: string;
  } {
    return {
      enabled: this.config.enabled,
      configured: !!(this.config.apiKey && this.config.apiUrl),
      apiUrl: this.config.apiUrl,
      fromEmail: this.config.fromEmail,
    };
  }

  // Add custom template
  addTemplate(name: string, template: EmailTemplate): void {
    this.templates.set(name, template);
  }

  // Get available templates
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}

// Export singleton instance
export const emailService = new EmailService();