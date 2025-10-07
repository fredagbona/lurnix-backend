import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { AppError } from '../errors/AppError.js';
import { learnerProfileService } from '../services/learnerProfileService.js';

export class AIProfileController {
  /**
   * Get authenticated user's learner profile
   * @route GET /api/ai/profile
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('User authentication required', 401);
      }

      const profile = await learnerProfileService.getLatestProfileForUser(userId);

      if (!profile) {
        res.status(404).json({
          success: false,
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'No learner profile found for this user'
          }
        });
        return;
      }

      res.json({
        success: true,
        data: {
          id: profile.id,
          userId: profile.userId,
          source: profile.source,
          hoursPerWeek: profile.hoursPerWeek,
          strengths: profile.strengths,
          gaps: profile.gaps,
          passionTags: profile.passionTags,
          blockers: profile.blockers,
          goals: profile.goals,
          availability: profile.availability,
          rawSnapshot: profile.rawSnapshot,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt
        }
      });
    } catch (error) {
      next(error);
    }
  }

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
