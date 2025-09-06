import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import { config } from '../config/environment';

interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  templateName: string;
  templateData: Record<string, any>;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    path: string;
    contentType?: string;
  }>;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  message?: string;
  error?: Error;
}

export class EmailService {
  private templatesDir: string;
  private transporter: nodemailer.Transporter;

  constructor() {
    this.templatesDir = path.join(__dirname, 'templates');
    
    // Create reusable transporter object using SMTP transport
    this.transporter = nodemailer.createTransport({
      host: config.EMAIL_HOST,
      port: config.EMAIL_PORT,
      secure: config.EMAIL_PORT === 465, // Always use secure=true for port 465
      auth: {
        user: config.EMAIL_USER,
        pass: config.EMAIL_PASSWORD
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      }
    });
  }

  /**
   * Send an email using a template
   * @param options Email options including template name and data
   * @returns Promise with send info
   */
  async sendTemplateEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      if (!config.EMAIL_ENABLED) {
        console.log('Email sending is disabled. Would have sent:', options);
        return { success: true, message: 'Email sending is disabled' };
      }

      // Read the template file
      const templatePath = path.join(this.templatesDir, `${options.templateName}.html`);
      const templateSource = fs.readFileSync(templatePath, 'utf8');
      
      // Compile the template
      const template = Handlebars.compile(templateSource);
      
      // Add common template data
      const templateData = {
        ...options.templateData,
        currentYear: new Date().getFullYear(),
        logoUrl: config.LOGO_URL || 'https://lurnix.com/logo.png',
        unsubscribeUrl: `${config.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(options.to)}`,
        supportEmail: 'support@lurnix.com'
      };
      
      // Render the template with data
      const html = template(templateData);
      
      // Prepare email options for Nodemailer
      const mailOptions: nodemailer.SendMailOptions = {
        from: {
          name: config.EMAIL_FROM_NAME,
          address: config.EMAIL_FROM_ADDRESS
        },
        to: options.toName ? `"${options.toName}" <${options.to}>` : options.to,
        subject: options.subject,
        html: html,
        attachments: options.attachments || []
      };
      
      // Add CC and BCC if provided
      if (options.cc) {
        mailOptions.cc = options.cc;
      }
      
      if (options.bcc) {
        mailOptions.bcc = options.bcc;
      }
      
      // Log email sending details for debugging
      console.log('Sending email to:', options.to);
      console.log('Using SMTP server:', config.EMAIL_HOST);
      console.log('SMTP credentials configured:', config.EMAIL_USER ? 'Yes' : 'No');
      
      // Send the email via Nodemailer
      const info = await this.transporter.sendMail(mailOptions);
      
      // Log the sending result
      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending email:', error);
      return { 
        success: false, 
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }

  /**
   * Send a registration confirmation email
   * @param to Recipient email
   * @param name Recipient name
   * @param verificationUrl URL for email verification
   */
  async sendRegistrationEmail(
    to: string, 
    name: string, 
    verificationUrl: string
  ): Promise<EmailResult> {
    return this.sendTemplateEmail({
      to,
      toName: name,
      subject: 'Welcome to Lurnix - Verify Your Email',
      templateName: 'registration',
      templateData: {
        name,
        email: to,
        verificationUrl,
      },
    });
  }

  /**
   * Send a welcome email after verification
   * @param to Recipient email
   * @param name Recipient name
   * @param dashboardUrl URL to user dashboard
   */
  async sendWelcomeAfterVerificationEmail(
    to: string, 
    name: string, 
    dashboardUrl: string
  ): Promise<EmailResult> {
    return this.sendTemplateEmail({
      to,
      toName: name,
      subject: 'Welcome to Lurnix - Your Account is Ready!',
      templateName: 'welcomeAfterVerification',
      templateData: {
        name,
        email: to,
        dashboardUrl,
        course1Name: 'Getting Started with Lurnix',
        course1Url: `${config.FRONTEND_URL}/courses/getting-started`,
        course2Name: 'Web Development Fundamentals',
        course2Url: `${config.FRONTEND_URL}/courses/web-dev-fundamentals`,
        course3Name: 'Introduction to JavaScript',
        course3Url: `${config.FRONTEND_URL}/courses/intro-javascript`,
      },
    });
  }

  /**
   * Send a password reset email
   * @param to Recipient email
   * @param name Recipient name
   * @param resetToken Reset token for password reset
   */
  async sendPasswordResetEmail(
    to: string, 
    name: string, 
    resetToken: string
  ): Promise<EmailResult> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;
    
