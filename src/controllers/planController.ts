import { Request, Response, NextFunction } from 'express';
import { planService } from '../services/planService';
import {
  planTypeParamSchema,
  planPricingQuerySchema,
  pricingCalculationSchema,
} from '../schemas/planSchemas';
import { sendTranslatedResponse } from '../utils/translationUtils.js';

export class PlanController {
  async getPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const language = (req as any).language || 'en';
      const plans = await planService.getPlans(language);

      sendTranslatedResponse(res, 'pricing.api.plans.retrieved', {
        statusCode: 200,
        data: plans
      });
    } catch (error) {
      next(error);
    }
  }

  async getPlanPricing(req: Request, res: Response, next: NextFunction) {
    try {
      const { planType } = planTypeParamSchema.parse(req.params);
      const { billingCycle } = planPricingQuerySchema.parse(req.query);
      const language = (req as any).language || 'en';

      const plan = await planService.getPlanPricing(planType, billingCycle, language);

      sendTranslatedResponse(res, 'pricing.api.plan.retrieved', {
        statusCode: 200,
        data: plan
      });
    } catch (error) {
      next(error);
    }
  }

  async calculatePricing(req: Request, res: Response, next: NextFunction) {
    try {
      const payload = pricingCalculationSchema.parse(req.body);

      const result = await planService.calculatePricing(payload);

      sendTranslatedResponse(res, 'pricing.api.calculated', {
        statusCode: 200,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }
}

export const planController = new PlanController();
