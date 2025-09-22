import { z } from 'zod';
import { BillingCycle, PlanType } from '../types/pricing.js';

export const planTypeParamSchema = z.object({
  planType: z.nativeEnum(PlanType),
});

export const planPricingQuerySchema = z
  .object({
    billing_cycle: z.nativeEnum(BillingCycle).optional(),
  })
  .transform(({ billing_cycle }) => ({
    billingCycle: billing_cycle,
  }));

export const pricingCalculationSchema = z
  .object({
    planId: z.string().uuid().optional(),
    planType: z.nativeEnum(PlanType).optional(),
    billingCycle: z.nativeEnum(BillingCycle),
    couponCode: z.string().trim().min(1).optional(),
    userId: z.string().uuid().optional(),
  })
  .refine((data) => data.planId || data.planType, {
    message: 'planId or planType is required',
    path: ['planId'],
  });
