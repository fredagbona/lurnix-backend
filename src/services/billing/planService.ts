import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma/typedClient';
import { AppError } from '../../errors/AppError';
import type { BillingCycle, PlanType } from '../../prisma/prismaTypes';
import { couponService } from './couponService';
import { translateKey } from '../../utils/translationUtils.js';
import i18next from 'i18next';

const decimalToNumber = (value: Prisma.Decimal): number => value.toNumber();

interface PlanTierResponse {
  id: string;
  billingCycle: BillingCycle;
  pricePerPeriod: number;
  billingAmount: number;
  commitmentMonths: number;
  discountPercentage: number;
  stripePriceId: string | null;
  paddlePriceId: string | null;
  i18nKey: string;
}

interface PlanResponse {
  planType: PlanType;
  name: string;
  description: string | null;
  features: unknown;
  limits: unknown;
  tiers: PlanTierResponse[];
  i18nKey: string;
}

interface PricingCalculationResponse {
  plan: {
    id: string;
    planType: PlanType;
    i18nKey: string;
    name: string;
    billingCycle: BillingCycle;
    commitmentMonths: number;
    discountPercentage: number;
    paddlePriceId: string | null;
  };
  pricing: {
    pricePerPeriod: number;
    billingAmount: number;
    discountAmount: number;
    finalAmount: number;
  };
  coupon?: {
    code: string;
    applied: boolean;
    discountAmount?: number;
    message?: string;
  } | null;
}

class PlanService {
  private localizePlan(plan: PlanResponse, language: string): PlanResponse {
    const planKey = plan.i18nKey;
    
    // Use i18next directly to get proper type handling for arrays
    const name = i18next.t(`${planKey}.name`, { lng: language, ns: 'pricing' });
    const description = i18next.t(`${planKey}.description`, { lng: language, ns: 'pricing' });
    const bulletPoints = i18next.t(`${planKey}.bulletPoints`, { 
      lng: language, 
      ns: 'pricing',
      returnObjects: true  // ← Important: tells i18next to return arrays as arrays
    });
    
    // Only use translated values if they're not the key itself (meaning translation exists)
    const localizedName = name !== `${planKey}.name` ? name : plan.name;
    const localizedDescription = description !== `${planKey}.description` ? description : plan.description;
    const localizedFeatures = Array.isArray(bulletPoints) ? bulletPoints : plan.features;
    
    return {
      ...plan,
      name: localizedName,
      description: localizedDescription,
      features: localizedFeatures
    };
  }

