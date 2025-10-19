import { prisma } from '../../prisma/typedClient';
import type { FeatureEntitlements, FeatureName } from '../../types/features';
import { FEATURE_NAMES } from '../../types/features';
import type { PlanType, BillingCycle } from '../../prisma/prismaTypes';
import { AppError } from '../../errors/AppError';

const FEATURE_LIMIT_KEYS: Partial<Record<FeatureName, string>> = {
  ai_mentor_chat: 'ai_interactions_per_month',
  roadmap_creation: 'roadmaps',
  unlimited_resources: 'resource_access',
  coaching_sessions: 'coaching_sessions_per_month',
  priority_support: 'priority_support',
  career_guidance: 'career_guidance',
};

const FREE_PLAN_SELECTOR = {
  planType_billingCycle: {
    planType: 'free' as PlanType,
    billingCycle: 'monthly' as BillingCycle,
  },
} as const;

const normalizeLimitValue = (value: unknown) => {
  if (value === null || value === undefined) {
    return { enabled: false, unlimited: false, limit: null };
  }

  if (typeof value === 'number') {
    return { enabled: value > 0, unlimited: false, limit: value };
  }

  if (typeof value === 'boolean') {
    return { enabled: value, unlimited: value, limit: value ? null : 0 };
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'unlimited') {
      return { enabled: true, unlimited: true, limit: null };
    }

    const parsed = Number(lower);
    if (!Number.isNaN(parsed)) {
      return { enabled: parsed > 0, unlimited: false, limit: parsed };
    }

    return { enabled: lower === 'true', unlimited: lower === 'unlimited', limit: null };
  }

  return { enabled: true, unlimited: false, limit: null };
};

const getCareerGuidanceEntitlement = (planFeatures: unknown): { enabled: boolean; unlimited: boolean; limit: number | null } => {
  if (Array.isArray(planFeatures)) {
    const hasCareer = planFeatures.some((item) =>
      typeof item === 'string' && item.toLowerCase().includes('career guidance'),
    );
    if (hasCareer) {
      return { enabled: true, unlimited: true, limit: null };
    }
  }

  return { enabled: false, unlimited: false, limit: null };
};

const buildEntitlements = (plan: { features: unknown; limits: unknown }): FeatureEntitlements => {
  const entitlements = {} as FeatureEntitlements;
  const planLimits = (plan.limits ?? {}) as Record<string, unknown>;

  for (const feature of FEATURE_NAMES) {
    if (feature === 'career_guidance') {
      const result = getCareerGuidanceEntitlement(plan.features);
      entitlements[feature] = result;
      continue;
    }

    const key = FEATURE_LIMIT_KEYS[feature];
    const limitValue = key ? planLimits[key] : undefined;
    const normalized = normalizeLimitValue(limitValue);

    // Special handling for unlimited_resources to interpret limited access correctly
    if (feature === 'unlimited_resources') {
      if (typeof limitValue === 'string' && limitValue.toLowerCase() === 'limited') {
        entitlements[feature] = {
          enabled: true,
          unlimited: false,
          limit: null,
          metadata: { access: 'limited' },
        };
        continue;
      }
    }

    entitlements[feature] = normalized;
  }

  return entitlements;
};

const getCurrentPeriodBounds = (subscription?: { currentPeriodStart: Date; currentPeriodEnd: Date }) => {
  if (subscription) {
    return {
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    };
  }

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  return { periodStart: start, periodEnd: end };
};

class FeatureGateService {
  private async getUserPlan(userId: string) {
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        userId,
        status: {
          in: ['pending', 'active', 'paused'],
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        plan: true,
      },
    });

    if (subscription) {
      return { plan: subscription.plan, subscription };
    }

    const freePlan = await prisma.subscriptionPlan.findUnique({
      where: FREE_PLAN_SELECTOR,
    });

    if (!freePlan) {
      throw new AppError('Default free plan not found', 500);
    }

    return { plan: freePlan, subscription: null };
  }

  private async getUsageRecord(
    userId: string,
    feature: FeatureName,
    periodStart: Date,
    periodEnd: Date,
  ) {
    return prisma.featureUsage.findUnique({
      where: {
        userId_feature_periodStart_periodEnd: {
          userId,
          feature,
          periodStart,
          periodEnd,
        },
      },
    });
  }

  async getEntitlementsForUser(userId: string): Promise<FeatureEntitlements> {
    const { plan } = await this.getUserPlan(userId);
    return buildEntitlements(plan);
  }

  async canAccessFeature(userId: string, feature: FeatureName): Promise<boolean> {
    const { plan, subscription } = await this.getUserPlan(userId);
    const entitlements = buildEntitlements(plan);
    const entitlement = entitlements[feature];

    if (!entitlement?.enabled) {
      return false;
    }

    if (entitlement.unlimited || entitlement.limit === null) {
      return true;
    }

    const { periodStart, periodEnd } = getCurrentPeriodBounds(subscription ?? undefined);
    const usage = await this.getUsageRecord(userId, feature, periodStart, periodEnd);
    const used = usage?.used ?? 0;

    return used < (entitlement.limit ?? 0);
  }

  async getRemainingUsage(userId: string, feature: FeatureName): Promise<number | null> {
    const { plan, subscription } = await this.getUserPlan(userId);
    const entitlements = buildEntitlements(plan);
    const entitlement = entitlements[feature];

    if (!entitlement?.enabled) {
      return 0;
    }

    if (entitlement.unlimited || entitlement.limit === null) {
      return null;
    }

    const { periodStart, periodEnd } = getCurrentPeriodBounds(subscription ?? undefined);
    const usage = await this.getUsageRecord(userId, feature, periodStart, periodEnd);
    const used = usage?.used ?? 0;

    return Math.max((entitlement.limit ?? 0) - used, 0);
  }

  async consumeUsage(userId: string, feature: FeatureName, amount = 1): Promise<void> {
    if (amount <= 0) {
      return;
    }

    const { plan, subscription } = await this.getUserPlan(userId);
    const entitlements = buildEntitlements(plan);
    const entitlement = entitlements[feature];

    if (!entitlement?.enabled) {
      throw new AppError('Feature not available on current plan', 403);
    }

    if (entitlement.unlimited || entitlement.limit === null) {
      // Nothing to track for unlimited features
      return;
    }

    const { periodStart, periodEnd } = getCurrentPeriodBounds(subscription ?? undefined);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.featureUsage.findUnique({
        where: {
          userId_feature_periodStart_periodEnd: {
            userId,
            feature,
            periodStart,
            periodEnd,
          },
        },
      });

      const used = (existing?.used ?? 0) + amount;

      if (entitlement.limit !== null && used > entitlement.limit) {
        throw new AppError('Feature usage limit exceeded for the current period', 403);
      }

      if (existing) {
        await tx.featureUsage.update({
          where: {
            userId_feature_periodStart_periodEnd: {
              userId,
              feature,
              periodStart,
              periodEnd,
            },
          },
          data: {
            used,
            subscriptionId: subscription?.id ?? existing.subscriptionId,
          },
        });
      } else {
        await tx.featureUsage.create({
          data: {
            userId,
            feature,
            used: amount,
            periodStart,
            periodEnd,
            subscriptionId: subscription?.id ?? null,
          },
        });
      }
    });
  }
}

export const featureGateService = new FeatureGateService();
