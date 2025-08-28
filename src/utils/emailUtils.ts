import { Request } from 'express';

// Extract client IP address from request
export function getClientIP(req: Request): string {
  // Check for forwarded IP (behind proxy/load balancer)
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return ips.split(',')[0].trim();
  }
  
  // Check for real IP (some proxies use this)
  const realIP = req.headers['x-real-ip'];
  if (realIP) {
    return Array.isArray(realIP) ? realIP[0] : realIP;
  }
  
  // Fallback to connection remote address
  return req.connection.remoteAddress || req.ip || 'Unknown';
}

// Validate email address format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Extract domain from email address
export function getEmailDomain(email: string): string {
  const parts = email.split('@');
  return parts.length === 2 ? parts[1].toLowerCase() : '';
}

// Check if email is from a disposable email provider
export function isDisposableEmail(email: string): boolean {
  const disposableDomains = [
    '10minutemail.com',
    'guerrillamail.com',
    'mailinator.com',
    'tempmail.org',
    'throwaway.email',
    'temp-mail.org',
    'yopmail.com',
    'maildrop.cc',
    'sharklasers.com',
    'guerrillamailblock.com',
  ];
  
  const domain = getEmailDomain(email);
  return disposableDomains.includes(domain);
}

// Generate email-safe username from full name
export function generateEmailSafeUsername(fullname: string): string {
  return fullname
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '.') // Replace spaces with dots
    .substring(0, 20); // Limit length
}

// Format email for display (mask part of it for privacy)
export function maskEmailForDisplay(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  
  if (localPart.length <= 2) {
    return `${localPart}***@${domain}`;
  }
  
  const visibleChars = Math.min(3, Math.floor(localPart.length / 2));
  const maskedPart = '*'.repeat(localPart.length - visibleChars);
  
  return `${localPart.substring(0, visibleChars)}${maskedPart}@${domain}`;
}

// Generate unsubscribe token
export function generateUnsubscribeToken(email: string, secret: string): string {
  const crypto = require('crypto');
  const data = `${email}:${Date.now()}`;
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

// Verify unsubscribe token
export function verifyUnsubscribeToken(token: string, email: string, secret: string): boolean {
  try {
    const crypto = require('crypto');
    const data = `${email}:${Date.now()}`;
    const expectedToken = crypto.createHmac('sha256', secret).update(data).digest('hex');
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch (error) {
    return false;
  }
}

// Email rate limiting key generator
export function generateEmailRateLimitKey(email: string, type: string): string {
  return `email_rate_limit:${type}:${email}`;
}

// Check if email sending is allowed (rate limiting)
export function isEmailSendingAllowed(
  email: string,
  type: string,
  maxEmails: number = 5,
  windowMinutes: number = 60
): boolean {
  // This is a simple in-memory implementation
  // In production, you'd use Redis or similar
  const key = generateEmailRateLimitKey(email, type);
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  
  // For now, just return true - implement proper rate limiting in production
  return true;
}

// Email template variable validator
export function validateTemplateVariables(
  template: string,
  providedVariables: Record<string, any>
): {
  valid: boolean;
  missingVariables: string[];
  unusedVariables: string[];
} {
  // Extract variables from template ({{variable}} format)
  const templateVariableRegex = /\{\{(\w+)\}\}/g;
  const templateVariables = new Set<string>();
  let match;
  
  while ((match = templateVariableRegex.exec(template)) !== null) {
    templateVariables.add(match[1]);
  }
  
  const providedVariableNames = new Set(Object.keys(providedVariables));
  
  const missingVariables = Array.from(templateVariables).filter(
    variable => !providedVariableNames.has(variable)
  );
  
  const unusedVariables = Array.from(providedVariableNames).filter(
    variable => !templateVariables.has(variable)
  );
  
  return {
    valid: missingVariables.length === 0,
    missingVariables,
    unusedVariables,
  };
}

// Email content sanitizer
export function sanitizeEmailContent(content: string): string {
  // Remove potentially dangerous HTML/JavaScript
  return content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
}

// Generate email tracking pixel URL
export function generateTrackingPixelUrl(
  baseUrl: string,
  emailId: string,
  userId?: string
): string {
  const params = new URLSearchParams({
    id: emailId,
    ...(userId && { user: userId }),
    t: Date.now().toString(),
  });
  
  return `${baseUrl}/email/track.gif?${params.toString()}`;
}

// Email bounce handling
export interface EmailBounce {
  email: string;
  bounceType: 'hard' | 'soft';
  reason: string;
  timestamp: Date;
}

export function handleEmailBounce(bounce: EmailBounce): void {
  console.log(`Email bounce detected:`, bounce);
  
  // In production, you would:
  // 1. Update user's email status in database
  // 2. Add to bounce list if hard bounce
  // 3. Retry if soft bounce
  // 4. Send notification to admin if needed
}

// Email delivery status
export enum EmailDeliveryStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  COMPLAINED = 'complained',
  OPENED = 'opened',
  CLICKED = 'clicked',
}

// Email metrics
export interface EmailMetrics {
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  opened: number;
  clicked: number;
  deliveryRate: number;
  openRate: number;
  clickRate: number;
}