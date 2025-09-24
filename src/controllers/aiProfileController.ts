import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { AppError } from '../errors/AppError.js';

export class AIProfileController {
  /**
   * Generate a learner profile using AI
   * @route POST /api/ai/profile
   */
  async generateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('User authentication required', 401);
      }

      throw new AppError(
        'AI profile generation is temporarily disabled while we roll out the new roadmap planner.',
        503,
        'AI_PROFILE_UNAVAILABLE'
      );
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const aiProfileController = new AIProfileController();
