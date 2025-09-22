import { userRepository, DuplicateUserError, UserNotFoundError } from '../repositories/userRepository.js';
import { hashPassword, comparePassword, generateResetToken } from '../utils/passwordUtils.js';
import { emailService } from './emailService.js';
import { generateToken, generateTokenPair } from '../utils/jwt.js';
import { toUserProfile } from '../utils/userUtils.js';
import { generateSecureToken } from '../utils/tokenUtils.js';
import { config } from '../config/environment.js';
import { 
  RegisterRequest, 
  RegisterResponse, 
  LoginRequest, 
  LoginResponse, 
  UpdateProfileRequest, 
  ChangePasswordRequest, 
  DeleteAccountRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  UserProfile,
  User
} from '../types/auth.js';

// Custom error classes for authentication service
export class AuthServiceError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.name = 'AuthServiceError';
    this.statusCode = statusCode;
  }
}

export class InvalidCredentialsError extends AuthServiceError {
  constructor() {
    super('Invalid email or password', 401);
    this.name = 'InvalidCredentialsError';
  }
}

export class AccountDeactivatedError extends AuthServiceError {
  constructor() {
    super('Account has been deactivated', 401);
    this.name = 'AccountDeactivatedError';
  }
}

export class EmailAlreadyExistsError extends AuthServiceError {
  constructor() {
    super('An account with this email already exists', 409);
    this.name = 'EmailAlreadyExistsError';
  }
}

export class UsernameAlreadyExistsError extends AuthServiceError {
  constructor() {
    super('An account with this username already exists', 409);
    this.name = 'UsernameAlreadyExistsError';
  }
}

export class UserNotFoundServiceError extends AuthServiceError {
  constructor() {
    super('User not found', 404);
    this.name = 'UserNotFoundServiceError';
  }
}

export class InvalidResetTokenError extends AuthServiceError {
  constructor() {
    super('Invalid or expired reset token', 400);
    this.name = 'InvalidResetTokenError';
  }
}

export class ResetTokenExpiredError extends AuthServiceError {
  constructor() {
    super('Reset token has expired', 400);
    this.name = 'ResetTokenExpiredError';
  }
}

export class EmailNotVerifiedError extends AuthServiceError {
  constructor() {
    super('Email address has not been verified', 403);
    this.name = 'EmailNotVerifiedError';
  }
}

export class VerificationTokenExpiredError extends AuthServiceError {
  constructor() {
    super('Verification token has expired', 400);
    this.name = 'VerificationTokenExpiredError';
  }
}

export class InvalidVerificationTokenError extends AuthServiceError {
  constructor() {
    super('Invalid verification token', 400);
    this.name = 'InvalidVerificationTokenError';
  }
}