  async getPlans(language: string = 'en'): Promise<PlanResponse[]> {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: {
          isActive: true,
        },
        orderBy: {
          planType: 'asc',
        },
      });

      const grouped = new Map<PlanType, PlanResponse>();

      for (const plan of plans) {
        const planI18nKey = `pricing.plans.${plan.planType}`;
        const tierI18nKey = `${planI18nKey}.tiers.${plan.billingCycle}`;

        const tier: PlanTierResponse = {
          id: plan.id,
          billingCycle: plan.billingCycle,
          pricePerPeriod: decimalToNumber(plan.pricePerPeriod),
          billingAmount: decimalToNumber(plan.billingAmount),
          commitmentMonths: plan.commitmentMonths,
          discountPercentage: plan.discountPercentage ?? 0,
          stripePriceId: plan.stripePriceId ?? null,
          paddlePriceId: plan.paddlePriceId ?? null,
          i18nKey: tierI18nKey,
        };

        const existing = grouped.get(plan.planType);

        if (existing) {
          existing.tiers.push(tier);
          continue;
        }

        grouped.set(plan.planType, {
          planType: plan.planType,
          name: plan.name,
          description: plan.description ?? null,
          features: plan.features,
          limits: plan.limits,
          tiers: [tier],
          i18nKey: planI18nKey,
        });
      }

      return Array.from(grouped.values()).map((plan) => {
        const sorted = {
          ...plan,
          tiers: plan.tiers.sort((a, b) => a.commitmentMonths - b.commitmentMonths),
        };
        return this.localizePlan(sorted, language);
      });
    } catch (error) {
      throw new AppError(
        `Failed to load subscription plans: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  async getPlanPricing(planType: PlanType, billingCycle?: BillingCycle, language: string = 'en'): Promise<PlanResponse> {
    try {
      if (billingCycle) {
        const plan = await prisma.subscriptionPlan.findUnique({
          where: {
            planType_billingCycle: {
              planType,
              billingCycle,
            },
          },
        });

        if (!plan || !plan.isActive) {
          throw new AppError('Requested plan not found', 404);
        }

        const planI18nKey = `pricing.plans.${plan.planType}`;
        const tierI18nKey = `${planI18nKey}.tiers.${plan.billingCycle}`;

        const planData = {
          planType: plan.planType,
          name: plan.name,
          description: plan.description ?? null,
          features: plan.features,
          limits: plan.limits,
          i18nKey: planI18nKey,
          tiers: [
            {
              id: plan.id,
              billingCycle: plan.billingCycle,
              pricePerPeriod: decimalToNumber(plan.pricePerPeriod),
              billingAmount: decimalToNumber(plan.billingAmount),
              commitmentMonths: plan.commitmentMonths,
              discountPercentage: plan.discountPercentage ?? 0,
              stripePriceId: plan.stripePriceId ?? null,
              paddlePriceId: plan.paddlePriceId ?? null,
              i18nKey: tierI18nKey,
            },
          ],
        };
        
        return this.localizePlan(planData, language);
      }

      const plans = await prisma.subscriptionPlan.findMany({
        where: {
          planType,
          isActive: true,
        },
      });

      if (!plans.length) {
        throw new AppError('Requested plan not found', 404);
      }

      const planI18nKey = `pricing.plans.${planType}`;

      const tiers = plans
        .map<PlanTierResponse>((plan) => ({
          id: plan.id,
          billingCycle: plan.billingCycle,
          pricePerPeriod: decimalToNumber(plan.pricePerPeriod),
          billingAmount: decimalToNumber(plan.billingAmount),
          commitmentMonths: plan.commitmentMonths,
          discountPercentage: plan.discountPercentage ?? 0,
          stripePriceId: plan.stripePriceId ?? null,
          paddlePriceId: plan.paddlePriceId ?? null,
          i18nKey: `${planI18nKey}.tiers.${plan.billingCycle}`,
        }))
        .sort((a, b) => a.commitmentMonths - b.commitmentMonths);

      if (!tiers.length) {
        throw new AppError('Requested plan not found', 404);
      }

      const { name, description, features, limits } = plans[0];

      const planData = {
        planType,
        name,
        description: description ?? null,
        features,
        limits,
        i18nKey: planI18nKey,
        tiers,
      };
      
      return this.localizePlan(planData, language);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to load plan pricing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }

  async calculatePricing(options: {
    planId?: string;
    planType?: PlanType;
    billingCycle: BillingCycle;
    couponCode?: string;
    userId?: string;
  }): Promise<PricingCalculationResponse> {
    const { planId, planType, billingCycle, couponCode, userId } = options;

    if (!planId && !planType) {
      throw new AppError('planId or planType is required', 400);
    }

    try {
      const plan = planId
        ? await prisma.subscriptionPlan.findUnique({ where: { id: planId } })
        : await prisma.subscriptionPlan.findUnique({
            where: {
              planType_billingCycle: {
                planType: planType!,
                billingCycle,
              },
            },
          });

      if (!plan || !plan.isActive) {
        throw new AppError('Requested plan not found', 404);
      }

      const baseAmount = decimalToNumber(plan.billingAmount);

      const response: PricingCalculationResponse = {
        plan: {
          id: plan.id,
          planType: plan.planType,
          i18nKey: `pricing.plans.${plan.planType}`,
          name: plan.name,
          billingCycle: plan.billingCycle,
          commitmentMonths: plan.commitmentMonths,
          discountPercentage: plan.discountPercentage ?? 0,
          paddlePriceId: plan.paddlePriceId ?? null,
        },
        pricing: {
          pricePerPeriod: decimalToNumber(plan.pricePerPeriod),
          billingAmount: baseAmount,
          discountAmount: 0,
          finalAmount: baseAmount,
        },
      };

      if (couponCode) {
        const validation = await couponService.validateCouponForPlan({
          code: couponCode,
          plan,
          userId,
        });

        const discountAmount = Number(validation.discountAmount);
        const finalAmount = Math.max(baseAmount - discountAmount, 0);

        response.pricing.discountAmount = discountAmount;
        response.pricing.finalAmount = finalAmount;

        response.coupon = {
          code: validation.coupon.code,
          applied: true,
          discountAmount,
        };
      } else {
        response.coupon = null;
      }

      return response;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError(
        `Failed to calculate pricing: ${error instanceof Error ? error.message : 'Unknown error'}`,
        500,
      );
    }
  }
}

export const planService = new PlanService();
export type { PlanResponse, PlanTierResponse, PricingCalculationResponse };
