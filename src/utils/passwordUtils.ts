import bcrypt from 'bcrypt';

// Password strength validation utility
export interface PasswordStrengthResult {
  isValid: boolean;
  score: number; // 0-4 (weak to very strong)
  feedback: string[];
}

export function validatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < 8) {
    feedback.push('Password must be at least 8 characters long');
    return { isValid: false, score: 0, feedback };
  }

  // Check for lowercase letters
  if (!/[a-z]/.test(password)) {
    feedback.push('Password must contain at least one lowercase letter');
  } else {
    score++;
  }

  // Check for uppercase letters
  if (!/[A-Z]/.test(password)) {
    feedback.push('Password must contain at least one uppercase letter');
  } else {
    score++;
  }

  // Check for numbers
  if (!/\d/.test(password)) {
    feedback.push('Password must contain at least one number');
  } else {
    score++;
  }

  // Check for special characters (bonus points)
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    score++;
  }

  // Check length bonus
  if (password.length >= 12) {
    score = Math.min(score + 1, 4);
  }

  // Check for common patterns (weakness detection) - this reduces score significantly
  const commonPatterns = [
    /123456/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /(.)\1{2,}/, // repeated characters
  ];

  for (const pattern of commonPatterns) {
    if (pattern.test(password)) {
      score = Math.max(score - 2, 0); // Reduce score more significantly
      feedback.push('Avoid common patterns and repeated characters');
      break;
    }
  }

  // Determine validity - need score >= 3 and no critical feedback
  const criticalFeedback = feedback.filter(f => 
    f.includes('must contain') || f.includes('must be at least')
  );
  
  const isValid = score >= 3 && criticalFeedback.length === 0;
  
  // Only add "Strong password" feedback if there are no other feedback messages
  if (isValid && feedback.length === 0) {
    // Don't add any feedback for valid passwords - tests expect empty feedback
  } else if (!isValid && feedback.length === 0) {
    feedback.push('Password does not meet strength requirements');
  }

  return { isValid, score, feedback };
}

// Check if password meets minimum requirements
export function isPasswordValid(password: string): boolean {
  return validatePasswordStrength(password).isValid;
}

// Generate password strength description
export function getPasswordStrengthDescription(score: number): string {
  switch (score) {
    case 0:
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Good';
    case 4:
      return 'Strong';
    default:
      return 'Unknown';
  }
}

// Password hashing configuration
const SALT_ROUNDS = 12;

// Hash password using bcrypt
export async function hashPassword(password: string): Promise<string> {
  try {
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    return hashedPassword;
  } catch (error) {
    throw new Error('Failed to hash password');
  }
}

// Compare password with hash
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  try {
    const isMatch = await bcrypt.compare(password, hash);
    return isMatch;
  } catch (error) {
    throw new Error('Failed to compare password');
  }
}

// Generate secure random token for password reset
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

// Generate password reset token with expiration
export function generateResetToken(): { token: string; expiresAt: Date } {
  const token = generateSecureToken(64); // 64 character token
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 1); // Token expires in 1 hour
  
  return { token, expiresAt };
}

// Check if reset token is expired
export function isResetTokenExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}