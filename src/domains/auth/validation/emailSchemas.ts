import { z } from 'zod';

// Test email schema
export const testEmailSchema = z.object({
  to: z.string().email('Invalid email format'),
  template: z.string().optional(),
  templateData: z.record(z.any()).optional(),
});

// Welcome email test schema
export const welcomeEmailTestSchema = z.object({
  email: z.string().email('Invalid email format'),
  fullname: z.string().min(1, 'Full name is required'),
  username: z.string().min(1, 'Username is required'),
});

// Password reset email test schema
export const passwordResetEmailTestSchema = z.object({
  email: z.string().email('Invalid email format'),
  fullname: z.string().min(1, 'Full name is required'),
  resetToken: z.string().min(1, 'Reset token is required'),
});

// Email template schema
export const emailTemplateSchema = z.object({
  name: z.string().min(1, 'Template name is required'),
  subject: z.string().min(1, 'Subject is required'),
  html: z.string().min(1, 'HTML content is required'),
  text: z.string().min(1, 'Text content is required'),
});

// Bulk email schema
export const bulkEmailSchema = z.object({
  recipients: z.array(z.string().email()).min(1, 'At least one recipient is required').max(100, 'Maximum 100 recipients allowed'),
  subject: z.string().min(1, 'Subject is required'),
  html: z.string().optional(),
  text: z.string().optional(),
  template: z.string().optional(),
  templateData: z.record(z.any()).optional(),
}).refine(
  (data) => data.html || data.text || data.template,
  { message: 'Either html, text, or template must be provided' }
);