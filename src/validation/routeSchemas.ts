import { z } from 'zod';

// Pagination query schema
export const paginationQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
}).refine(data => data.page >= 1, { message: 'Page must be at least 1', path: ['page'] })
  .refine(data => data.limit >= 1 && data.limit <= 100, { message: 'Limit must be between 1 and 100', path: ['limit'] });

// Email availability query schema
export const emailAvailabilityQuerySchema = z.object({
  email: z.string().email('Invalid email format'),
});

// Username availability query schema
export const usernameAvailabilityQuerySchema = z.object({
  username: z.string()
    .min(3, 'Username must be at least 3 characters long')
    .max(30, 'Username must be no more than 30 characters long')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens'),
});

// User ID parameter schema
export const userIdParamSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

// Reset token parameter schema
export const resetTokenParamSchema = z.object({
  token: z.string().min(32, 'Invalid token format'),
});

// Search query schema
export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100, 'Search query too long'),
  page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
});

// Sort query schema
export const sortQuerySchema = z.object({
  sortBy: z.enum(['createdAt', 'updatedAt', 'username', 'email']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

// Filter query schema
export const filterQuerySchema = z.object({
  isActive: z.string().optional().transform(val => val === 'true'),
  createdAfter: z.string().optional().transform(val => val ? new Date(val) : undefined),
  createdBefore: z.string().optional().transform(val => val ? new Date(val) : undefined),
});

// Combined admin users query schema
export const adminUsersQuerySchema = paginationQuerySchema;

// Health check query schema
export const healthCheckQuerySchema = z.object({
  detailed: z.string().optional().transform(val => val === 'true'),
});