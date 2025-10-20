import { z } from 'zod';

// Language validation schema
const languageSchema = z.enum(['en', 'fr'], {
  errorMap: () => ({ message: 'validation.language.invalid' })
});

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, 'validation.password.tooShort')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
    'validation.password.requirements');

// Email validation schema
const emailSchema = z
  .string()
  .email('validation.email.invalid')
  .toLowerCase();

// Username validation schema
const usernameSchema = z
  .string()
  .min(3, 'validation.username.tooShort')
  .max(30, 'validation.username.tooLong')
  .regex(/^[a-zA-Z0-9_-]+$/, 'validation.username.invalidFormat');

// Full name validation schema
const fullnameSchema = z
  .string()
  .min(2, 'validation.fullname.tooShort')
  .max(100, 'validation.fullname.tooLong')
  .regex(/^[a-zA-Z\s'-]+$/, 'validation.fullname.invalidFormat');

// Registration validation schema
export const registerSchema = z.object({
  username: usernameSchema,
  fullname: fullnameSchema,
  email: emailSchema,
  password: passwordSchema,
  language: languageSchema.optional().default('en'),
});

// Login validation schema
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Profile update validation schema
export const updateProfileSchema = z.object({
  username: usernameSchema.optional(),
  fullname: fullnameSchema.optional(),
  email: emailSchema.optional(),
  language: languageSchema.optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'validation.profile.noFields' }
);

// Password change validation schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
}).refine(
  (data) => data.currentPassword !== data.newPassword,
  { message: 'New password must be different from current password', path: ['newPassword'] }
);

// Forgot password validation schema
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// Reset password validation schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: passwordSchema,
});

// OAuth initiation query schema
export const oauthStartQuerySchema = z.object({
  redirect: z
    .string()
    .optional()
    .refine(
      (value) => !value || value.startsWith('/'),
      { message: 'validation.oauth.redirectInvalid' }
    ),
});

// OAuth provider params schema
const oauthProviderEnum = z.enum(['google', 'github'], {
  errorMap: () => ({ message: 'validation.oauth.providerUnsupported' }),
});

export const unlinkProviderParamsSchema = z.object({
  provider: oauthProviderEnum,
});

// Unlink provider body schema
export const unlinkProviderSchema = z.object({
  password: z
    .string()
    .min(1, 'validation.password.required')
    .optional(),
});

// Email verification validation schema
export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Verification token is required'),
});

// Resend verification email validation schema
export const resendVerificationSchema = z.object({
  email: emailSchema,
});

// Delete account validation schema
export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password confirmation is required'),
});

// JWT token validation schema
export const jwtTokenSchema = z.object({
  userId: z.string().uuid(),
  email: emailSchema,
  username: usernameSchema,
  providers: z.array(z.string()).optional(),
  avatar: z.string().min(1).or(z.null()).optional(),
  iat: z.number(),
  exp: z.number(),
});

// Export individual field schemas for reuse
export {
  passwordSchema,
  emailSchema,
  usernameSchema,
  fullnameSchema,
  languageSchema,
  oauthProviderEnum,
};
