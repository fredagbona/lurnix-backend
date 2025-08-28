import { userRepository, DuplicateUserError, UserNotFoundError } from '../repositories/userRepository.js';
import { hashPassword, comparePassword, generateResetToken } from '../utils/passwordUtils.js';
import { emailService } from './emailService.js';
import { generateToken, generateTokenPair } from '../utils/jwt.js';
import { toUserProfile } from '../utils/userUtils.js';
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
      });

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
      });

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user.email, user.fullname, user.username);
      } catch (emailError) {
        // Log email error but don't fail registration
        console.error('Failed to send welcome email:', emailError);
      }

      return {
        success: true,
        user: toUserProfile(user),
        token,
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

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
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
        await emailService.sendPasswordChangedEmail(user.email, user.fullname, ipAddress || 'Unknown');
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
        await emailService.sendAccountDeletedEmail(user.email, user.fullname, user.username);
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
        await emailService.sendPasswordResetEmail(user.email, user.fullname, token);
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

  // Verify reset token validity
  async verifyResetToken(token: string): Promise<boolean> {
    try {
      const user = await userRepository.findByResetToken(token);
      return !!user;
    } catch (error) {
      return false;
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