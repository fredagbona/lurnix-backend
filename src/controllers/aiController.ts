import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { aiService } from '../services/aiService.js';
import { AppError } from '../errors/AppError.js';
import { 
  GenerateProfileRequest, 
  GenerateRoadmapRequest,
  LearnerProfileType
} from '../types/ai.js';

export class AIController {
  /**
   * Generate a personalized learning roadmap
   * @route POST /api/ai/roadmap
   */
  async generateRoadmap(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('User authentication required', 401);
      }

      const { 
        learningGoal, 
        targetStack, 
        profileType, 
        timeCommitmentHoursPerWeek, 
        priorExperience 
      } = req.body;

      // Validate profile type
      if (!Object.values(LearnerProfileType).includes(profileType)) {
        throw new AppError('Invalid profile type', 400);
      }

      const request: GenerateRoadmapRequest = {
        userId,
        learningGoal,
        targetStack,
        profileType,
        timeCommitmentHoursPerWeek,
        priorExperience
      };

      const result = await aiService.generateRoadmap(request);

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
   * Generate a learner profile based on quiz answers
   * @route POST /api/ai/profile
   */
  async generateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('User authentication required', 401);
      }

      const { answers } = req.body;
      if (!answers || !Array.isArray(answers) || answers.length === 0) {
        throw new AppError('Quiz answers are required', 400);
      }

      const request: GenerateProfileRequest = {
        quizSubmission: {
          userId,
          answers
        }
      };

      const result = await aiService.generateProfile(request);

      res.status(200).json({
        success: true,
        data: result.profile,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const aiController = new AIController();
