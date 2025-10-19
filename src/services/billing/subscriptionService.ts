import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../prisma/typedClient';
import { AppError } from '../../errors/AppError';
import type { BillingCycle, PlanType, UserSubscriptionStatus } from '../../prisma/prismaTypes';
import { couponService } from './couponService';
import { paddleService } from './paddleService';
import { planService } from './planService';

const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  six_months: 6,
  twelve_months: 12,
};

type TransactionClient = Prisma.TransactionClient;

const ACTIVE_SUBSCRIPTION_STATUSES: UserSubscriptionStatus[] = ['pending', 'active', 'paused'];

const SUBSCRIPTION_RELATIONS = {
  plan: true,
  couponRedemptions: {
    include: {
      coupon: true,
    },
  },
  invoices: true,
} as const;

type SubscriptionWithRelations = Prisma.UserSubscriptionGetPayload<{ include: typeof SUBSCRIPTION_RELATIONS }>;

const resolveCheckoutUrls = () => {
  const baseUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
  const successPath = process.env.PADDLE_CHECKOUT_SUCCESS_PATH ?? '/checkout/success';
  const cancelPath = process.env.PADDLE_CHECKOUT_CANCEL_PATH ?? '/checkout/cancel';

  const resolveUrl = (path: string) => {
    try {
      return new URL(path, baseUrl).toString();
    } catch {
      return `${baseUrl.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
    }
  };

  return {
    success: resolveUrl(successPath),
    cancel: resolveUrl(cancelPath),
  };
};

interface CreateSubscriptionInput {
  userId: string;
  planId: string;
  autoRenewal?: boolean;
  startDate?: Date;
  couponCode?: string;
}

interface ChangePlanInput {
  subscriptionId: string;
  newPlanId: string;
  couponCode?: string;
}

interface CancelSubscriptionInput {
  subscriptionId: string;
  cancelImmediately?: boolean;
  reason?: string;
}

interface ReactivateSubscriptionInput {
  subscriptionId: string;
  billingCycle?: BillingCycle;
}

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  const targetMonth = result.getMonth() + months;
  result.setMonth(targetMonth);

  // Handle cases where adding months moves us beyond the end of month
  if (result.getMonth() !== ((targetMonth % 12) + 12) % 12) {
    result.setDate(0);
  }

  return result;
};

const calculatePeriods = (start: Date, billingCycle: BillingCycle, commitmentMonths: number) => {
  const currentPeriodStart = start;
  const currentPeriodEnd = addMonths(start, BILLING_CYCLE_MONTHS[billingCycle]);
  const commitmentEndDate = commitmentMonths > 0 ? addMonths(start, commitmentMonths) : null;

  return { currentPeriodStart, currentPeriodEnd, commitmentEndDate };
};

export class SubscriptionService {
  private async ensureUserExists(userId: string, tx?: TransactionClient) {
    const client = tx ?? prisma;
    const user = await client.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError(`User with ID ${userId} not found`, 404);
    }
  }

  private async getPlanOrThrow(planId: string, tx?: TransactionClient) {
    const client = tx ?? prisma;
    const plan = await client.subscriptionPlan.findUnique({ where: { id: planId } });

    if (!plan || !plan.isActive) {
      throw new AppError('Requested plan is not available', 404);
    }

    return plan;
  }

  private async getSubscriptionOrThrow(subscriptionId: string, tx?: TransactionClient) {
    const client = tx ?? prisma;
    const subscription = await client.userSubscription.findUnique({
      where: { id: subscriptionId },
      include: SUBSCRIPTION_RELATIONS,
    });

    if (!subscription) {
      throw new AppError(`Subscription with ID ${subscriptionId} not found`, 404);
    }

    return subscription;
  }

  private async ensureNoActiveSubscription(userId: string, tx?: TransactionClient) {
    const activeStatuses: UserSubscriptionStatus[] = ['active', 'paused', 'pending'];
    const client = tx ?? prisma;
    const existing = await client.userSubscription.findFirst({
      where: {
        userId,
        status: {
          in: activeStatuses,
        },
      },
    });

    if (existing) {
      throw new AppError('User already has an active subscription', 400);
    }
  }

  async createSubscription(input: CreateSubscriptionInput) {
    const {
      userId,
      planId,
      autoRenewal = true,
      startDate = new Date(),
      couponCode,
    } = input;

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new AppError(`User with ID ${userId} not found`, 404);
    }

    await this.ensureNoActiveSubscription(userId);

    const plan = await this.getPlanOrThrow(planId);

    if (!plan.paddlePriceId) {
      throw new AppError('Plan is missing Paddle price mapping', 500);
    }

    const periods = calculatePeriods(startDate, plan.billingCycle, plan.commitmentMonths);

    let couponSummary: {
      code: string;
      discountAmount: number;
    } | null = null;
    let overrideAmount: number | undefined;

    if (couponCode) {
      const validation = await couponService.validateCouponForPlan({
        code: couponCode,
        plan,
        userId,
      });

      couponSummary = {
        code: validation.coupon.code,
        discountAmount: Number(validation.discountAmount),
      };

      overrideAmount = Math.max(
        plan.billingAmount.sub(validation.discountAmount).toNumber(),
        0,
      );
    }

    const paddleCustomerId = await paddleService.createOrRetrieveCustomer({
      customerId: user.paddleCustomerId,
      email: user.email,
      name: user.fullname,
    });

    if (!user.paddleCustomerId) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          paddleCustomerId,
        },
      });
    }

    const { success, cancel } = resolveCheckoutUrls();

    const checkout = await paddleService.createCheckoutSession({
      customerId: paddleCustomerId,
      priceId: plan.paddlePriceId,
      allowPriceOverride: overrideAmount !== undefined,
      overridePrice: overrideAmount,
      successUrl: success,
      cancelUrl: cancel,
      metadata: {
        userId,
        planId,
      },
    });

    const subscription = await prisma.userSubscription.create({
      data: {
        id: randomUUID(),
        userId,
        planId: plan.id,
        status: 'pending',
        currentPeriodStart: periods.currentPeriodStart,
        currentPeriodEnd: periods.currentPeriodEnd,
        commitmentEndDate: periods.commitmentEndDate,
        autoRenewal,
        stripeSubscriptionId: null,
        paddleSubscriptionId: null,
        paddleCheckoutId: checkout.id,
      },
      include: {
        plan: true,
      },
    });

      return {
        subscription,
        message: 'Checkout session created successfully',
        coupon: couponSummary,
        checkout,
      };
  }

  private async switchPlan(
    subscriptionId: string,
    newPlanId: string,
    intent: 'upgrade' | 'downgrade',
  ) {
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);
    const newPlan = await this.getPlanOrThrow(newPlanId);

    if (!['active', 'paused'].includes(subscription.status)) {
      throw new AppError('Only active subscriptions can change plans', 400);
    }

    if (subscription.planId === newPlan.id) {
      throw new AppError('Subscription is already on the requested plan', 400);
    }

    if (!subscription.paddleSubscriptionId) {
      throw new AppError('Subscription is not linked to Paddle yet', 400);
    }

    if (!newPlan.paddlePriceId) {
      throw new AppError('Target plan is missing Paddle price mapping', 500);
    }

    await paddleService.updateSubscription({
      paddleSubscriptionId: subscription.paddleSubscriptionId,
      priceId: newPlan.paddlePriceId,
    });

    const now = new Date();
    const periods = calculatePeriods(now, newPlan.billingCycle, newPlan.commitmentMonths);

    const updated = await prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        planId: newPlan.id,
        status: 'active',
        autoRenewal: true,
        currentPeriodStart: periods.currentPeriodStart,
        currentPeriodEnd: periods.currentPeriodEnd,
        commitmentEndDate: periods.commitmentEndDate,
        cancelledAt: null,
      },
      include: {
        plan: true,
      },
    });

    return {
      subscription: updated,
      message: `Subscription ${intent} processed successfully`,
      previousPlan: subscription.plan,
    };
  }

  async upgradeSubscription(input: ChangePlanInput) {
    return this.switchPlan(input.subscriptionId, input.newPlanId, 'upgrade');
  }

  async downgradeSubscription(input: ChangePlanInput) {
    return this.switchPlan(input.subscriptionId, input.newPlanId, 'downgrade');
  }

  async cancelSubscription(input: CancelSubscriptionInput) {
    const { subscriptionId, cancelImmediately = false, reason } = input;
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    if (subscription.status === 'cancelled') {
      throw new AppError('Subscription is already cancelled', 400);
    }

    if (subscription.paddleSubscriptionId) {
      await paddleService.cancelSubscription({
        paddleSubscriptionId: subscription.paddleSubscriptionId,
        effectiveFrom: cancelImmediately ? 'immediately' : 'next_billing_period',
      });
    }

    const effectiveCancellationDate = cancelImmediately
      ? new Date()
      : subscription.currentPeriodEnd;

    const updated = await prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        status: cancelImmediately ? 'cancelled' : subscription.status,
        autoRenewal: false,
        cancelledAt: new Date(),
        currentPeriodEnd: effectiveCancellationDate,
      },
      include: {
        plan: true,
      },
    });

    return {
      subscription: updated,
      message: cancelImmediately
        ? 'Subscription cancelled immediately'
        : 'Subscription will end at the conclusion of the current period',
      reason,
      effectiveDate: effectiveCancellationDate,
    };
  }

  async reactivateSubscription(input: ReactivateSubscriptionInput) {
    const { subscriptionId, billingCycle } = input;
    const subscription = await this.getSubscriptionOrThrow(subscriptionId);

    const planId = billingCycle
      ? await this.resolvePlanForBillingCycle(subscription.plan.planType, billingCycle)
      : subscription.planId;

    const plan = await this.getPlanOrThrow(planId);

    if (!plan.paddlePriceId) {
      throw new AppError('Plan is missing Paddle price mapping', 500);
    }

    if (!subscription.paddleSubscriptionId) {
      throw new AppError('Subscription is not linked to Paddle yet', 400);
    }

    await paddleService.updateSubscription({
      paddleSubscriptionId: subscription.paddleSubscriptionId,
      priceId: plan.paddlePriceId,
      resume: true,
    });

    const now = new Date();
    const periods = calculatePeriods(now, plan.billingCycle, plan.commitmentMonths);

    const updated = await prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        planId: plan.id,
        status: 'active',
        autoRenewal: true,
        currentPeriodStart: periods.currentPeriodStart,
        currentPeriodEnd: periods.currentPeriodEnd,
        commitmentEndDate: periods.commitmentEndDate,
        cancelledAt: null,
      },
      include: {
        plan: true,
      },
    });

    return {
      subscription: updated,
      message: 'Subscription reactivated successfully',
    };
  }

  async getCurrentSubscription(userId: string, language: string = 'en') {
    await this.ensureUserExists(userId);

    const activeStatuses: UserSubscriptionStatus[] = ['pending', 'active', 'paused'];
    const subscription = await prisma.userSubscription.findFirst({
      where: {
        userId,
        status: {
          in: activeStatuses,
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
      include: {
        plan: true,
        couponRedemptions: {
          include: {
            coupon: true,
          },
          orderBy: {
            redeemedAt: 'desc',
          },
        },
      },
    });

    if (!subscription) {
      return null;
    }

    // Localize plan data
    if (subscription.plan) {
      const localizedPlan = await planService.getPlanPricing(
        subscription.plan.planType,
        subscription.plan.billingCycle,
        language
      );
      
      return {
        ...subscription,
        plan: {
          ...subscription.plan,
          name: localizedPlan.name,
          description: localizedPlan.description,
          features: localizedPlan.features
        }
      };
    }

    return subscription;
  }

  async getFreePlanSnapshot(userId: string) {
    const freePlan = await prisma.subscriptionPlan.findUnique({
      where: {
        planType_billingCycle: {
          planType: 'free',
          billingCycle: 'monthly',
        },
      },
    });

    if (!freePlan) {
      return null;
    }

    const now = new Date();
    const end = new Date(now);
    end.setMonth(end.getMonth() + 1);

    return {
      id: `free-${userId}`,
      userId,
      planId: freePlan.id,
      status: 'active' as UserSubscriptionStatus,
      currentPeriodStart: now,
      currentPeriodEnd: end,
      commitmentEndDate: null,
      autoRenewal: true,
      stripeSubscriptionId: null,
      paddleSubscriptionId: null,
      paddleCheckoutId: null,
      createdAt: now,
      updatedAt: now,
      cancelledAt: null,
      plan: freePlan,
      couponRedemptions: [],
      invoices: [],
    } as Awaited<ReturnType<SubscriptionService['getCurrentSubscription']>>;
  }

  private async resolvePlanForBillingCycle(planType: PlanType, billingCycle: BillingCycle) {
    const plan = await prisma.subscriptionPlan.findUnique({
      where: {
        planType_billingCycle: {
          planType,
          billingCycle,
        },
      },
    });

    if (!plan || !plan.isActive) {
      throw new AppError('Requested billing cycle is not available for this plan', 400);
    }

    return plan.id;
  }
}

export const subscriptionService = new SubscriptionService();
