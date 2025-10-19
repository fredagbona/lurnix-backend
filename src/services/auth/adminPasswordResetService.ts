import { adminRepository } from '../../repositories/adminRepository.js';
import { emailService } from '../communication';
import { hashPassword } from '../../utils/passwordUtils.js';
import { AppError } from '../../errors/AppError.js';
import { generateRandomToken } from '../../utils/tokenUtils.js';

export class AdminPasswordResetService {
  /**
   * Request a password reset for an admin
   * @param email Admin email address
   * @returns Success message
   */
  async requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
    // Find admin by email
    const admin = await adminRepository.findByEmail(email);
    if (!admin) {
      // For security reasons, don't reveal if the email exists or not
      return {
        success: true,
        message: 'If your email is registered, you will receive password reset instructions'
      };
    }

    // Generate reset token (valid for 1 hour)
    const resetToken = generateRandomToken(32);
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to admin
    await adminRepository.update(admin.id, {
      resetToken,
      resetTokenExpiry
    });

    // Send password reset email
    try {
      await emailService.sendAdminPasswordResetEmail(
        admin.email,
        admin.name,
        resetToken
      );
      
      console.log(`✅ Password reset email sent to admin: ${admin.email}`);
    } catch (error) {
      console.error(`❌ Failed to send password reset email to admin: ${admin.email}`, error);
      // Don't expose error to client for security reasons
    }

    return {
      success: true,
      message: 'If your email is registered, you will receive password reset instructions'
    };
  }

  /**
   * Reset admin password using token
   * @param token Reset token
   * @param newPassword New password
   * @returns Success message
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Find admin by reset token
    const admin = await adminRepository.findByResetToken(token);
    if (!admin) {
      throw new AppError('Invalid or expired reset token', 400);
    }

    // Hash new password
    const password_hash = await hashPassword(newPassword);

    // Update admin with new password and clear reset token
    await adminRepository.update(admin.id, {
      password_hash,
      resetToken: null,
      resetTokenExpiry: null
    });

    return {
      success: true,
      message: 'Password has been reset successfully'
    };
  }

 
}

// Export singleton instance
export const adminPasswordResetService = new AdminPasswordResetService();