    return this.sendTemplateEmail({
      to,
      toName: name,
      subject: 'Reset Your Lurnix Password',
      templateName: 'passwordReset',
      templateData: {
        name,
        email: to,
        resetUrl,
      },
    });
  }

  /**
   * Send a password changed confirmation email
   * @param to Recipient email
   * @param name Recipient name
   * @param changeDate Date of password change
   * @param ipAddress IP address where change was made
   */
  async sendPasswordChangedEmail(
    to: string, 
    name: string, 
    changeDate: string, 
    ipAddress: string
  ): Promise<EmailResult> {
    return this.sendTemplateEmail({
      to,
      toName: name,
      subject: 'Your Lurnix Password Has Been Changed',
      templateName: 'passwordChanged',
      templateData: {
        name,
        email: to,
        changeDate,
        ipAddress,
        supportUrl: `${config.FRONTEND_URL}/support`,
      },
    });
  }

  /**
   * Send an account deletion confirmation email
   * @param to Recipient email
   * @param name Recipient name
   * @param username Username of deleted account
   */
  async sendAccountDeletedEmail(
    to: string, 
    name: string, 
    username: string
  ): Promise<EmailResult> {
    return this.sendTemplateEmail({
      to,
      toName: name,
      subject: 'Your Lurnix Account Has Been Deleted',
      templateName: 'accountDeleted',
      templateData: {
        name,
        email: to,
        username,
        deletionDate: new Date().toLocaleDateString(),
        supportEmail: 'support@lurnix.com',
      },
    });
  }
  
  /**
   * Test email connectivity
   * @returns Promise with connection status
   */
  async testConnection(): Promise<boolean> {
    try {
      // Test connection by verifying SMTP connection
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email service connectivity test failed:', error);
      return false;
    }
  }

  /**
   * Get email service status
   * @returns Email service status
   */
  getStatus(): {
    enabled: boolean;
    configured: boolean;
    host?: string;
    fromEmail: string;
    apiUrl?: string;
  } {
    return {
      enabled: config.EMAIL_ENABLED,
      configured: !!(config.EMAIL_HOST && config.EMAIL_USER && config.EMAIL_PASSWORD),
      host: config.EMAIL_HOST,
      fromEmail: config.EMAIL_FROM_ADDRESS
    };
  }
  
  /**
   * Get available email templates
   * @returns List of available template names
   */
  getAvailableTemplates(): string[] {
    try {
      const files = fs.readdirSync(this.templatesDir);
      return files
        .filter(file => file.endsWith('.html'))
        .map(file => file.replace('.html', ''));
    } catch (error) {
      console.error('Error reading template directory:', error);
      return [];
    }
  }
  
  /**
   * Send a direct email without using a template
   * @param options Email options
   * @returns Promise with send result
   */
  async sendEmail(options: {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
  }): Promise<EmailResult> {
    try {
      if (!config.EMAIL_ENABLED) {
        console.log('Email sending is disabled. Would have sent:', options);
        return { success: true, message: 'Email sending is disabled' };
      }
      
      // Prepare email options for Nodemailer
      const mailOptions: nodemailer.SendMailOptions = {
        from: {
          name: config.EMAIL_FROM_NAME,
          address: config.EMAIL_FROM_ADDRESS
        },
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || (options.html ? undefined : 'No content provided')
      };
      
      // Log email sending details for debugging
      console.log('Sending direct email to:', options.to);
      
      // Send the email via Nodemailer
      const info = await this.transporter.sendMail(mailOptions);
      
      // Log the sending result
      console.log('Email sent successfully:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('Error sending direct email:', error);
      return { 
        success: false, 
        message: `Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error : new Error('Unknown error')
      };
    }
  }
  
  /**
   * Send a welcome email
   * @param email Recipient email
   * @param fullname Recipient name
   * @param username Username
   */
  async sendWelcomeEmail(
    email: string,
    fullname: string,
    username: string
  ): Promise<EmailResult> {
    const loginUrl = `${config.FRONTEND_URL}/login`;
    
    return this.sendTemplateEmail({
      to: email,
      toName: fullname,
      subject: 'Welcome to Lurnix!',
      templateName: 'welcome',
      templateData: {
        fullname,
        username,
        loginUrl,
      },
    });
  }
  
  /**
   * Send an admin welcome email
   * @param email Admin email
   * @param name Admin name
   * @param role Admin role
   * @param createdBy Name of admin who created this account
   */
  async sendAdminWelcomeEmail(
    email: string,
    name: string,
    role: string,
    createdBy: string
  ): Promise<EmailResult> {
    const loginUrl = `${config.FRONTEND_URL}/admin/login`;
    
    return this.sendTemplateEmail({
      to: email,
      toName: name,
      subject: 'Welcome to Lurnix Admin Panel',
      templateName: 'adminWelcome',
      templateData: {
        name,
        email,
        role,
        createdBy,
        loginUrl,
      },
    });
  }
  
  /**
   * Send an admin password reset email
   * @param email Admin email
   * @param name Admin name
   * @param resetToken Reset token
   */
  async sendAdminPasswordResetEmail(
    email: string,
    name: string,
    resetToken: string
  ): Promise<EmailResult> {
    const resetUrl = `${config.FRONTEND_URL}/admin/reset-password?token=${resetToken}`;
    
    return this.sendTemplateEmail({
      to: email,
      toName: name,
      subject: 'Admin Password Reset - Lurnix',
      templateName: 'adminPasswordReset',
      templateData: {
        name,
        email,
        resetUrl,
        currentYear: new Date().getFullYear(),
      },
    });
  }
}

// Export a singleton instance
export const emailService = new EmailService();
