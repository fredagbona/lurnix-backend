import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/typedClient';
import { AppError } from '../../../errors/AppError';
import type { BillingCycle, Coupon, SubscriptionPlan } from '@prisma/client';

type TransactionClient = Prisma.TransactionClient;

const BILLING_CYCLE_MONTHS: Record<BillingCycle, number> = {
  monthly: 1,
  six_months: 6,
  twelve_months: 12,
};

interface CouponValidationInput {
  code: string;
  plan: SubscriptionPlan;
  userId?: string;
  tx?: TransactionClient;
}

interface CouponValidationResult {
  coupon: Coupon;
  discountAmount: Prisma.Decimal;
}

interface CouponApplyInput {
  subscriptionId: string;
  code: string;
  userId: string;
}

interface CouponRemoveInput {
  subscriptionId: string;
  userId: string;
}

export class CouponService {
  private getClient(tx?: TransactionClient) {
    return tx ?? prisma;
  }

  private assertCouponActive(coupon: Coupon) {
    if (!coupon.isActive) {
      throw new AppError('Coupon is not active', 400);
    }

    const now = new Date();

    if (coupon.validFrom && coupon.validFrom > now) {
      throw new AppError('Coupon is not yet valid', 400);
    }

    if (coupon.validUntil && coupon.validUntil < now) {
      throw new AppError('Coupon has expired', 400);
    }

    if (coupon.maxRedemptions !== null && coupon.maxRedemptions !== undefined) {
      if (coupon.currentRedemptions >= coupon.maxRedemptions) {
        throw new AppError('Coupon redemption limit reached', 400);
      }
    }
  }

  private ensurePlanApplicability(coupon: Coupon, plan: SubscriptionPlan) {
    if (coupon.appliesTo === 'plan_type') {
      if (!coupon.appliesToValue || coupon.appliesToValue !== plan.planType) {
        throw new AppError('Coupon is not applicable to this plan type', 400);
      }
    }

    if (coupon.appliesTo === 'specific_plan') {
      if (!coupon.appliesToValue || coupon.appliesToValue !== plan.id) {
        throw new AppError('Coupon is not applicable to this plan', 400);
      }
    }

    if (coupon.minimumCommitment) {
      const requiredMonths = BILLING_CYCLE_MONTHS[coupon.minimumCommitment];
      const planMonths = BILLING_CYCLE_MONTHS[plan.billingCycle];

      if (planMonths < requiredMonths) {
        throw new AppError('Coupon requires a longer commitment period', 400);
      }
    }
  }

  private async ensureUserEligibility(
    coupon: Coupon,
    userId: string | undefined,
    tx: TransactionClient,
  ) {
    if (!userId) {
      const requiresUserContext =
        coupon.firstTimeUsersOnly || (coupon.maxPerUser !== null && coupon.maxPerUser !== undefined);

      if (requiresUserContext) {
        throw new AppError('Coupon validation requires a user context', 400);
      }
      return;
    }

    if (coupon.firstTimeUsersOnly) {
      const priorSubscriptions = await tx.userSubscription.count({
        where: {
          userId,
        },
      });

      if (priorSubscriptions > 0) {
        throw new AppError('Coupon is only available to first-time subscribers', 400);
      }
    }

    if (coupon.maxPerUser !== null && coupon.maxPerUser !== undefined) {
      const userRedemptions = await tx.couponRedemption.count({
        where: {
          couponId: coupon.id,
          userId,
        },
      });

      if (userRedemptions >= coupon.maxPerUser) {
        throw new AppError('Coupon usage limit reached for this user', 400);
      }
    }
  }

  private computeDiscount(coupon: Coupon, plan: SubscriptionPlan): Prisma.Decimal {
    if (coupon.discountValue.lte(0)) {
      throw new AppError('Coupon discount must be greater than zero', 400);
    }

    const billingAmount = plan.billingAmount;

    if (coupon.discountType === 'percentage') {
      const discount = billingAmount.mul(coupon.discountValue).div(100);
      return discount.greaterThan(billingAmount) ? billingAmount : discount;
    }

    // fixed amount
    return coupon.discountValue.greaterThan(billingAmount) ? billingAmount : coupon.discountValue;
  }

