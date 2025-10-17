import { Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscriptionService';
import { planService } from '../services/planService';
import type { AuthRequest } from '../middlewares/authMiddleware';
import {
  createSubscriptionSchema,
  subscriptionIdParamSchema,
  changePlanSchema,
  cancelSubscriptionSchema,
  reactivateSubscriptionSchema,
} from '../schemas/subscriptionSchemas';
import { AppError } from '../errors/AppError';

export class SubscriptionController {
  async createSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError('Authentication required', 401);
      }

      const payload = createSubscriptionSchema.parse(req.body);
      const result = await subscriptionService.createSubscription({
        userId: req.userId,
        planId: payload.planId,
        autoRenewal: payload.autoRenewal,
        startDate: payload.startDate,
        couponCode: payload.couponCode,
      });

      res.status(201).json({
        success: true,
        message: result.message,
        data: result.subscription,
        coupon: result.coupon,
        checkout: result.checkout,
      });
    } catch (error) {
      next(error);
    }
  }

  async upgradeSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { subscriptionId } = subscriptionIdParamSchema.parse(req.params);
      const payload = changePlanSchema.parse(req.body);

      const result = await subscriptionService.upgradeSubscription({
        subscriptionId,
        newPlanId: payload.newPlanId,
        couponCode: payload.couponCode,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          subscription: result.subscription,
          previousPlan: result.previousPlan,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async downgradeSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { subscriptionId } = subscriptionIdParamSchema.parse(req.params);
      const payload = changePlanSchema.parse(req.body);

      const result = await subscriptionService.downgradeSubscription({
        subscriptionId,
        newPlanId: payload.newPlanId,
        couponCode: payload.couponCode,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          subscription: result.subscription,
          previousPlan: result.previousPlan,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async cancelSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { subscriptionId } = subscriptionIdParamSchema.parse(req.params);
      const payload = cancelSubscriptionSchema.parse(req.body);

      const result = await subscriptionService.cancelSubscription({
        subscriptionId,
        cancelImmediately: payload.cancelImmediately,
        reason: payload.reason,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: {
          subscription: result.subscription,
          effectiveDate: result.effectiveDate,
          reason: result.reason,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async reactivateSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { subscriptionId } = subscriptionIdParamSchema.parse(req.params);
      const payload = reactivateSubscriptionSchema.parse(req.body);

      const result = await subscriptionService.reactivateSubscription({
        subscriptionId,
        billingCycle: payload.billingCycle,
      });

      res.status(200).json({
        success: true,
        message: result.message,
        data: result.subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  async getCurrentSubscription(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError('Authentication required', 401);
      }

      const language = (req as any).language || 'en';
      const subscription = await subscriptionService.getCurrentSubscription(req.userId, language);
      
      if (subscription) {
        res.status(200).json({
          success: true,
          data: subscription,
        });
        return;
      }

      const fallback = await subscriptionService.getFreePlanSnapshot(req.userId);

      if (!fallback) {
        res.status(200).json({ success: true, data: null });
        return;
      }

      const planMeta = await planService.getPlanPricing('free', 'monthly', language);

      res.status(200).json({
        success: true,
        data: {
          ...fallback,
          isDefaultFreePlan: true,
          planMetadata: planMeta,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionController = new SubscriptionController();
