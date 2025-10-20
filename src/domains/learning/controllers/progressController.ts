import { Response, NextFunction } from 'express';
import { AuthRequest } from '../../../middlewares/authMiddleware.js';
import { objectiveProgressService, sprintAutoGenerationService } from '../services';
import { learningAnalyticsService } from '../../analytics/services';
import { AppError } from '../../../errors/AppError.js';

// ============================================
// PROGRESS CONTROLLER
// ============================================

class ProgressController {
  /**
   * GET /api/objectives/:objectiveId/progress
   * Get comprehensive progress for an objective
   */
  async getObjectiveProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { objectiveId } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const progress = await objectiveProgressService.getProgress(objectiveId);

      res.json({
        success: true,
        data: progress
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        console.error('[progressController] getObjectiveProgress error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get progress'
          }
        });
      }
    }
  }

  /**
   * GET /api/objectives/:objectiveId/analytics
   * Get detailed analytics for an objective
   */
  async getObjectiveAnalytics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { objectiveId } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const [progress, timeline] = await Promise.all([
        objectiveProgressService.getProgress(objectiveId),
        learningAnalyticsService.getObjectiveTimeline(objectiveId)
      ]);

      res.json({
        success: true,
        data: {
          progress,
          timeline,
          charts: {
            dailyProgress: timeline
              .filter(e => e.type === 'sprint_completed')
              .map(e => ({
                date: e.date.toISOString().split('T')[0],
                completed: true
              }))
          }
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        console.error('[progressController] getObjectiveAnalytics error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get analytics'
          }
        });
      }
    }
  }

  /**
   * GET /api/objectives/:objectiveId/timeline
   * Get timeline of events for an objective
   */
  async getObjectiveTimeline(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { objectiveId } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const timeline = await learningAnalyticsService.getObjectiveTimeline(objectiveId);

      res.json({
        success: true,
        data: {
          events: timeline
        }
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        console.error('[progressController] getObjectiveTimeline error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get timeline'
          }
        });
      }
    }
  }

  /**
   * GET /api/users/:userId/learning-stats
   * Get user-level learning statistics
   */
  async getUserLearningStats(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;
      const requestUserId = req.userId;

      if (!requestUserId || requestUserId !== userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const analytics = await learningAnalyticsService.getUserAnalytics(userId);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        console.error('[progressController] getUserLearningStats error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get learning stats'
          }
        });
      }
    }
  }

  /**
   * GET /api/objectives/:objectiveId/sprints/generation-status
   * Check if next sprint can be generated
   */
  async getGenerationStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { objectiveId } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const status = await sprintAutoGenerationService.getGenerationStatus(objectiveId);

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        console.error('[progressController] getGenerationStatus error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get generation status'
          }
        });
      }
    }
  }

  /**
   * GET /api/objectives/:objectiveId/export
   * Export progress data (JSON or CSV)
   */
  async exportProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { objectiveId } = req.params;
      const { format = 'json' } = req.query;
      const userId = req.userId;

      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      if (format !== 'json' && format !== 'csv') {
        throw new AppError('Invalid format. Use json or csv', 400, 'INVALID_FORMAT');
      }

      const data = await learningAnalyticsService.exportProgress(
        objectiveId,
        format as 'json' | 'csv'
      );

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="objective-${objectiveId}.csv"`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="objective-${objectiveId}.json"`);
      }

      res.send(data);
    } catch (error) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      } else {
        console.error('[progressController] exportProgress error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to export progress'
          }
        });
      }
    }
  }
}

export const progressController = new ProgressController();
export default progressController;
