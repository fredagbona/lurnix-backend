import { Request, Response, NextFunction } from 'express';
import { planService } from '../services/planService';
import {
  planTypeParamSchema,
  planPricingQuerySchema,
  pricingCalculationSchema,
} from '../schemas/planSchemas';

export class PlanController {
  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const plans = await planService.getPlans();

      res.status(200).json({
        success: true,
        data: plans,
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlanPricing(req: Request, res: Response, next: NextFunction) {
    try {
      const { planType } = planTypeParamSchema.parse(req.params);
      const { billingCycle } = planPricingQuerySchema.parse(req.query);

      const plan = await planService.getPlanPricing(planType, billingCycle);

      res.status(200).json({
        success: true,
        data: plan,
      });
    } catch (error) {
      next(error);
    }
  }

  async calculatePricing(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = pricingCalculationSchema.parse(req.body);

      const result = await planService.calculatePricing(payload);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const planController = new PlanController();
