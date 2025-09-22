import fs from 'fs';
import path from 'path';
import Handlebars from 'handlebars';
import nodemailer from 'nodemailer';
import { config } from '../config/environment';
import { getTranslation } from '../config/i18n/index.js';

interface EmailOptions {
  to: string;
  toName?: string;
  subject: string;
  templateName: string;
  templateData: Record<string, any>;
  language?: 'en' | 'fr';  // Added language option
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

      // Get template path with language fallback
      const language = options.language || 'en';
      const templatePath = this.getTemplatePath(options.templateName, language);
      
      // Read template content
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
    verificationUrl: string,
    language?: 'en' | 'fr'
  ): Promise<EmailResult> {
    const lang = language || 'en';
    const t = (key: string, params?: Record<string, unknown>) => getTranslation(key, lang, params ?? {});
    const steps = getTranslation('emails.registration.steps', lang, { returnObjects: true }) as unknown as string[];

    return this.sendTemplateEmail({
      to,
      toName: name,
      subject: t('emails.registration.subject'),
      templateName: 'registration',
      language,
      templateData: {
        name,
        email: to,
        verificationUrl,
        headline: t('emails.registration.headline'),
        greeting: t('emails.common.greeting', { name }),
        intro: t('emails.registration.intro'),
        ctaLabel: t('emails.registration.cta'),
        stepsTitle: t('emails.registration.stepsTitle'),
        steps,
        expirationNote: t('emails.registration.expirationNote'),
        supportText: t('emails.common.support'),
        closing: t('emails.common.closing'),
        signature: t('emails.common.signature'),
        supportFooter: t('emails.common.supportFooter', { email: to }),
        footerLegal: t('emails.common.footerLegal', { email: to }),
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
    dashboardUrl: string,
    language?: 'en' | 'fr'
  ): Promise<EmailResult> {
    const lang = language || 'en';
    const t = (key: string, params?: Record<string, unknown>) => getTranslation(key, lang, params ?? {});
    const steps = getTranslation('emails.welcome.steps', lang, { returnObjects: true }) as unknown as string[];
    const courses = [
      { name: t('emails.welcome.course1Name'), url: `${config.FRONTEND_URL}/courses/getting-started` },
      { name: t('emails.welcome.course2Name'), url: `${config.FRONTEND_URL}/courses/web-dev-fundamentals` },
      { name: t('emails.welcome.course3Name'), url: `${config.FRONTEND_URL}/courses/intro-javascript` },
    ];

    return this.sendTemplateEmail({
      to,
      toName: name,
      subject: t('emails.welcome.subject', { name }),
      templateName: 'welcomeAfterVerification',
      language,
      templateData: {
        name,
        email: to,
        dashboardUrl,
        headline: t('emails.welcome.headline'),
        greeting: t('emails.common.greeting', { name }),
        intro: t('emails.welcome.intro'),
        courseIntro: t('emails.welcome.courseIntro'),
        courses,
        stepTitle: t('emails.welcome.stepTitle'),
        steps,
        cta: t('emails.welcome.cta'),
        supportText: t('emails.common.support'),
        closing: t('emails.common.closing'),
        signature: t('emails.common.signature'),
        supportFooter: t('emails.common.supportFooter', { email: to }),
        footerLegal: t('emails.common.footerLegal', { email: to }),
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
    resetToken: string,
    language?: 'en' | 'fr'
  ): Promise<EmailResult> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const lang = language || 'en';
    const t = (key: string, params?: Record<string, unknown>) => getTranslation(key, lang, params ?? {});
    
    return this.sendTemplateEmail({
      to,
      toName: name,
      subject: t('emails.passwordReset.subject'),
      templateName: 'passwordReset',
      language,
      templateData: {
        name,
        email: to,
        resetUrl,
        headline: t('emails.passwordReset.headline'),
        greeting: t('emails.common.greeting', { name }),
        intro: t('emails.passwordReset.intro'),
        ctaLabel: t('emails.passwordReset.cta'),
        ignoreNote: t('emails.passwordReset.ignore'),
        supportText: t('emails.common.support'),
        closing: t('emails.common.closing'),
        signature: t('emails.common.signature'),
        supportFooter: t('emails.common.supportFooter', { email: to }),
        footerLegal: t('emails.common.footerLegal', { email: to }),
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
    ipAddress: string,
    language?: 'en' | 'fr'
  ): Promise<EmailResult> {
    const lang = language || 'en';
    const t = (key: string, params?: Record<string, unknown>) => getTranslation(key, lang, params ?? {});

    return this.sendTemplateEmail({
      to,
      toName: name,
      subject: t('emails.passwordChanged.subject'),
      templateName: 'passwordChanged',
      language,
      templateData: {
        name,
        email: to,
        headline: t('emails.passwordChanged.headline'),
        greeting: t('emails.common.greeting', { name }),
        intro: t('emails.passwordChanged.intro', { changeDate, ipAddress }),
        changeDate,
        ipAddress,
        changeDateLabel: t('emails.passwordChanged.changeDateLabel'),
        ipAddressLabel: t('emails.passwordChanged.ipAddressLabel'),
        supportUrl: `${config.FRONTEND_URL}/support`,
        supportText: t('emails.common.support'),
        closing: t('emails.common.closing'),
        signature: t('emails.common.signature'),
        supportFooter: t('emails.common.supportFooter', { email: to }),
        footerLegal: t('emails.common.footerLegal', { email: to }),
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
    username: string,
    language?: 'en' | 'fr'
  ): Promise<EmailResult> {
    const lang = language || 'en';
    const t = (key: string, params?: Record<string, unknown>) => getTranslation(key, lang, params ?? {});

    return this.sendTemplateEmail({
      to,
      toName: name,
      subject: t('emails.accountDeleted.subject'),
      templateName: 'accountDeleted',
      language,
      templateData: {
        name,
        email: to,
        username,
        deletionDate: new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US'),
        supportEmail: 'support@lurnix.com',
        headline: t('emails.accountDeleted.headline'),
        greeting: t('emails.common.greeting', { name }),
        intro: t('emails.accountDeleted.intro', { username }),
        ctaLabel: t('emails.accountDeleted.cta'),
        supportUrl: `${config.FRONTEND_URL}/support`,
        supportText: t('emails.common.support'),
        closing: t('emails.common.closing'),
        signature: t('emails.common.signature'),
        supportFooter: t('emails.common.supportFooter', { email: to }),
        footerLegal: t('emails.common.footerLegal', { email: to }),
      },
    });
  }

  async sendSubscriptionConfirmationEmail(options: {
    to: string;
    name: string;
    planName: string;
    billingCycle: string;
    amount: string;
    currency: string;
    nextBillingDate: string;
    paymentMethod: string;
    features: string[];
    accountUrl: string;
    email: string;
    language?: 'en' | 'fr';
  }): Promise<EmailResult> {
    const lang = options.language || 'en';
    const t = (key: string, params?: Record<string, unknown>) => getTranslation(key, lang, params ?? {});

    return this.sendTemplateEmail({
      to: options.to,
      toName: options.name,
      subject: t('emails.subscription.confirmation.subject', { planName: options.planName }),
      templateName: 'subscriptionConfirmation',
      language: options.language,
      templateData: {
        name: options.name,
        email: options.email,
        planName: options.planName,
        billingCycle: options.billingCycle,
        amount: options.amount,
        currency: options.currency,
        nextBillingDate: options.nextBillingDate,
        paymentMethod: options.paymentMethod,
        features: options.features,
        accountUrl: options.accountUrl,
        headline: t('emails.subscription.confirmation.headline'),
        greeting: t('emails.common.greeting', { name: options.name }),
        introHtml: t('emails.subscription.confirmation.intro', { planName: options.planName }),
        detailsTitle: t('emails.subscription.confirmation.detailsTitle'),
        planLabel: t('emails.subscription.confirmation.planLabel'),
        billingCycleLabel: t('emails.subscription.confirmation.billingCycleLabel'),
        amountLabel: t('emails.subscription.confirmation.amountLabel'),
        nextBillingDateLabel: t('emails.subscription.confirmation.nextBillingDateLabel'),
        paymentMethodLabel: t('emails.subscription.confirmation.paymentMethodLabel'),
        featuresTitle: t('emails.subscription.confirmation.featuresTitle'),
        footerNote: t('emails.subscription.confirmation.footerNote'),
        manageCta: t('emails.subscription.confirmation.manageCta'),
        supportText: t('emails.subscription.confirmation.supportText'),
        closing: t('emails.common.closing'),
        signature: t('emails.common.signature'),
        supportFooter: t('emails.common.supportFooter', { email: options.email }),
        footerLegal: t('emails.common.footerLegal', { email: options.email })
      },
    });
  }

  async sendSubscriptionCancellationEmail(options: {
    to: string;
    name: string;
    planName: string;
    cancellationDate: string;
    accessUntilDate: string;
    feedbackUrl: string;
    reactivateUrl: string;
    reason?: string;
    email: string;
    language?: 'en' | 'fr';
  }): Promise<EmailResult> {
    const lang = options.language || 'en';
    const t = (key: string, params?: Record<string, unknown>) => getTranslation(key, lang, params ?? {});

    return this.sendTemplateEmail({
      to: options.to,
      toName: options.name,
      subject: t('emails.subscription.cancellation.subject', { planName: options.planName }),
      templateName: 'subscriptionCancellation',
      language: options.language,
      templateData: {
        name: options.name,
        email: options.email,
        planName: options.planName,
        cancellationDate: options.cancellationDate,
        accessUntilDate: options.accessUntilDate,
        reason: options.reason ?? '',
        feedbackUrl: options.feedbackUrl,
        reactivateUrl: options.reactivateUrl,
        headline: t('emails.subscription.cancellation.headline'),
        greeting: t('emails.common.greeting', { name: options.name }),
        introHtml: t('emails.subscription.cancellation.intro', {
          planName: options.planName,
          effectiveDate: options.accessUntilDate,
        }),
        detailsTitle: t('emails.subscription.cancellation.detailsTitle'),
        planLabel: t('emails.subscription.cancellation.plan'),
        cancellationDateLabel: t('emails.subscription.cancellation.cancellationDateLabel'),
        accessUntilLabel: t('emails.subscription.cancellation.accessUntilLabel'),
        reasonLabel: t('emails.subscription.cancellation.reasonLabel'),
        accessNote: t('emails.subscription.cancellation.accessNote'),
        feedbackTitle: t('emails.subscription.cancellation.feedbackTitle'),
        feedbackText: t('emails.subscription.cancellation.feedbackText'),
        feedbackCta: t('emails.subscription.cancellation.feedbackCta'),
        reactivationNote: t('emails.subscription.cancellation.reactivationNote'),
        reactivateCta: t('emails.subscription.cancellation.reactivateCta'),
        supportText: t('emails.common.support'),
        closing: t('emails.common.closing'),
        signature: t('emails.common.signature'),
        supportFooter: t('emails.common.supportFooter', { email: options.email }),
        footerLegal: t('emails.common.footerLegal', { email: options.email })
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
   * Get template path based on language
   * @param templateName Name of the template
   * @param language Language code ('en' or 'fr')
   * @returns Path to the template
   */
  private getTemplatePath(templateName: string, language: string = 'en'): string {
    const languageSpecificPath = path.join(this.templatesDir, language, `${templateName}.html`);
    const defaultPath = path.join(this.templatesDir, 'en', `${templateName}.html`);
    
    if (fs.existsSync(languageSpecificPath)) {
      return languageSpecificPath;
    }
    
    if (fs.existsSync(defaultPath)) {
      console.warn(`Template not found for language ${language}, falling back to English template`);
      return defaultPath;
    }
    
    throw new Error(`Template ${templateName} not found in any language`);
  }

  /**
   * Check if a template exists for a specific language
   * @param templateName Name of the template
   * @param language Language code ('en' or 'fr')
   * @returns boolean indicating if template exists
   */
  hasTemplate(templateName: string, language: string = 'en'): boolean {
    try {
      const templatePath = path.join(this.templatesDir, language, `${templateName}.html`);
      return fs.existsSync(templatePath);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get available email templates for a specific language
   * @param language Language code ('en' or 'fr')
   * @returns List of available template names
   */
  getAvailableTemplates(language: string = 'en'): string[] {
    try {
      const langDir = path.join(this.templatesDir, language);
      if (!fs.existsSync(langDir)) {
        console.warn(`Template directory for language ${language} not found`);
        return [];
      }
      
      const files = fs.readdirSync(langDir);
      return files
        .filter(file => file.endsWith('.html'))
        .map(file => file.replace('.html', ''));
    } catch (error) {
      console.error(`Error reading template directory for language ${language}:`, error);
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
    username: string,
    language?: 'en' | 'fr'
  ): Promise<EmailResult> {
    const loginUrl = `${config.FRONTEND_URL}/login`;
    
    const subjects = {
      en: 'Welcome to Lurnix!',
      fr: 'Bienvenue sur Lurnix !'
    };

    return this.sendTemplateEmail({
      to: email,
      toName: fullname,
      subject: subjects[language || 'en'],
      templateName: 'welcome',
      language,
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
    createdBy: string,
    language?: 'en' | 'fr'
  ): Promise<EmailResult> {
    const loginUrl = `${config.FRONTEND_URL}/admin/login`;
    
    const subjects = {
      en: 'Welcome to Lurnix Admin Panel',
      fr: 'Bienvenue sur le panneau d\'administration Lurnix'
    };

    return this.sendTemplateEmail({
      to: email,
      toName: name,
      subject: subjects[language || 'en'],
      templateName: 'adminWelcome',
      language,
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
    resetToken: string,
    language?: 'en' | 'fr'
  ): Promise<EmailResult> {
    const resetUrl = `${config.FRONTEND_URL}/admin/reset-password?token=${resetToken}`;
    
    const subjects = {
      en: 'Admin Password Reset - Lurnix',
      fr: 'Réinitialisation du mot de passe administrateur - Lurnix'
    };

    return this.sendTemplateEmail({
      to: email,
      toName: name,
      subject: subjects[language || 'en'],
      templateName: 'adminPasswordReset',
      language,
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
