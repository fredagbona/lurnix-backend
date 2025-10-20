import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import { AppError } from '../../../errors/AppError';
import { prisma } from '../../../prisma/typedClient';
import type { UserSubscriptionStatus } from '../../../prisma/prismaTypes';

interface PaddleEventEnvelope<T = unknown> {
  event_type: string;
  data: T;
}

interface PaddleSubscriptionAttributes {
  status?: string;
  checkout?: { id?: string };
  current_billing_period?: { starts_at?: string; ends_at?: string };
  billing_cycle?: { interval: string };
  next_billed_at?: string;
}

interface PaddleSubscriptionEventData {
  id: string;
  attributes: PaddleSubscriptionAttributes;
}

interface PaddleTransactionEventData {
  id: string;
  attributes: {
    subscription_id?: string;
    amount?: { amount: string; currency_code: string };
    billed_at?: string;
  };
}

const parseDate = (value?: string | null): Date | undefined => {
  if (!value) {
    return undefined;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

class PaddleWebhookService {
  async handleEvent(payload: PaddleEventEnvelope) {
    switch (payload.event_type) {
      case 'subscription.activated':
        await this.handleSubscriptionActivated(payload as PaddleEventEnvelope<PaddleSubscriptionEventData>);
        break;
      case 'subscription.updated':
        await this.handleSubscriptionUpdated(payload as PaddleEventEnvelope<PaddleSubscriptionEventData>);
        break;
      case 'subscription.canceled':
        await this.handleSubscriptionCanceled(payload as PaddleEventEnvelope<PaddleSubscriptionEventData>);
        break;
      case 'transaction.completed':
        await this.handleTransactionCompleted(payload as PaddleEventEnvelope<PaddleTransactionEventData>);
        break;
      default:
        // For other events we simply acknowledge for now
        break;
    }
  }

  private async findSubscriptionByPaddleIdentifiers(
    paddleSubscriptionId?: string,
    paddleCheckoutId?: string,
  ) {
    const orConditions: Record<string, string>[] = [];

    if (paddleSubscriptionId) {
      orConditions.push({ paddleSubscriptionId });
    }

    if (paddleCheckoutId) {
      orConditions.push({ paddleCheckoutId });
    }

    if (orConditions.length === 0) {
      throw new AppError('Paddle event missing identifiers', 400);
    }

    const subscription = await prisma.userSubscription.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (!subscription) {
      throw new AppError('Subscription for Paddle event not found', 404);
    }

    return subscription;
  }

  private resolveStatus(status?: string): UserSubscriptionStatus | undefined {
    switch (status) {
      case 'active':
        return 'active';
      case 'paused':
        return 'paused';
      case 'canceled':
      case 'cancelled':
        return 'cancelled';
      default:
        return undefined;
    }
  }

  private async handleSubscriptionActivated(
    payload: PaddleEventEnvelope<PaddleSubscriptionEventData>,
  ) {
    const checkoutId = payload.data.attributes.checkout?.id;
    const subscriptionId = payload.data.id;
    const status = this.resolveStatus(payload.data.attributes.status) ?? 'active';

    const subscription = await this.findSubscriptionByPaddleIdentifiers(subscriptionId, checkoutId);

    const start = parseDate(payload.data.attributes.current_billing_period?.starts_at) ?? new Date();
    const end = parseDate(payload.data.attributes.current_billing_period?.ends_at) ??
      parseDate(payload.data.attributes.next_billed_at) ?? new Date(start.getTime());

    await prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        status,
        paddleSubscriptionId: subscriptionId,
        currentPeriodStart: start,
        currentPeriodEnd: end,
        cancelledAt: null,
      },
    });
  }

  private async handleSubscriptionUpdated(
    payload: PaddleEventEnvelope<PaddleSubscriptionEventData>,
  ) {
    const subscriptionId = payload.data.id;
    const status = this.resolveStatus(payload.data.attributes.status);

    const subscription = await this.findSubscriptionByPaddleIdentifiers(subscriptionId);

    const start = parseDate(payload.data.attributes.current_billing_period?.starts_at);
    const end = parseDate(payload.data.attributes.current_billing_period?.ends_at) ??
      parseDate(payload.data.attributes.next_billed_at);

    await prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        status: status ?? subscription.status,
        currentPeriodStart: start ?? subscription.currentPeriodStart,
        currentPeriodEnd: end ?? subscription.currentPeriodEnd,
      },
    });
  }

  private async handleSubscriptionCanceled(
    payload: PaddleEventEnvelope<PaddleSubscriptionEventData>,
  ) {
    const subscriptionId = payload.data.id;
    const subscription = await this.findSubscriptionByPaddleIdentifiers(subscriptionId);

    await prisma.userSubscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        autoRenewal: false,
        cancelledAt: new Date(),
      },
    });
  }

  private async handleTransactionCompleted(
    payload: PaddleEventEnvelope<PaddleTransactionEventData>,
  ) {
    const subscriptionId = payload.data.attributes.subscription_id;

    if (!subscriptionId) {
      return;
    }

    const subscription = await this.findSubscriptionByPaddleIdentifiers(subscriptionId);

    const billedAt = parseDate(payload.data.attributes.billed_at) ?? new Date();
    const amount = payload.data.attributes.amount?.amount ?? '0';
    const currency = payload.data.attributes.amount?.currency_code ?? 'USD';

    await prisma.billingInvoice.create({
      data: {
        id: randomUUID(),
        userId: subscription.userId,
        subscriptionId: subscription.id,
        invoiceNumber: `${subscriptionId}-${Date.now()}`,
        amount: new Prisma.Decimal(amount),
        discountAmount: new Prisma.Decimal(0),
        finalAmount: new Prisma.Decimal(amount),
        currency,
        status: 'paid',
        billingPeriodStart: subscription.currentPeriodStart,
        billingPeriodEnd: subscription.currentPeriodEnd,
        dueDate: billedAt,
        paidAt: billedAt,
      },
    });
  }
}

export const paddleWebhookService = new PaddleWebhookService();