  async validateCouponForPlan(input: CouponValidationInput): Promise<CouponValidationResult> {
    const { code, plan, userId, tx } = input;
    const client = this.getClient(tx);

    const coupon = await client.coupon.findUnique({ where: { code } });

    if (!coupon) {
      throw new AppError('Coupon not found', 404);
    }

    this.assertCouponActive(coupon);
    this.ensurePlanApplicability(coupon, plan);
    await this.ensureUserEligibility(coupon, userId, client);

    const discountAmount = this.computeDiscount(coupon, plan);

    return {
      coupon,
      discountAmount,
    };
  }

  async validateCouponByPlanId(code: string, planId: string, userId?: string) {
    const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });

    if (!plan || !plan.isActive) {
      throw new AppError('Plan not found for coupon validation', 404);
    }

    const validation = await this.validateCouponForPlan({ code, plan, userId });

    return {
      ...validation,
      plan,
    };
  }

  private async incrementCouponRedemption(
    couponId: string,
    tx: TransactionClient,
  ) {
    await tx.coupon.update({
      where: { id: couponId },
      data: {
        currentRedemptions: { increment: 1 },
      },
    });
  }

  private async decrementCouponRedemption(
    couponId: string,
    tx: TransactionClient,
  ) {
    const coupon = await tx.coupon.findUnique({ where: { id: couponId } });

    if (!coupon) {
      return;
    }

    const nextValue = coupon.currentRedemptions > 0 ? coupon.currentRedemptions - 1 : 0;

    await tx.coupon.update({
      where: { id: couponId },
      data: {
        currentRedemptions: nextValue,
      },
    });
  }

  async applyCouponToSubscription(input: CouponApplyInput) {
    const { subscriptionId, code, userId } = input;

    return prisma.$transaction(async (tx) => {
      const subscription = await tx.userSubscription.findUnique({
        where: { id: subscriptionId },
        include: { plan: true },
      });

      if (!subscription) {
        throw new AppError('Subscription not found', 404);
      }

      if (subscription.userId !== userId) {
        throw new AppError('You do not have permission to modify this subscription', 403);
      }

      if (!['active', 'paused'].includes(subscription.status)) {
        throw new AppError('Only active or paused subscriptions can accept coupons', 400);
      }

      const existingRedemption = await tx.couponRedemption.findFirst({
        where: { subscriptionId },
      });

      if (existingRedemption) {
        throw new AppError('A coupon is already applied to this subscription', 400);
      }

      const validation = await this.validateCouponForPlan({
        code,
        plan: subscription.plan,
        userId,
        tx,
      });

      await this.incrementCouponRedemption(validation.coupon.id, tx);

      const redemption = await tx.couponRedemption.create({
        data: {
          id: randomUUID(),
          couponId: validation.coupon.id,
          userId,
          subscriptionId,
          discountAmount: validation.discountAmount,
        },
      });

      return {
        coupon: validation.coupon,
        redemption,
        discountAmount: validation.discountAmount,
        subscription: {
          ...subscription,
        },
      };
    });
  }

  async removeCouponFromSubscription(input: CouponRemoveInput) {
    const { subscriptionId, userId } = input;

    return prisma.$transaction(async (tx) => {
      const subscription = await tx.userSubscription.findUnique({
        where: { id: subscriptionId },
      });

      if (!subscription) {
        throw new AppError('Subscription not found', 404);
      }

      if (subscription.userId !== userId) {
        throw new AppError('You do not have permission to modify this subscription', 403);
      }

      const redemption = await tx.couponRedemption.findFirst({
        where: { subscriptionId },
      });

      if (!redemption) {
        throw new AppError('No coupon to remove for this subscription', 400);
      }

      await this.decrementCouponRedemption(redemption.couponId, tx);

      await tx.couponRedemption.delete({ where: { id: redemption.id } });

      return {
        couponId: redemption.couponId,
      };
    });
  }

  async redeemCouponOnSubscriptionCreation(params: {
    tx: TransactionClient;
    coupon: Coupon;
    userId: string;
    subscriptionId: string;
    discountAmount: Prisma.Decimal;
  }) {
    const { tx, coupon, userId, subscriptionId, discountAmount } = params;

    await this.incrementCouponRedemption(coupon.id, tx);

    await tx.couponRedemption.create({
      data: {
        id: randomUUID(),
        couponId: coupon.id,
        userId,
        subscriptionId,
        discountAmount,
      },
    });
  }
}

export const couponService = new CouponService();
