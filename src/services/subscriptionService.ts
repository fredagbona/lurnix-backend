import { prisma } from '../prisma/typedClient';
import { AppError } from '../errors/AppError';
import { randomUUID } from 'crypto';
import { Request } from 'express';
import { RegionService } from './regionService';

interface SubscriptionPlanInput {
  code: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  regionCode: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  isActive?: boolean;
}

interface SubscriptionQueryParams {
  page: number;
  limit: number;
  regionCode?: string;
  isActive?: boolean;
}

interface SubscriptionUpdateInput {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  regionCode?: string;
  interval?: 'monthly' | 'yearly';
  features?: string[];
  isActive?: boolean;
}

interface UserSubscriptionInput {
  userId: string;
  subscriptionId: string;
  endDate: Date;
}

export class SubscriptionService {
  // Create a new subscription plan
  async createSubscriptionPlan(data: SubscriptionPlanInput) {
    try {
      // Check if plan with the same code already exists
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { code: data.code },
      });

      if (existingPlan) {
        throw new AppError(`Subscription plan with code ${data.code} already exists`, 400);
      }

      // Create the subscription plan
      const subscriptionPlan = await prisma.subscriptionPlan.create({
        data: {
          id: randomUUID(),
          ...data,
          features: data.features as any, // Convert string[] to Json
        },
      });

      return subscriptionPlan;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to create subscription plan: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Get all subscription plans with pagination and filters
  async getSubscriptionPlans(params: SubscriptionQueryParams) {
    try {
      const { page, limit, regionCode, isActive } = params;
      const skip = (page - 1) * limit;

      // Build where clause based on filters
      const where: any = {};
      if (regionCode) {
        where.regionCode = regionCode;
      }
      if (isActive !== undefined) {
        where.isActive = isActive;
      }

      // Get plans with count
      const [plans, total] = await Promise.all([
        prisma.subscriptionPlan.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            price: 'asc',
          },
        }),
        prisma.subscriptionPlan.count({ where }),
      ]);

      return {
        data: plans,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw new AppError(`Failed to get subscription plans: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Get subscription plan by ID
  async getSubscriptionPlanById(id: string) {
    try {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!plan) {
        throw new AppError(`Subscription plan with ID ${id} not found`, 404);
      }

      return plan;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get subscription plan: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Get subscription plans by region code
  async getSubscriptionPlansByRegion(regionCode: string) {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: {
          regionCode,
          isActive: true,
        },
        orderBy: {
          price: 'asc',
        },
      });

      return plans;
    } catch (error) {
      throw new AppError(`Failed to get subscription plans for region ${regionCode}: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }
  
  /**
   * Get subscription plans based on the user's region determined from their request
   * @param req Express request object
   * @returns Subscription plans for the user's region
   */
  async getSubscriptionPlansForUser(req: Request) {
    try {
      // Determine the user's region from their request
      const regionCode = RegionService.getRegionFromRequest(req);
      
      // Get plans for that region
      const plans = await this.getSubscriptionPlansByRegion(regionCode);
      
      return {
        data: plans,
        region: regionCode,
      };
    } catch (error) {
      throw new AppError(`Failed to get subscription plans for user: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }
  
  /**
   * Get all available regions with at least one active subscription plan
   * @returns List of region codes with active subscription plans
   */
  async getAvailableRegions() {
    try {
      // Get distinct region codes from active subscription plans
      const regions = await prisma.subscriptionPlan.findMany({
        where: {
          isActive: true,
        },
        select: {
          regionCode: true,
          currency: true,
        },
        distinct: ['regionCode'],
      });
      
      return regions.map((r: { regionCode: string; currency: string }) => ({
        code: r.regionCode,
        currency: r.currency,
      }));
    } catch (error) {
      throw new AppError(`Failed to get available regions: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Update a subscription plan
  async updateSubscriptionPlan(id: string, data: SubscriptionUpdateInput) {
    try {
      // Check if plan exists
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!existingPlan) {
        throw new AppError(`Subscription plan with ID ${id} not found`, 404);
      }

      // Update the plan
      const updatedPlan = await prisma.subscriptionPlan.update({
        where: { id },
        data: {
          ...data,
          features: data.features ? (data.features as any) : undefined,
        },
      });

      return updatedPlan;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to update subscription plan: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Delete a subscription plan
  async deleteSubscriptionPlan(id: string) {
    try {
      // Check if plan exists
      const existingPlan = await prisma.subscriptionPlan.findUnique({
        where: { id },
      });

      if (!existingPlan) {
        throw new AppError(`Subscription plan with ID ${id} not found`, 404);
      }

      // Check if any users are using this plan
      const usersWithPlan = await prisma.user.count({
        where: {
          subscriptionId: id,
        },
      });

      if (usersWithPlan > 0) {
        throw new AppError(`Cannot delete subscription plan: ${usersWithPlan} users are currently subscribed to this plan`, 400);
      }

      // Delete the plan
      await prisma.subscriptionPlan.delete({
        where: { id },
      });

      return { success: true, message: 'Subscription plan deleted successfully' };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to delete subscription plan: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Subscribe a user to a plan
  async subscribeUser(data: UserSubscriptionInput) {
    try {
      const { userId, subscriptionId, endDate } = data;

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError(`User with ID ${userId} not found`, 404);
      }

      // Check if subscription plan exists
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id: subscriptionId },
      });

      if (!plan) {
        throw new AppError(`Subscription plan with ID ${subscriptionId} not found`, 404);
      }

      // Update user's subscription
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionId,
          subscriptionStatus: 'active',
          subscriptionEndDate: endDate,
        },
      });

      return {
        success: true,
        message: `User subscribed to ${plan.name} plan successfully`,
        data: {
          userId: updatedUser.id,
          subscriptionId: updatedUser.subscriptionId,
          subscriptionStatus: updatedUser.subscriptionStatus,
          subscriptionEndDate: updatedUser.subscriptionEndDate,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to subscribe user: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Cancel a user's subscription
  async cancelSubscription(userId: string) {
    try {
      // Check if user exists and has an active subscription
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new AppError(`User with ID ${userId} not found`, 404);
      }

      if (!user.subscriptionId || user.subscriptionStatus !== 'active') {
        throw new AppError(`User does not have an active subscription`, 400);
      }

      // Update user's subscription status
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionStatus: 'canceled',
        },
      });

      return {
        success: true,
        message: 'Subscription canceled successfully',
        data: {
          userId: updatedUser.id,
          subscriptionStatus: updatedUser.subscriptionStatus,
          subscriptionEndDate: updatedUser.subscriptionEndDate,
        },
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to cancel subscription: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }

  // Get a user's subscription details
  async getUserSubscription(userId: string) {
    try {
      // Get user with subscription details
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          subscription: true,
        },
      });

      if (!user) {
        throw new AppError(`User with ID ${userId} not found`, 404);
      }

      return {
        userId: user.id,
        subscriptionStatus: user.subscriptionStatus,
        subscriptionEndDate: user.subscriptionEndDate,
        plan: user.subscription,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(`Failed to get user subscription: ${error instanceof Error ? error.message : 'Unknown error'}`, 500);
    }
  }
}

export const subscriptionService = new SubscriptionService();
