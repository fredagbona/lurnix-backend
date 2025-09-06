import { Request, Response, NextFunction } from 'express';
import { subscriptionService } from '../services/subscriptionService';
import {
  createSubscriptionPlanSchema,
  updateSubscriptionPlanSchema,
  getSubscriptionPlansSchema,
  idParamSchema,
  regionCodeParamSchema,
  subscribeUserSchema,
  userIdParamSchema,
} from '../schemas/subscriptionSchemas';

export class SubscriptionController {
  // Create a new subscription plan
  async createSubscriptionPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const data = createSubscriptionPlanSchema.parse(req.body);
      const result = await subscriptionService.createSubscriptionPlan(data);
      
      res.status(201).json({
        success: true,
        message: 'Subscription plan created successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all subscription plans with pagination and filters
  async getSubscriptionPlans(req: Request, res: Response, next: NextFunction) {
    try {
      const query = getSubscriptionPlansSchema.parse(req.query);
      const result = await subscriptionService.getSubscriptionPlans(query);
      
      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get subscription plan by ID
  async getSubscriptionPlanById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const result = await subscriptionService.getSubscriptionPlanById(id);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get subscription plans by region code
  async getSubscriptionPlansByRegion(req: Request, res: Response, next: NextFunction) {
    try {
      const { regionCode } = regionCodeParamSchema.parse(req.params);
      const result = await subscriptionService.getSubscriptionPlansByRegion(regionCode);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Update a subscription plan
  async updateSubscriptionPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const data = updateSubscriptionPlanSchema.parse(req.body);
      const result = await subscriptionService.updateSubscriptionPlan(id, data);
      
      res.status(200).json({
        success: true,
        message: 'Subscription plan updated successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Delete a subscription plan
  async deleteSubscriptionPlan(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = idParamSchema.parse(req.params);
      const result = await subscriptionService.deleteSubscriptionPlan(id);
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  // Subscribe a user to a plan
  async subscribeUser(req: Request, res: Response, next: NextFunction) {
    try {
      const data = subscribeUserSchema.parse(req.body);
      const result = await subscriptionService.subscribeUser(data);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  // Cancel a user's subscription
  async cancelSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const result = await subscriptionService.cancelSubscription(userId);
      
      res.status(200).json({
        success: true,
        message: result.message,
        data: result.data,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get a user's subscription details
  async getUserSubscription(req: Request, res: Response, next: NextFunction) {
    try {
      const { userId } = userIdParamSchema.parse(req.params);
      const result = await subscriptionService.getUserSubscription(userId);
      
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get subscription plans based on user's region
  async getSubscriptionPlansForUser(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await subscriptionService.getSubscriptionPlansForUser(req);
      
      res.status(200).json({
        success: true,
        data: result.data,
        region: result.region,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all available regions with subscription plans
  async getAvailableRegions(req: Request, res: Response, next: NextFunction) {
    try {
      const regions = await subscriptionService.getAvailableRegions();
      
      res.status(200).json({
        success: true,
        data: regions,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const subscriptionController = new SubscriptionController();
