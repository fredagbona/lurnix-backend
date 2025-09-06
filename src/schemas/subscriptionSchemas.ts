import { z } from 'zod';

// Create subscription plan schema
export const createSubscriptionPlanSchema = z.object({
  code: z.string().min(3).max(50),
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  price: z.number().positive(),
  currency: z.string().min(3).max(3),
  regionCode: z.string().min(2).max(2),
  interval: z.enum(['monthly', 'yearly']),
  features: z.array(z.string()),
  isActive: z.boolean().optional().default(true),
});

// Update subscription plan schema
export const updateSubscriptionPlanSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  currency: z.string().min(3).max(3).optional(),
  regionCode: z.string().min(2).max(2).optional(),
  interval: z.enum(['monthly', 'yearly']).optional(),
  features: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// Get subscription plans query schema
export const getSubscriptionPlansSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  regionCode: z.string().min(2).max(2).optional(),
  isActive: z.coerce.boolean().optional(),
});

// ID parameter schema
export const idParamSchema = z.object({
  id: z.string().uuid(),
});

// Region code parameter schema
export const regionCodeParamSchema = z.object({
  regionCode: z.string().min(2).max(2),
});

// Subscribe user schema
export const subscribeUserSchema = z.object({
  userId: z.string().uuid(),
  subscriptionId: z.string().uuid(),
  endDate: z.coerce.date(),
});

// User ID parameter schema
export const userIdParamSchema = z.object({
  userId: z.string().uuid(),
});
