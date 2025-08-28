import { z } from 'zod';

// Password validation schema
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 
    'Password must contain at least one uppercase letter, one lowercase letter, and one number');

// Email validation schema
const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase();

// Username validation schema
const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters long')
  .max(30, 'Username must be no more than 30 characters long')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');

// Full name validation schema
const fullnameSchema = z
  .string()
  .min(2, 'Full name must be at least 2 characters long')
  .max(100, 'Full name must be no more than 100 characters long')
  .regex(/^[a-zA-Z\s'-]+$/, 'Full name can only contain letters, spaces, apostrophes, and hyphens');

// Registration validation schema
export const registerSchema = z.object({
  username: usernameSchema,
  fullname: fullnameSchema,
  email: emailSchema,
  password: passwordSchema,
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
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'At least one field must be provided for update' }
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

// Delete account validation schema
export const deleteAccountSchema = z.object({
  password: z.string().min(1, 'Password confirmation is required'),
});

// JWT token validation schema
export const jwtTokenSchema = z.object({
  userId: z.string().uuid(),
  email: emailSchema,
  username: usernameSchema,
  iat: z.number(),
  exp: z.number(),
});

// Export individual field schemas for reuse
export {
  passwordSchema,
  emailSchema,
  usernameSchema,
  fullnameSchema,
};