export class AuthService {
  // User registration
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    try {
      // Check if email already exists
      const existingEmailUser = await userRepository.findByEmail(data.email);
      if (existingEmailUser) {
        throw new EmailAlreadyExistsError();
      }

      // Check if username already exists
      const existingUsernameUser = await userRepository.findByUsername(data.username);
      if (existingUsernameUser) {
        throw new UsernameAlreadyExistsError();
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Create user
      const user = await userRepository.create({
        username: data.username.toLowerCase(),
        fullname: data.fullname,
        email: data.email.toLowerCase(),
        password_hash: hashedPassword,
        language: data.language || 'en', // Use provided language or default to English
        isVerified: false, // User starts as unverified
      });

      // Generate verification token
      const { token: verificationToken, expiresAt } = generateSecureToken(24); // 24 hours expiry
      
      // Save verification token to user
      await userRepository.setVerificationToken(user.id, verificationToken, expiresAt);

      // Send verification email
      try {
        const verificationUrl = `${config.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
        console.log('Verification URL:', verificationUrl);
        await emailService.sendRegistrationEmail(user.email, user.fullname, verificationUrl, user.language);
      } catch (emailError) {
        // Log email error but don't fail registration
        console.error('Failed to send verification email:', emailError);
      }

      return {
        success: true,
        user: toUserProfile(user),
        requiresVerification: true,
      };
    } catch (error) {
      if (error instanceof DuplicateUserError) {
        if (error.message.includes('email')) {
          throw new EmailAlreadyExistsError();
        } else {
          throw new UsernameAlreadyExistsError();
        }
      }
      
      if (error instanceof AuthServiceError) {
        throw error;
      }

      throw new AuthServiceError('Registration failed', 500);
    }
  }

  // User login
  async login(data: LoginRequest): Promise<LoginResponse> {
    try {
      // Find user by email
      const user = await userRepository.findByEmail(data.email);
      if (!user) {
        throw new InvalidCredentialsError();
      }

      // Check if account is active
      if (!user.isActive) {
        throw new AccountDeactivatedError();
      }

      // Verify password
      const isPasswordValid = await comparePassword(data.password, user.password_hash);
      if (!isPasswordValid) {
        throw new InvalidCredentialsError();
      }

      // Check if email is verified
      if (!user.isVerified) {
        // Generate new verification token if needed
        const { token: verificationToken, expiresAt } = generateSecureToken(24);
        await userRepository.setVerificationToken(user.id, verificationToken, expiresAt);
        
        // Send verification email
        try {
          const verificationUrl = `${config.FRONTEND_URL}/auth/verify-email?token=${verificationToken}`;
          await emailService.sendRegistrationEmail(user.email, user.fullname, verificationUrl);
        } catch (emailError) {
          console.error('Failed to send verification email:', emailError);
        }
        
        throw new EmailNotVerifiedError();
      }

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
        language: user.language
      });

      return {
        success: true,
        user: toUserProfile(user),
        token,
      };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }

      throw new AuthServiceError('Login failed', 500);
    }
  }

  // Update user profile
  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile> {
    try {
      // Find user
      const user = await userRepository.findActiveById(userId);
      if (!user) {
        throw new UserNotFoundServiceError();
      }

      // Check for duplicate email if email is being updated
      if (data.email && data.email !== user.email) {
        const existingEmailUser = await userRepository.findByEmail(data.email);
        if (existingEmailUser && existingEmailUser.id !== userId) {
          throw new EmailAlreadyExistsError();
        }
      }

      // Check for duplicate username if username is being updated
      if (data.username && data.username !== user.username) {
        const existingUsernameUser = await userRepository.findByUsername(data.username);
        if (existingUsernameUser && existingUsernameUser.id !== userId) {
          throw new UsernameAlreadyExistsError();
        }
      }

      // Update user
      const updatedUser = await userRepository.update(userId, {
        ...(data.username && { username: data.username.toLowerCase() }),
        ...(data.fullname && { fullname: data.fullname }),
        ...(data.email && { email: data.email.toLowerCase() }),
        ...(data.language && { language: data.language }),
      });

      return toUserProfile(updatedUser);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new UserNotFoundServiceError();
      }

      if (error instanceof DuplicateUserError) {
        if (error.message.includes('email')) {
          throw new EmailAlreadyExistsError();
        } else {
          throw new UsernameAlreadyExistsError();
        }
      }

      if (error instanceof AuthServiceError) {
        throw error;
      }

      throw new AuthServiceError('Profile update failed', 500);
    }
  }

  // Change password
  async changePassword(userId: string, data: ChangePasswordRequest, ipAddress?: string): Promise<void> {
    try {
      // Find user
      const user = await userRepository.findActiveById(userId);
      if (!user) {
        throw new UserNotFoundServiceError();
      }

      // Verify current password
      const isCurrentPasswordValid = await comparePassword(data.currentPassword, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw new InvalidCredentialsError();
      }

      // Hash new password
      const hashedNewPassword = await hashPassword(data.newPassword);

      // Update password
      await userRepository.updatePassword(userId, hashedNewPassword);

      // Send password changed confirmation email
      try {
        const changeDate = new Date().toLocaleDateString();
        const ipAddr = ipAddress || 'Unknown';
        await emailService.sendPasswordChangedEmail(user.email, user.fullname, changeDate, ipAddr);
      } catch (emailError) {
        // Log email error but don't fail password change
        console.error('Failed to send password changed email:', emailError);
      }
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new UserNotFoundServiceError();
      }

      if (error instanceof AuthServiceError) {
        throw error;
      }

      throw new AuthServiceError('Password change failed', 500);
    }
  }

  // Delete account (soft delete)
  async deleteAccount(userId: string, data: DeleteAccountRequest): Promise<void> {
    try {
      // Find user
      const user = await userRepository.findActiveById(userId);
      if (!user) {
        throw new UserNotFoundServiceError();
      }

      // Verify password for security
      const isPasswordValid = await comparePassword(data.password, user.password_hash);
      if (!isPasswordValid) {
        throw new InvalidCredentialsError();
      }

      // Soft delete user
      await userRepository.softDelete(userId);

      // Send account deletion confirmation email
      try {
        await emailService.sendAccountDeletedEmail(user.email, user.fullname, user.username, user.language);
      } catch (emailError) {
        // Log email error but don't fail account deletion
        console.error('Failed to send account deleted email:', emailError);
      }
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new UserNotFoundServiceError();
      }

      if (error instanceof AuthServiceError) {
        throw error;
      }

      throw new AuthServiceError('Account deletion failed', 500);
    }
  }

  // Get user profile
  async getUserProfile(userId: string): Promise<UserProfile> {
    try {
      const user = await userRepository.findActiveById(userId);
      if (!user) {
        throw new UserNotFoundServiceError();
      }

      return toUserProfile(user);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new UserNotFoundServiceError();
      }

      if (error instanceof AuthServiceError) {
        throw error;
      }

      throw new AuthServiceError('Failed to get user profile', 500);
    }
  }

  // Verify user exists and is active
  async verifyUser(userId: string): Promise<User> {
    try {
      const user = await userRepository.findActiveById(userId);
      if (!user) {
        throw new UserNotFoundServiceError();
      }

      return user;
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new UserNotFoundServiceError();
      }

      if (error instanceof AuthServiceError) {
        throw error;
      }

      throw new AuthServiceError('User verification failed', 500);
    }
  }

  // Check if email is available
  async isEmailAvailable(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      return !(await userRepository.emailExists(email, excludeUserId));
    } catch (error) {
      throw new AuthServiceError('Failed to check email availability', 500);
    }
  }

  // Check if username is available
  async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      return !(await userRepository.usernameExists(username, excludeUserId));
    } catch (error) {
      throw new AuthServiceError('Failed to check username availability', 500);
    }
  }

  // Generate new token for user (for token refresh)
  async refreshToken(userId: string): Promise<string> {
    try {
      const user = await userRepository.findActiveById(userId);
      if (!user) {
        throw new UserNotFoundServiceError();
      }

      return generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new UserNotFoundServiceError();
      }

      if (error instanceof AuthServiceError) {
        throw error;
      }

      throw new AuthServiceError('Token refresh failed', 500);
    }
  }

  // Update user language preference
  async updateLanguage(userId: string, language: 'en' | 'fr'): Promise<UserProfile> {
    try {
      const user = await userRepository.findActiveById(userId);
      if (!user) {
        throw new UserNotFoundServiceError();
      }

      const updatedUser = await userRepository.update(userId, { language });
      return toUserProfile(updatedUser);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new UserNotFoundServiceError();
      }

      if (error instanceof AuthServiceError) {
        throw error;
      }

      throw new AuthServiceError('Language update failed', 500);
    }
  }

  // Forgot password - generate and store reset token
  async forgotPassword(data: ForgotPasswordRequest): Promise<void> {
    try {
      // Find user by email
      const user = await userRepository.findActiveByEmail(data.email);
      
      // For security, we don't reveal if the email exists or not
      // Always return success, but only send email if user exists
      if (!user) {
        // Log this for monitoring but don't throw error
        console.log(`Password reset requested for non-existent email: ${data.email}`);
        return;
      }

      // Generate secure reset token
      const { token, expiresAt } = generateResetToken();

      // Store reset token in database
      await userRepository.setResetToken(user.id, token, expiresAt);

      // Send password reset email
      try {
        await emailService.sendPasswordResetEmail(user.email, user.fullname, token, user.language);
      } catch (emailError) {
        // Log email error but don't fail the reset process
        console.error('Failed to send password reset email:', emailError);
      }
      
    } catch (error) {
      // Log error but don't reveal details to client for security
      console.error('Forgot password error:', error);
      
      // Always return success for security (don't reveal if email exists)
      return;
    }
  }

  // Reset password using token
  async resetPassword(data: ResetPasswordRequest): Promise<void> {
    try {
      // Find user by reset token
      const user = await userRepository.findByResetToken(data.token);
      if (!user) {
        throw new InvalidResetTokenError();
      }

      // Check if token is expired (double-check since findByResetToken should handle this)
      if (!user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
        throw new ResetTokenExpiredError();
      }

      // Hash new password
      const hashedPassword = await hashPassword(data.newPassword);

      // Update password and clear reset token
      await userRepository.update(user.id, {
        password_hash: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      });

    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }

      if (error instanceof UserNotFoundError) {
        throw new InvalidResetTokenError();
      }

      throw new AuthServiceError('Password reset failed', 500);
    }
  }


  
  // Verify email with token
  async verifyEmail(token: string): Promise<{ success: boolean; userId?: string }> {
    try {
      // Find user by verification token
      const user = await userRepository.findByVerificationToken(token);
      if (!user) {
        throw new InvalidVerificationTokenError();
      }
      
      // Check if token is expired
      if (!user.verificationTokenExpiry || new Date() > user.verificationTokenExpiry) {
        throw new VerificationTokenExpiredError();
      }
      
      // Mark email as verified and clear verification token
      await userRepository.verifyEmail(user.id);
      
      // Send welcome email after verification
      try {
        const dashboardUrl = `${process.env.FRONTEND_URL}/dashboard`;
        await emailService.sendWelcomeAfterVerificationEmail(user.email, user.fullname, dashboardUrl, user.language);
      } catch (emailError) {
        console.error('Failed to send welcome email after verification:', emailError);
      }
      
      return { success: true, userId: user.id };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError('Email verification failed', 500);
    }
  }
  
  // Resend verification email
  async resendVerificationEmail(email: string): Promise<{ success: boolean }> {
    try {
      // Find user by email
      const user = await userRepository.findActiveByEmail(email);
      if (!user) {
        // For security, don't reveal if email exists
        return { success: true };
      }
      
      // If already verified, no need to resend
      if (user.isVerified) {
        return { success: true };
      }
      
      // Generate new verification token
      const { token: verificationToken, expiresAt } = generateSecureToken(24);
      await userRepository.setVerificationToken(user.id, verificationToken, expiresAt);
      
      // Send verification email
      try {
        const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${verificationToken}`;
        await emailService.sendRegistrationEmail(user.email, user.fullname, verificationUrl);
      } catch (emailError) {
        console.error('Failed to resend verification email:', emailError);
      }
      
      return { success: true };
    } catch (error) {
      // Log error but don't reveal details for security
      console.error('Resend verification email error:', error);
      return { success: true };
    }
  }

  // Clear reset token (for cleanup or cancellation)
  async clearResetToken(userId: string): Promise<void> {
    try {
      await userRepository.clearResetToken(userId);
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        throw new UserNotFoundServiceError();
      }

      throw new AuthServiceError('Failed to clear reset token', 500);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();