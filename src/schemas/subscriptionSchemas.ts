import { z } from 'zod';
import { BillingCycle } from '../types/pricing.js';

export const subscriptionIdParamSchema = z.object({
  subscriptionId: z.string().uuid(),
});

export const createSubscriptionSchema = z.object({
  planId: z.string().uuid(),
  couponCode: z.string().trim().min(1).optional(),
  autoRenewal: z.boolean().optional(),
  startDate: z.coerce.date().optional(),
});

export const changePlanSchema = z.object({
  newPlanId: z.string().uuid(),
  couponCode: z.string().trim().min(1).optional(),
});

export const cancelSubscriptionSchema = z.object({
  cancelImmediately: z.boolean().optional(),
  reason: z.string().trim().max(500).optional(),
});

export const reactivateSubscriptionSchema = z.object({
  billingCycle: z.nativeEnum(BillingCycle).optional(),
});
