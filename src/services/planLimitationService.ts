import type { PlanType, UserSubscriptionStatus } from '../prisma/prismaTypes';
import { db } from '../prisma/prismaWrapper';
import { AppError } from '../errors/AppError';
import type { ObjectiveSprintLimitPayload, PlanLimitsPayload } from '../types/planLimits.js';

const ACTIVE_SUBSCRIPTION_STATUSES: UserSubscriptionStatus[] = ['pending', 'active', 'paused'];

interface PlanLimitConfig {
  objectiveLimit: number | null;
  sprintLimitPerObjective: number | null;
  upgradePlanType: PlanType | null;
}

export interface PlanLimitsSummary {
  planType: PlanType;
  config: PlanLimitConfig;
  objectiveCount: number;
}

const PLAN_LIMIT_CONFIG: Record<PlanType, PlanLimitConfig> = {
  free: {
    objectiveLimit: 1,
    sprintLimitPerObjective: 1,
    upgradePlanType: 'builder',
  },
  builder: {
    objectiveLimit: null,
    sprintLimitPerObjective: null,
    upgradePlanType: null,
  },
  master: {
    objectiveLimit: null,
    sprintLimitPerObjective: null,
    upgradePlanType: null,
  },
};

const FREE_PLAN_SELECTOR = {
  planType_billingCycle: {
    planType: 'free' as PlanType,
    billingCycle: 'monthly',
  },
} as const;

const PLAN_LIMIT_MESSAGES = {
  objective: 'objectives.planLimits.objectiveLimitReached',
  sprint: 'objectives.planLimits.sprintLimitReached',
} as const;

export class PlanLimitationService {
  async ensureCanCreateObjective(userId: string): Promise<{ summary: PlanLimitsSummary; plan: PlanLimitsPayload }> {
    const { summary, plan } = await this.getPlanLimits(userId);

    if (!plan.canCreateObjective) {
      throw new AppError(
        PLAN_LIMIT_MESSAGES.objective,
        402,
        'PLAN_OBJECTIVE_LIMIT',
        true,
        {
          planType: summary.planType,
          objectiveLimit: plan.objectiveLimit,
        },
        {
          planType: summary.planType,
          limit: plan.objectiveLimit ?? 0,
        },
      );
    }

    return { summary, plan };
  }

  async ensureCanGenerateSprint(
    userId: string,
    objectiveId: string,
  ): Promise<{
    summary: PlanLimitsSummary;
    plan: PlanLimitsPayload;
    sprintCount: number;
    currentObjectiveLimits: ObjectiveSprintLimitPayload;
  }> {
    const { summary, plan } = await this.getPlanLimits(userId);
    const sprintCount = await db.sprint.count({ where: { objectiveId } });
    const currentObjectiveLimits = this.buildObjectiveSprintLimit(summary, sprintCount);

    if (!currentObjectiveLimits.canGenerateSprint) {
      throw new AppError(
        PLAN_LIMIT_MESSAGES.sprint,
        402,
        'PLAN_SPRINT_LIMIT',
        true,
        {
          planType: summary.planType,
          sprintLimit: currentObjectiveLimits.sprintLimitPerObjective,
        },
        {
          planType: summary.planType,
          limit: currentObjectiveLimits.sprintLimitPerObjective ?? 0,
        },
      );
    }

    return { summary, plan, sprintCount, currentObjectiveLimits };
  }

  async getPlanLimits(userId: string): Promise<{ summary: PlanLimitsSummary; plan: PlanLimitsPayload }> {
    const summary = await this.getPlanSummary(userId);
    const plan = this.buildPlanPayload(summary);
    return { summary, plan };
  }

  async getPlanAndObjectiveLimits(
    userId: string,
    objectiveId: string,
  ): Promise<{ plan: PlanLimitsPayload; objective: ObjectiveSprintLimitPayload }> {
    const { summary, plan } = await this.getPlanLimits(userId);
    const sprintCount = await db.sprint.count({ where: { objectiveId } });
    const objective = this.buildObjectiveSprintLimit(summary, sprintCount);
    return { plan, objective };
  }

  buildPlanPayload(summary: PlanLimitsSummary, overrides?: { objectiveCount?: number }): PlanLimitsPayload {
    const objectiveCount = overrides?.objectiveCount ?? summary.objectiveCount;
    const { objectiveLimit, upgradePlanType } = summary.config;
    const remaining = objectiveLimit === null ? null : Math.max(objectiveLimit - objectiveCount, 0);
    const canCreate = remaining === null || remaining > 0;

    return {
      planType: summary.planType,
      objectiveLimit,
      objectiveCount,
      remainingObjectives: remaining,
      canCreateObjective: canCreate,
      gatingReason: canCreate ? null : 'objective_limit',
      gatingMessageKey: canCreate ? null : PLAN_LIMIT_MESSAGES.objective,
      upgradePlanType,
    };
  }

  buildObjectiveSprintLimit(summary: PlanLimitsSummary, sprintCount: number): ObjectiveSprintLimitPayload {
    const { sprintLimitPerObjective, upgradePlanType } = summary.config;
    const remaining = sprintLimitPerObjective === null ? null : Math.max(sprintLimitPerObjective - sprintCount, 0);
    const canGenerate = remaining === null || remaining > 0;

    return {
      planType: summary.planType,
      sprintLimitPerObjective,
      sprintCount,
      remainingSprints: remaining,
      canGenerateSprint: canGenerate,
      gatingReason: canGenerate ? null : 'sprint_limit',
      gatingMessageKey: canGenerate ? null : PLAN_LIMIT_MESSAGES.sprint,
      upgradePlanType,
    };
  }

  private async getPlanSummary(userId: string): Promise<PlanLimitsSummary> {
    const planType = await this.resolveUserPlan(userId);
    const objectiveCount = await db.objective.count({
      where: {
        OR: [
          { profileSnapshot: { userId } },
          { roadmap: { userId } },
        ],
      },
    });

    const config = PLAN_LIMIT_CONFIG[planType] ?? PLAN_LIMIT_CONFIG.free;

    return { planType, config, objectiveCount };
  }

  private async resolveUserPlan(userId: string): Promise<PlanType> {
    const subscription = (await db.userSubscription.findFirst({
      where: {
        userId,
        status: { in: ACTIVE_SUBSCRIPTION_STATUSES },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        plan: true,
      },
    })) as { plan?: { planType?: PlanType | null } | null } | null;

    if (subscription?.plan?.planType) {
      return subscription.plan.planType as PlanType;
    }

    const freePlan = await db.subscriptionPlan.findUnique({
      where: FREE_PLAN_SELECTOR,
    });

    if (!freePlan?.planType) {
      throw new AppError('objectives.planLimits.errors.freePlanMissing', 500, 'PLAN_CONFIGURATION_MISSING');
    }

    return freePlan.planType as PlanType;
  }
}

export const planLimitationService = new PlanLimitationService();
