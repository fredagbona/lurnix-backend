import crypto from 'crypto';

/**
 * Generate a secure random token for email verification or password reset
 * @returns Object containing token and expiry date
 */
export function generateSecureToken(expiryHours: number = 24): { token: string; expiresAt: Date } {
  // Generate a random token
  const token = crypto.randomBytes(32).toString('hex');
  
  // Set expiry time (default: 24 hours from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiryHours);
  
  return { token, expiresAt };
}

/**
 * Generate a random token with specified length
 * @param length Length of the token in bytes (default: 32)
 * @returns Random token as a hex string
 */
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate a verification code (6 digits)
 * @returns Verification code
 */
export function generateVerificationCode(): string {
  // Generate a 6-digit code
  return Math.floor(100000 + Math.random() * 900000).toString();
}
