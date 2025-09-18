import nodemailer from 'nodemailer';
import { EmailServiceError } from '../errors/AppError';

// Email template types
export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private transporter;
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    // Configure Nodemailer transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',  // SMTP server
      port: Number(process.env.SMTP_PORT) || 465,       // SSL port
      secure: true,                                    // true for 465, false for other ports
      auth: {
        user: process.env.FROM_EMAIL,
        pass: process.env.EMAIL_PASSWORD,             // App Password si Gmail
      },
    });

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
          <p>If you didn't request this password reset, please ignore this email.</p>
        </div>
      `,
    });

    // Add more templates as needed...
  }

  // Send email
  async sendEmail(to: string, subject: string, html: string, text?: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"Lurnix" <${process.env.FROM_EMAIL}>`,
        to,
        subject,
        html,
        text,
      });
      console.log('Email sent:', info.messageId);
    } catch (err) {
      console.error('Failed to send email:', err);
      throw new EmailServiceError('Failed to send email');
    }
  }

  // Send template email
  async sendTemplateEmail(templateName: string, to: string, templateData: Record<string, any> = {}) {
    const template = this.templates.get(templateName);
    if (!template) throw new EmailServiceError(`Template '${templateName}' not found`);

    const subject = this.replaceTemplateVariables(template.subject, templateData);
    const html = this.replaceTemplateVariables(template.html, templateData);
    const text = template.text ? this.replaceTemplateVariables(template.text, templateData) : undefined;

    await this.sendEmail(to, subject, html, text);
  }

  // Replace {{variables}} in templates
  private replaceTemplateVariables(template: string, data: Record<string, any>): string {
    let result = template;
    Object.keys(data).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      result = result.replace(regex, data[key] || '');
    });
    return result;
  }

  // Convenience methods for common emails
  async sendWelcomeEmail(email: string, fullname: string, username: string) {
    const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/login`;
    await this.sendTemplateEmail('welcome', email, { fullname, username, loginUrl });
  }

  async sendPasswordResetEmail(email: string, fullname: string, resetToken: string) {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    await this.sendTemplateEmail('passwordReset', email, { fullname, resetUrl });
  }
}

// Export singleton instance
export const emailService = new EmailService();
