import { randomUUID } from 'crypto';
import { userRepository, DuplicateUserError, UserNotFoundError } from '../repositories/userRepository.js';
import { hashPassword, comparePassword, generateResetToken } from '../utils/passwordUtils.js';
import { emailService } from './emailService.js';
import { generateToken } from '../utils/jwt.js';
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
  User,
  OAuthProvider,
  OAuthVerifyCallbackPayload,
  OAuthLoginResult,
  LinkedProvidersResponse,
  UnlinkProviderRequest
} from '../types/auth.js';
import { NormalizedOAuthProfile } from '../services/oauth/oauthTypes.js';

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

export class OAuthEmailRequiredError extends AuthServiceError {
  constructor() {
    super('OAuth provider did not return an email address', 400);
    this.name = 'OAuthEmailRequiredError';
  }
}

export class OAuthProviderNotLinkedError extends AuthServiceError {
  constructor() {
    super('Authentication provider is not linked to this account', 400);
    this.name = 'OAuthProviderNotLinkedError';
  }
}

export class CannotUnlinkLastProviderError extends AuthServiceError {
  constructor() {
    super('Cannot unlink the last authentication method for this account', 400);
    this.name = 'CannotUnlinkLastProviderError';
  }
}

export class PasswordConfirmationRequiredError extends AuthServiceError {
  constructor() {
    super('Password confirmation is required to perform this action', 400);
    this.name = 'PasswordConfirmationRequiredError';
  }
}

export class AuthService {
  private supportedProviders: OAuthProvider[] = ['google', 'github'];

  private buildProviderStorageList(
    providers: string[] | null | undefined,
    hasPassword: boolean,
    additions: string[] = [],
    removals: string[] = [],
  ): string[] {
    const providerSet = new Set<string>();
    (providers ?? []).forEach(provider => providerSet.add(provider));
    additions.forEach(provider => providerSet.add(provider));
    removals.forEach(provider => providerSet.delete(provider));

    if (hasPassword) {
      providerSet.add('email');
    } else {
      providerSet.delete('email');
    }

    return Array.from(providerSet);
  }

  // OAuth login/linking
  async handleOAuthLogin(provider: OAuthProvider, payload: OAuthVerifyCallbackPayload): Promise<OAuthLoginResult> {
    try {
      if (!this.supportedProviders.includes(provider)) {
        throw new AuthServiceError('Unsupported authentication provider', 400);
      }

      const { profile } = payload;

      let user = await this.findUserByProvider(provider, profile.providerUserId);
      let isNewUser = false;

      if (!user && profile.email) {
        const existingByEmail = await userRepository.findByEmail(profile.email);
        if (existingByEmail) {
          if (!existingByEmail.isActive) {
            throw new AccountDeactivatedError();
          }
          user = await this.attachProviderToUser(existingByEmail, provider, profile);
        }
      }

      if (!user) {
        user = await this.createUserFromOAuth(provider, profile);
        isNewUser = true;
      } else {
        user = await this.attachProviderToUser(user, provider, profile);
      }

      const providers = this.normalizeProvidersList(user.providers, !!user.password_hash);

      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
        language: user.language,
        providers,
        avatar: user.avatar ?? undefined,
      });

