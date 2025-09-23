import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { authService, AuthServiceError, EmailNotVerifiedError } from '../services/authService.js';
import i18next from 'i18next';
import { passwordResetService, PasswordResetError } from '../services/passwordResetService.js';
import type { OAuthVerifyCallbackPayload } from '../services/oauth/oauthTypes.js';

import { 
  RegisterRequest, 
  LoginRequest, 
  ForgotPasswordRequest, 
  ResetPasswordRequest,
  VerifyEmailRequest,
  ResendVerificationRequest,
  OAuthProvider,
  OAuthLoginResult,
  LinkedProvidersResponse,
  UnlinkProviderRequest
} from '../types/auth.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { sendTranslatedResponse } from '../utils/translationUtils.js';
import { AppError } from '../errors/AppError.js';
import { passport as oauthPassport } from '../services/oauth/passport.js';
import { config } from '../config/environment.js';

export class AuthController {
  private readonly supportedProviders: OAuthProvider[] = ['google', 'github'];
  private readonly defaultSuccessPath = '/auth/success';
  private readonly defaultErrorPath = '/auth/error';

  private normalizeRedirectPath(raw?: string | null): string | undefined {
    if (!raw) {
      return undefined;
    }

    const trimmed = raw.trim();
    if (!trimmed.startsWith('/')) {
      return undefined;
    }

    if (trimmed.length > 512) {
      return trimmed.slice(0, 512);
    }

    return trimmed;
  }

  private encodeStatePayload(payload: Record<string, unknown>): string {
    return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  }

