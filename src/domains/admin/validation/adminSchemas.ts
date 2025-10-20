import { z } from 'zod';
import { AdminRole } from '../../../types/auth.js';

// Admin login schema
export const adminLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

// Admin register schema
export const adminRegisterSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.nativeEnum(AdminRole).optional(),
  language: z.enum(['en', 'fr']).optional()
});

// Change password schema
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format')
});

// Reset password schema
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
});

// Admin update schema
export const adminUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  role: z.nativeEnum(AdminRole).optional()
}).refine(data => Object.keys(data).length > 0, {
  message: 'At least one field must be provided'
});

export const adminLanguageSchema = z.object({
  language: z.enum(['en', 'fr'], {
    errorMap: () => ({ message: "Language must be either 'en' or 'fr'" })
  })
});

// Export types
export type AdminLoginRequest = z.infer<typeof adminLoginSchema>;
export type AdminRegisterRequest = z.infer<typeof adminRegisterSchema>;
export type ChangePasswordRequest = z.infer<typeof changePasswordSchema>;
export type AdminUpdateRequest = z.infer<typeof adminUpdateSchema>;
export type ForgotPasswordRequest = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordRequest = z.infer<typeof resetPasswordSchema>;
export type AdminLanguageRequest = z.infer<typeof adminLanguageSchema>;
