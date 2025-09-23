import { Response, NextFunction } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware';
import {
  applyCouponSchema,
  removeCouponParamSchema,
  validateCouponSchema,
} from '../schemas/couponSchemas';
import { couponService } from '../services/couponService';
import { AppError } from '../errors/AppError';

export class CouponController {
  async validateCoupon(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const payload = validateCouponSchema.parse(req.body);
      const userId = payload.userId ?? req.userId;

      const validation = await couponService.validateCouponByPlanId(
        payload.code,
        payload.planId,
        userId,
      );

      const planAmount = Number(validation.plan.billingAmount);
      const discountAmount = Number(validation.discountAmount);
      const finalAmount = Math.max(planAmount - discountAmount, 0);

      res.status(200).json({
        success: true,
        data: {
          valid: true,
          coupon: {
            code: validation.coupon.code,
            name: validation.coupon.name,
            discountType: validation.coupon.discountType,
            discountValue: Number(validation.coupon.discountValue),
          },
          pricing: {
            billingAmount: planAmount,
            discountAmount,
            finalAmount,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async applyCoupon(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError('Authentication required', 401);
      }

      const payload = applyCouponSchema.parse(req.body);

      const result = await couponService.applyCouponToSubscription({
        subscriptionId: payload.subscriptionId,
        code: payload.couponCode,
        userId: req.userId,
      });

      const discountAmount = Number(result.discountAmount);
      const billingAmount = Number(result.subscription.plan.billingAmount);
      const finalAmount = Math.max(billingAmount - discountAmount, 0);

      res.status(200).json({
        success: true,
        message: 'Coupon applied successfully',
        data: {
          coupon: {
            code: result.coupon.code,
            discountType: result.coupon.discountType,
            discountValue: Number(result.coupon.discountValue),
          },
          discountAmount,
          finalAmount,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async removeCoupon(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (!req.userId) {
        throw new AppError('Authentication required', 401);
      }

      const { subscriptionId } = removeCouponParamSchema.parse(req.params);

      await couponService.removeCouponFromSubscription({
        subscriptionId,
        userId: req.userId,
      });

      res.status(200).json({
        success: true,
        message: 'Coupon removed successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const couponController = new CouponController();
