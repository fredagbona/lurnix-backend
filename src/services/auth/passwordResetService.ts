import { userRepository, UserNotFoundError } from '../../repositories/userRepository.js';
import { generatePasswordResetToken, verifyPasswordResetToken } from '../../utils/cryptoUtils.js';
import { hashPassword } from '../../utils/passwordUtils.js';
import { ForgotPasswordRequest, ResetPasswordRequest } from '../../types/auth.js';
import { emailService } from '../communication';

// Custom error classes for password reset service
export class PasswordResetError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'PasswordResetError';
    this.statusCode = statusCode;
  }
}

export class PasswordResetInvalidTokenError extends PasswordResetError {
  constructor() {
    super('Invalid or expired reset token', 400);
    this.name = 'PasswordResetInvalidTokenError';
  }
}

export class PasswordResetTokenExpiredError extends PasswordResetError {
  constructor() {
    super('Reset token has expired', 400);
    this.name = 'PasswordResetTokenExpiredError';
  }
}

export class PasswordResetService {
  // Generate and store password reset token
  async initiatePasswordReset(data: ForgotPasswordRequest): Promise<{ token?: string; userId?: string }> {
    try {
      // Find user by email
      const user = await userRepository.findActiveByEmail(data.email);
      
      // For security, we don't reveal if the email exists or not in the response
      // But we return the token for email sending (if user exists)
      if (!user) {
        // Log this for monitoring but don't throw error
        console.log(`Password reset requested for non-existent email: ${data.email}`);
        return {}; // Return empty object, no token to send
      }

      // Generate secure reset token with enhanced security
      const { token, hashedToken, expiresAt } = generatePasswordResetToken();

      // Store hashed token in database (not the plain token)
      await userRepository.setResetToken(user.id, hashedToken, expiresAt);

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail(user.email, user.fullname, token);
      } catch (emailError) {
        // Log email error but don't fail the reset process
        console.error('Failed to send password reset email:', emailError);
      }

      // Return plain token for email sending and user ID for logging
      return { token, userId: user.id };
      
    } catch (error) {
      console.error('Password reset initiation error:', error);
      throw new PasswordResetError('Failed to initiate password reset', 500);
    }
  }

  // Verify reset token without consuming it
  async verifyResetToken(token: string): Promise<{ valid: boolean; userId?: string }> {
    try {
      // Find all users with reset tokens (we'll verify against the hashed version)
      const users = await userRepository.findActiveUsers(0, 1000); // Get reasonable batch
      
      for (const user of users) {
        if (user.resetToken && user.resetTokenExpiry) {
          const isValid = verifyPasswordResetToken(token, user.resetToken, user.resetTokenExpiry);
          if (isValid) {
            return { valid: true, userId: user.id };
          }
        }
      }

      return { valid: false };
    } catch (error) {
      console.error('Reset token verification error:', error);
      return { valid: false };
    }
  }

  // Reset password using token
  async resetPassword(data: ResetPasswordRequest): Promise<{ success: boolean }> {
    try {
      // Verify token and get user
      const verification = await this.verifyResetToken(data.token);
      
      if (!verification.valid || !verification.userId) {
        throw new PasswordResetInvalidTokenError();
      }

      // Get user to double-check
      const user = await userRepository.findActiveById(verification.userId);
      if (!user) {
        throw new PasswordResetInvalidTokenError();
      }

      // Verify token one more time against stored hash
      if (!user.resetToken || !user.resetTokenExpiry) {
        throw new PasswordResetInvalidTokenError();
      }

      const isTokenValid = verifyPasswordResetToken(data.token, user.resetToken, user.resetTokenExpiry);
      if (!isTokenValid) {
        throw new PasswordResetInvalidTokenError();
      }

      // Hash new password
      const hashedPassword = await hashPassword(data.newPassword);

      // Update password and clear reset token
      await userRepository.update(user.id, {
        password_hash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

      console.log(`Password successfully reset for user: ${user.email}`);
      return { success: true };

    } catch (error) {
      if (error instanceof PasswordResetError) {
        throw error;
      }

      if (error instanceof UserNotFoundError) {
        throw new PasswordResetInvalidTokenError();
      }

      console.error('Password reset error:', error);
      throw new PasswordResetError('Password reset failed', 500);
    }
  }

  // Clean up expired reset tokens (maintenance function)
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const users = await userRepository.findActiveUsers(0, 1000);
      let cleanedCount = 0;

      for (const user of users) {
        if (user.resetToken && user.resetTokenExpiry && new Date() > user.resetTokenExpiry) {
          await userRepository.clearResetToken(user.id);
          cleanedCount++;
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired reset tokens`);
      return cleanedCount;
    } catch (error) {
      console.error('Token cleanup error:', error);
      throw new PasswordResetError('Failed to cleanup expired tokens', 500);
    }
  }

  // Get reset token info (for admin/debugging purposes)
  async getResetTokenInfo(userId: string): Promise<{ hasToken: boolean; expiresAt?: Date }> {
    try {
      const user = await userRepository.findActiveById(userId);
      if (!user) {
        throw new PasswordResetError('User not found', 404);
      }

      return {
        hasToken: !!user.resetToken,
        expiresAt: user.resetTokenExpiry || undefined,
      };
    } catch (error) {
      if (error instanceof PasswordResetError) {
        throw error;
      }

      throw new PasswordResetError('Failed to get reset token info', 500);
    }
  }

  // Cancel password reset (clear token)
  async cancelPasswordReset(userId: string): Promise<void> {
    try {
      await userRepository.clearResetToken(userId);
      console.log(`Password reset cancelled for user ID: ${userId}`);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new PasswordResetError('User not found', 404);
      }

      throw new PasswordResetError('Failed to cancel password reset', 500);
    }
  }

  // Rate limiting check for password reset requests
  private resetRequestCounts = new Map<string, { count: number; resetTime: number }>();

  isRateLimited(email: string): boolean {
    const now = Date.now();
    const record = this.resetRequestCounts.get(email);

    if (!record || now > record.resetTime) {
      // First request or window expired
      this.resetRequestCounts.set(email, {
        count: 1,
        resetTime: now + (60 * 60 * 1000), // 1 hour window
      });
      return false;
    }

    if (record.count >= 3) { // Max 3 requests per hour
      return true;
    }

    record.count++;
    return false;
  }

  // Clean up rate limiting records
  cleanupRateLimiting(): void {
    const now = Date.now();
    for (const [email, record] of this.resetRequestCounts.entries()) {
      if (now > record.resetTime) {
        this.resetRequestCounts.delete(email);
      }
    }
  }
}

// Export singleton instance
export const passwordResetService = new PasswordResetService();

// Clean up rate limiting records every hour
setInterval(() => {
  passwordResetService.cleanupRateLimiting();
}, 60 * 60 * 1000);