import { z } from 'zod';

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1),
  planId: z.string().uuid(),
  userId: z.string().uuid().optional(),
});

export const applyCouponSchema = z.object({
  subscriptionId: z.string().uuid(),
  couponCode: z.string().trim().min(1),
});

export const removeCouponParamSchema = z.object({
  subscriptionId: z.string().uuid(),
});