  private decodeStatePayload(state?: string): Record<string, unknown> | null {
    if (!state) {
      return null;
    }

    try {
      const json = Buffer.from(state, 'base64url').toString('utf8');
      const parsed = JSON.parse(json);
      if (parsed && typeof parsed === 'object') {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }

  private buildSuccessRedirect(token: string, redirectPath?: string, extras?: Record<string, string | undefined>): string {
    const path = redirectPath || this.defaultSuccessPath;
    const url = new URL(path, config.FRONTEND_URL);
    url.searchParams.set('token', token);

    if (extras) {
      Object.entries(extras).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
    }

    return url.toString();
  }

  private buildFailureRedirect(reason: string, redirectPath?: string): string {
    const path = redirectPath || this.defaultErrorPath;
    const url = new URL(path, config.FRONTEND_URL);
    url.searchParams.set('reason', reason);
    return url.toString();
  }

  private startOAuth(provider: OAuthProvider, req: Request, res: Response, next: NextFunction): void {
    const validatedQuery = (req as any).validatedQuery as { redirect?: string } | undefined;
    const redirectParam = validatedQuery?.redirect ?? (typeof req.query.redirect === 'string' ? req.query.redirect : undefined);
    const redirectPath = this.normalizeRedirectPath(redirectParam);
    const state = redirectPath ? this.encodeStatePayload({ redirect: redirectPath }) : undefined;

    const authenticator = oauthPassport.authenticate(provider, {
      session: false,
      state,
    });

    authenticator(req, res, next);
  }

  private handleOAuthCallback(provider: OAuthProvider, req: Request, res: Response, next: NextFunction): void {
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const statePayload = this.decodeStatePayload(state);
    const redirectPath = this.normalizeRedirectPath(statePayload?.redirect as string | undefined);

    const authenticator = oauthPassport.authenticate(provider, { session: false }, async (err: any, payload?: OAuthVerifyCallbackPayload | false, info?: any) => {
      if (err || !payload) {
        console.error(`[OAuth] ${provider} callback error:`, err);
        res.redirect(this.buildFailureRedirect('oauth_failed', redirectPath));
        return;
      }

      try {
        const result: OAuthLoginResult = await authService.handleOAuthLogin(provider, payload);
        const successUrl = this.buildSuccessRedirect(result.token, redirectPath, {
          newUser: result.isNewUser ? '1' : undefined,
          requiresPassword: result.requiresPassword ? '1' : undefined,
        });
        res.redirect(successUrl);
      } catch (error) {
        if (error instanceof AuthServiceError) {
          res.redirect(this.buildFailureRedirect(error.name || 'oauth_failed', redirectPath));
          return;
        }
        next(error);
      }
    });

    authenticator(req, res, next);
  }

  private assertProvider(provider: string): OAuthProvider {
    if (this.supportedProviders.includes(provider as OAuthProvider)) {
      return provider as OAuthProvider;
    }
    throw new AppError('auth.oauth.unsupportedProvider', 400, 'UNSUPPORTED_PROVIDER');
  }

  googleOAuthInitiate = (req: Request, res: Response, next: NextFunction): void => {
    this.startOAuth('google', req, res, next);
  };

  githubOAuthInitiate = (req: Request, res: Response, next: NextFunction): void => {
    this.startOAuth('github', req, res, next);
  };

  googleOAuthCallback = (req: Request, res: Response, next: NextFunction): void => {
    this.handleOAuthCallback('google', req, res, next);
  };

  githubOAuthCallback = (req: Request, res: Response, next: NextFunction): void => {
    this.handleOAuthCallback('github', req, res, next);
  };

  // User registration
  register = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const registerData: RegisterRequest = req.body;

    try {
      const result = await authService.register(registerData);
      
      sendTranslatedResponse(res, 'auth.register.success', {
        statusCode: 201,
        data: result
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError('auth.register.failed', error.statusCode, error.name);
      }
      throw error; // Let global error handler deal with unexpected errors
    }
  });

  // User login
  login = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const loginData: LoginRequest = req.body;

    try {
      const result = await authService.login(loginData);
      
      // Set the language based on the user's preference
      (req as any).language = result.user.language;
      i18next.changeLanguage(result.user.language);
      
      sendTranslatedResponse(res, 'auth.login.success', {
        statusCode: 200,
        data: result
      });
    } catch (error) {
      if (error instanceof EmailNotVerifiedError) {
        throw new AppError('auth.verification.required', error.statusCode, error.name, true, {
          requiresVerification: true
        });
      } else if (error instanceof AuthServiceError) {
        throw new AppError('auth.login.failed', error.statusCode, error.name);
      }
      throw error;
    }
  });

  // Forgot password
  forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const forgotPasswordData: ForgotPasswordRequest = req.body;

    try {
      // Check rate limiting
      if (passwordResetService.isRateLimited(forgotPasswordData.email)) {
        throw new AppError('errors.rateLimit.passwordReset', 429, 'RATE_LIMIT_EXCEEDED');
      }

      // Initiate password reset
      const result = await passwordResetService.initiatePasswordReset(forgotPasswordData);
      
      // For security, always return success regardless of whether email exists
      sendTranslatedResponse(res, 'auth.password.resetInitiated', {
        statusCode: 200
      });

      // Email is sent automatically by the password reset service
      if (result.token && result.userId) {
        console.log(`Password reset initiated for user ${result.userId}`);
      }
    } catch (error) {
      if (error instanceof PasswordResetError) {
        throw new AppError('auth.password.resetFailed', error.statusCode, error.name);
      }
      throw error;
    }
  });

  // Reset password with token
  resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const resetPasswordData: ResetPasswordRequest = req.body;

    try {
      const result = await passwordResetService.resetPassword(resetPasswordData);
      
      if (result.success) {
        sendTranslatedResponse(res, 'auth.password.resetSuccess', {
          statusCode: 200
        });
      } else {
        throw new AppError('auth.password.resetFailed', 400, 'PASSWORD_RESET_FAILED');
      }
    } catch (error) {
      if (error instanceof PasswordResetError) {
        throw new AppError('auth.password.error', error.statusCode, error.name);
      }
      throw error;
    }
  });

 

  // Refresh token
  refreshToken = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId; // From auth middleware

    if (!userId) {
      throw new AppError('auth.login.required', 401, 'AUTHENTICATION_REQUIRED');
    }

    try {
      const newToken = await authService.refreshToken(userId);
      
      sendTranslatedResponse(res, 'auth.token.refreshed', {
        statusCode: 200,
        data: {
          token: newToken,
        }
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError('auth.token.refreshFailed', error.statusCode, error.name);
      }
      throw error;
    }
  });

  // Verify email with token
  verifyEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { token } = req.params;

    try {
      const result = await authService.verifyEmail(token);
      
      sendTranslatedResponse(res, 'auth.email.verificationSuccess', {
        statusCode: 200,
        data: result
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError('auth.email.verificationFailed', error.statusCode, error.name);
      }
      throw error;
    }
  });

  // Resend verification email
  resendVerification = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    try {
      await authService.resendVerificationEmail(email);
      
      // Always return success for security (don't reveal if email exists)
      sendTranslatedResponse(res, 'auth.email.resendVerification', {
        statusCode: 200
      });
    } catch (error) {
      // Log error but don't expose details
      console.error('Resend verification error:', error);
      
      // Always return success for security
      sendTranslatedResponse(res, 'auth.email.resendVerification', {
        statusCode: 200
      });
    }
  });

  getLinkedAccounts = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;

    if (!userId) {
      throw new AppError('auth.login.required', 401, 'AUTHENTICATION_REQUIRED');
    }

    try {
      const linkedProviders: LinkedProvidersResponse = await authService.getLinkedProviders(userId);
      sendTranslatedResponse(res, 'auth.oauth.linkedAccounts', {
        statusCode: 200,
        data: linkedProviders,
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError('auth.oauth.linkedAccountsFailed', error.statusCode, error.name);
      }
      throw error;
    }
  });

  unlinkProvider = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.userId;

    if (!userId) {
      throw new AppError('auth.login.required', 401, 'AUTHENTICATION_REQUIRED');
    }

    const provider = this.assertProvider(req.params.provider);
    const unlinkRequest: UnlinkProviderRequest = req.body;

    try {
      const updated: LinkedProvidersResponse = await authService.unlinkProvider(userId, provider, unlinkRequest);
      sendTranslatedResponse(res, 'auth.oauth.providerUnlinked', {
        statusCode: 200,
        data: updated,
      });
    } catch (error) {
      if (error instanceof AuthServiceError) {
        throw new AppError('auth.oauth.unlinkFailed', error.statusCode, error.name);
      }
      throw error;
    }
  });
}

// Export singleton instance
export const authController = new AuthController();
