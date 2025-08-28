// Utility functions for password reset functionality

// Generate password reset URL
export function generatePasswordResetUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/reset-password?token=${encodeURIComponent(token)}`;
}

// Validate reset token format (basic validation)
export function isValidResetTokenFormat(token: string): boolean {
  // Check if token is a reasonable length and contains only valid characters
  const tokenRegex = /^[A-Za-z0-9+/=_-]+$/;
  return token.length >= 32 && token.length <= 128 && tokenRegex.test(token);
}

// Calculate time until token expiration
export function getTimeUntilExpiration(expiresAt: Date): {
  expired: boolean;
  minutesRemaining: number;
  hoursRemaining: number;
} {
  const now = new Date();
  const timeDiff = expiresAt.getTime() - now.getTime();
  
  if (timeDiff <= 0) {
    return {
      expired: true,
      minutesRemaining: 0,
      hoursRemaining: 0,
    };
  }

  const minutesRemaining = Math.floor(timeDiff / (1000 * 60));
  const hoursRemaining = Math.floor(timeDiff / (1000 * 60 * 60));

  return {
    expired: false,
    minutesRemaining,
    hoursRemaining,
  };
}

// Format expiration time for user display
export function formatExpirationTime(expiresAt: Date): string {
  const { expired, minutesRemaining, hoursRemaining } = getTimeUntilExpiration(expiresAt);
  
  if (expired) {
    return 'Expired';
  }

  if (hoursRemaining >= 1) {
    return `${hoursRemaining} hour${hoursRemaining > 1 ? 's' : ''} remaining`;
  }

  return `${minutesRemaining} minute${minutesRemaining > 1 ? 's' : ''} remaining`;
}

// Check if it's safe to send another reset email (rate limiting helper)
export function canSendResetEmail(lastSentAt: Date, cooldownMinutes: number = 5): boolean {
  const now = new Date();
  const timeDiff = now.getTime() - lastSentAt.getTime();
  const cooldownMs = cooldownMinutes * 60 * 1000;
  
  return timeDiff >= cooldownMs;
}

// Sanitize email for logging (mask part of the email)
export function maskEmailForLogging(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!domain) return email; // Invalid email format
  
  const maskedLocal = localPart.length > 2 
    ? localPart.substring(0, 2) + '*'.repeat(localPart.length - 2)
    : localPart;
    
  return `${maskedLocal}@${domain}`;
}

// Generate secure password reset email subject
export function generateResetEmailSubject(appName: string = 'Lurnix'): string {
  return `${appName} - Password Reset Request`;
}

// Validate new password meets requirements (additional validation)
export function validateNewPassword(password: string, currentPasswordHash?: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Length check
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  // Character requirements
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Common password patterns
  const commonPatterns = [
    /password/i,
    /123456/,
    /qwerty/i,
    /abc123/i,
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      errors.push('Password contains common patterns that are not secure');
      break;
    }
  }

  // Check for repeated characters
  if (/(.)\1{2,}/.test(password)) {
    errors.push('Password should not contain repeated characters');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}