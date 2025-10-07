import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { sprintCompletionHandler } from '../services/sprintCompletionHandler.js';
import { sprintAutoGenerationService } from '../services/sprintAutoGenerationService.js';
import { AppError } from '../errors/AppError.js';

// ============================================
// SPRINT CONTROLLER
// ============================================

class SprintController {
  /**
   * POST /api/sprints/:sprintId/complete
   * Mark sprint as complete and trigger auto-generation
   */
  async completeSprint(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sprintId } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const {
        tasksCompleted,
        totalTasks,
        hoursSpent,
        evidenceSubmitted = false,
        reflection
      } = req.body;

      // Validate input
      if (typeof tasksCompleted !== 'number' || typeof totalTasks !== 'number') {
        throw new AppError('tasksCompleted and totalTasks are required', 400, 'INVALID_INPUT');
      }

      if (typeof hoursSpent !== 'number' || hoursSpent < 0) {
        throw new AppError('hoursSpent must be a positive number', 400, 'INVALID_INPUT');
      }

      const result = await sprintCompletionHandler.handleSprintCompletion({
        sprintId,
        userId,
        completionData: {
          tasksCompleted,
          totalTasks,
          hoursSpent,
          evidenceSubmitted,
          reflection
        }
      });

      res.json({
        success: true,
        data: {
          sprintCompleted: result.sprintMarkedComplete,
          dayCompleted: result.dayCompleted,
          nextSprintGenerated: result.nextSprintGenerated,
          nextSprint: result.nextSprint ? {
            id: result.nextSprint.id,
            dayNumber: (result.nextSprint as any).dayNumber,
            lengthDays: result.nextSprint.lengthDays
          } : null,
          milestoneReached: result.milestoneReached,
          progress: result.progressUpdate,
          notifications: result.notifications
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
        console.error('[sprintController] completeSprint error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to complete sprint'
          }
        });
      }
    }
  }

  /**
   * GET /api/sprints/:sprintId/completion-status
   * Get completion status for a sprint
   */
  async getCompletionStatus(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sprintId } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const status = await sprintCompletionHandler.getCompletionStatus(sprintId);

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
        console.error('[sprintController] getCompletionStatus error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to get completion status'
          }
        });
      }
    }
  }

  /**
   * PUT /api/sprints/:sprintId/progress
   * Update partial completion progress
   */
  async updateProgress(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { sprintId } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { completionPercentage, hoursSpent } = req.body;

      if (typeof completionPercentage !== 'number' || completionPercentage < 0 || completionPercentage > 100) {
        throw new AppError('completionPercentage must be between 0 and 100', 400, 'INVALID_INPUT');
      }

      await sprintCompletionHandler.handlePartialCompletion({
        sprintId,
        completionPercentage,
        hoursSpent
      });

      res.json({
        success: true,
        data: {
          message: 'Progress updated successfully',
          completionPercentage
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
        console.error('[sprintController] updateProgress error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to update progress'
          }
        });
      }
    }
  }

  /**
   * POST /api/objectives/:objectiveId/sprints/generate-next
   * Manually generate next sprint
   */
  async generateNextSprint(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { objectiveId } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { force = false } = req.body;

      const sprint = await sprintAutoGenerationService.generateNextSprint({
        objectiveId,
        userId
      });

      res.json({
        success: true,
        data: {
          sprint: {
            id: sprint.id,
            dayNumber: (sprint as any).dayNumber,
            lengthDays: sprint.lengthDays,
            difficulty: sprint.difficulty,
            totalEstimatedHours: sprint.totalEstimatedHours,
            plannerOutput: sprint.plannerOutput
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
        console.error('[sprintController] generateNextSprint error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate next sprint'
          }
        });
      }
    }
  }

  /**
   * POST /api/objectives/:objectiveId/sprints/generate-batch
   * Generate multiple sprints ahead
   */
  async generateSprintBatch(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { objectiveId } = req.params;
      const userId = req.userId;

      if (!userId) {
        throw new AppError('Unauthorized', 401, 'UNAUTHORIZED');
      }

      const { count = 3, startDay } = req.body;

      if (typeof count !== 'number' || count < 1 || count > 10) {
        throw new AppError('count must be between 1 and 10', 400, 'INVALID_INPUT');
      }

      const sprints = await sprintAutoGenerationService.generateSprintBatch({
        objectiveId,
        userId,
        startDay,
        count
      });

      res.json({
        success: true,
        data: {
          sprints: sprints.map(s => ({
            id: s.id,
            dayNumber: (s as any).dayNumber,
            lengthDays: s.lengthDays
          })),
          count: sprints.length
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
        console.error('[sprintController] generateSprintBatch error:', error);
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Failed to generate sprint batch'
          }
        });
      }
    }
  }

  /**
   * GET /api/objectives/:objectiveId/sprints/generation-status
   * Get sprint generation status
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
        console.error('[sprintController] getGenerationStatus error:', error);
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
}

export const sprintController = new SprintController();
export default sprintController;
