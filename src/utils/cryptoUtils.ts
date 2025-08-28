import crypto from 'crypto';

// Generate cryptographically secure random bytes
export function generateSecureRandomBytes(length: number): Buffer {
  return crypto.randomBytes(length);
}

// Generate secure random string (hex)
export function generateSecureRandomHex(length: number): string {
  return generateSecureRandomBytes(length).toString('hex');
}

// Generate secure random string (base64)
export function generateSecureRandomBase64(length: number): string {
  return generateSecureRandomBytes(length).toString('base64url');
}

// Generate secure random string (alphanumeric)
export function generateSecureRandomAlphanumeric(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = generateSecureRandomBytes(length);
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  
  return result;
}

// Hash data using SHA-256
export function hashSHA256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

// Create HMAC signature
export function createHMAC(data: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

// Verify HMAC signature
export function verifyHMAC(data: string, signature: string, secret: string): boolean {
  const expectedSignature = createHMAC(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

// Generate password reset token with enhanced security
export function generatePasswordResetToken(): {
  token: string;
  hashedToken: string;
  expiresAt: Date;
} {
  // Generate a secure random token
  const token = generateSecureRandomBase64(32);
  
  // Hash the token for storage (prevents token theft from database)
  const hashedToken = hashSHA256(token);
  
  // Set expiration time (1 hour from now)
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1);
  
  return {
    token, // Send this to user
    hashedToken, // Store this in database
    expiresAt,
  };
}

// Verify password reset token
export function verifyPasswordResetToken(
  providedToken: string,
  storedHashedToken: string,
  expiresAt: Date
): boolean {
  // Check if token is expired
  if (new Date() > expiresAt) {
    return false;
  }
  
  // Hash the provided token and compare with stored hash
  const hashedProvidedToken = hashSHA256(providedToken);
  
  return crypto.timingSafeEqual(
    Buffer.from(hashedProvidedToken, 'hex'),
    Buffer.from(storedHashedToken, 'hex')
  );
}

// Generate session ID
export function generateSessionId(): string {
  return generateSecureRandomHex(32);
}

// Constant-time string comparison (prevents timing attacks)
export function safeStringCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}