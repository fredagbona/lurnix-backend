import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { aiRoadmapService } from '../services/aiRoadmapService.js';
import { AppError } from '../errors/AppError.js';
import { 
  GenerateSevenDayRoadmapRequest,
  GenerateThirtyDayRoadmapRequest
} from '../types/roadmap.js';
import {
  GenerateSevenDayRoadmapRequestSchema,
  GenerateThirtyDayRoadmapRequestSchema
} from '../schemas/roadmapSchema.js';

export class AIRoadmapController {
  /**
   * Generate a 7-day roadmap for learning basics
   * @route POST /api/ai/roadmap/seven-day
   */
  async generateSevenDayRoadmap(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('User authentication required', 401);
      }

      // Validate request body
      const validationResult = GenerateSevenDayRoadmapRequestSchema.safeParse({
        ...req.body,
        userId
      });

      if (!validationResult.success) {
        throw new AppError(`Invalid request: ${validationResult.error.message}`, 400);
      }

      const request: GenerateSevenDayRoadmapRequest = validationResult.data;

      // Generate roadmap
      const result = await aiRoadmapService.generateSevenDayRoadmap(request);

      res.status(200).json({
        success: true,
        data: result.roadmap,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate a 30-day roadmap for specific projects
   * @route POST /api/ai/roadmap/thirty-day
   */
  async generateThirtyDayRoadmap(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('User authentication required', 401);
      }

      // Validate request body
      const validationResult = GenerateThirtyDayRoadmapRequestSchema.safeParse({
        ...req.body,
        userId
      });

      if (!validationResult.success) {
        throw new AppError(`Invalid request: ${validationResult.error.message}`, 400);
      }

      const request: GenerateThirtyDayRoadmapRequest = validationResult.data;

      // Generate roadmap
      const result = await aiRoadmapService.generateThirtyDayRoadmap(request);

      res.status(200).json({
        success: true,
        data: result.roadmap,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const aiRoadmapController = new AIRoadmapController();