      return {
        token,
        user: toUserProfile(user),
        providers,
        isNewUser,
        requiresPassword: !user.password_hash,
      };
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError('OAuth login failed', 500);
    }
  }

  async getLinkedProviders(userId: string): Promise<LinkedProvidersResponse> {
    try {
      const user = await userRepository.findActiveById(userId);
      if (!user) {
        throw new UserNotFoundServiceError();
      }

      return this.buildLinkedProvidersResponse(user);
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError('Failed to retrieve linked providers', 500);
    }
  }

  async unlinkProvider(userId: string, provider: OAuthProvider, request: UnlinkProviderRequest): Promise<LinkedProvidersResponse> {
    try {
      const user = await userRepository.findActiveById(userId);
      if (!user) {
        throw new UserNotFoundServiceError();
      }

      if (!this.supportedProviders.includes(provider)) {
        throw new OAuthProviderNotLinkedError();
      }

      const hasPassword = !!user.password_hash;
      const storedProviders = user.providers ?? [];

      if (!storedProviders.includes(provider)) {
        throw new OAuthProviderNotLinkedError();
      }

      if (!hasPassword && storedProviders.filter(p => p !== provider).length === 0) {
        throw new CannotUnlinkLastProviderError();
      }

      if (hasPassword) {
        if (!request.password) {
          throw new PasswordConfirmationRequiredError();
        }
        const passwordHash = user.password_hash;
        if (!passwordHash) {
          throw new InvalidCredentialsError();
        }

        const isPasswordValid = await comparePassword(request.password, passwordHash);
        if (!isPasswordValid) {
          throw new InvalidCredentialsError();
        }
      }

      const providers = this.buildProviderStorageList(storedProviders, hasPassword, [], [provider]);

      const updatedUser = await userRepository.update(userId, {
        ...this.getProviderUpdate(provider, null),
        providers,
      });

      if (!hasPassword && this.normalizeProvidersList(updatedUser.providers, !!updatedUser.password_hash).length === 0) {
        throw new CannotUnlinkLastProviderError();
      }

      return this.buildLinkedProvidersResponse(updatedUser);
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw error;
      }
      throw new AuthServiceError('Failed to unlink provider', 500);
    }
  }

  private normalizeProvidersList(providers: string[] | null | undefined, hasPassword: boolean): string[] {
    const set = new Set<string>(providers ?? []);
    if (hasPassword) {
      set.add('email');
    } else {
      set.delete('email');
    }
    return Array.from(set).sort((a, b) => {
      if (a === 'email') return -1;
      if (b === 'email') return 1;
      return a.localeCompare(b);
    });
  }

  private buildLinkedProvidersResponse(user: User): LinkedProvidersResponse {
    const providers = this.normalizeProvidersList(user.providers, !!user.password_hash);
    return {
      providers,
      primaryProvider: providers[0] ?? (user.password_hash ? 'email' : null),
      hasPassword: !!user.password_hash,
      avatar: user.avatar ?? null,
    };
  }

  private pickLanguageFromLocale(locale?: string | null): 'en' | 'fr' {
    if (!locale) {
      return 'en';
    }
    const normalized = locale.toLowerCase();
    if (normalized.startsWith('fr')) {
      return 'fr';
    }
    return 'en';
  }

  private sanitizeUsername(source?: string | null): string {
    if (!source) {
      return '';
    }
    return source
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9_-]/g, '')
      .replace(/_{2,}/g, '_')
      .replace(/-{2,}/g, '-');
  }

  private async generateUniqueUsername(base?: string | null): Promise<string> {
    let sanitized = this.sanitizeUsername(base);

    if (sanitized.length < 3) {
      sanitized = `user-${randomUUID().slice(0, 6)}`;
    }

    if (sanitized.length > 30) {
      sanitized = sanitized.slice(0, 30);
    }

    let candidate = sanitized;
    let counter = 1;
    while (await userRepository.usernameExists(candidate)) {
      const suffix = `-${counter}`;
      const basePart = sanitized.slice(0, Math.max(3, 30 - suffix.length));
      candidate = `${basePart}${suffix}`;
      counter += 1;
      if (counter > 1000) {
        candidate = `user-${randomUUID().slice(0, 8)}`;
        break;
      }
    }

    return candidate;
  }

  private async findUserByProvider(provider: OAuthProvider, providerUserId: string): Promise<User | null> {
    if (provider === 'google') {
      return userRepository.findByGoogleId(providerUserId);
    }
    if (provider === 'github') {
      return userRepository.findByGithubId(providerUserId);
    }
    return null;
  }

  private getProviderUpdate(provider: OAuthProvider, providerUserId: string | null) {
    if (provider === 'google') {
      return { googleId: providerUserId };
    }
    return { githubId: providerUserId };
  }

  private async attachProviderToUser(user: User, provider: OAuthProvider, profile: NormalizedOAuthProfile): Promise<User> {
    const providers = this.buildProviderStorageList(user.providers, !!user.password_hash, [provider]);

    const updateData = {
      ...this.getProviderUpdate(provider, profile.providerUserId),
      providers,
      avatar: profile.avatarUrl ?? user.avatar ?? null,
      isVerified: true,
    } as const;

    return userRepository.update(user.id, updateData);
  }

  private async createUserFromOAuth(provider: OAuthProvider, profile: NormalizedOAuthProfile): Promise<User> {
    if (!profile.email) {
      throw new OAuthEmailRequiredError();
    }

    const usernameBase = profile.username || profile.fullname || profile.email.split('@')[0] || `${provider}-${profile.providerUserId}`;
    const username = await this.generateUniqueUsername(usernameBase);
    const fullname = profile.fullname?.trim() || username;
    const language = this.pickLanguageFromLocale(profile.locale);
    const providers = this.buildProviderStorageList([], false, [provider]);

    return userRepository.create({
      username,
      fullname,
      email: profile.email.toLowerCase(),
      password_hash: undefined,
      language,
      isVerified: true,
      providers,
      avatar: profile.avatarUrl ?? null,
      ...this.getProviderUpdate(provider, profile.providerUserId),
    });
  }
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
      if (!user.password_hash) {
        throw new InvalidCredentialsError();
      }

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

      const providers = this.normalizeProvidersList(user.providers, !!user.password_hash);

      // Generate JWT token
      const token = generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
        language: user.language,
        providers,
        avatar: user.avatar ?? undefined,
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
      if (!user.password_hash) {
        throw new InvalidCredentialsError();
      }

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
      if (!user.password_hash) {
        throw new InvalidCredentialsError();
      }

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

      const providers = this.normalizeProvidersList(user.providers, !!user.password_hash);

      return generateToken({
        userId: user.id,
        email: user.email,
        username: user.username,
        language: user.language,
        providers,
        avatar: user.avatar ?? undefined,
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
