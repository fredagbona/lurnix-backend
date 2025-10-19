import { db } from '../../prisma/prismaWrapper.js';
import { AppError } from '../../errors/AppError.js';
import { objectiveProgressService } from './objectiveProgressService.js';
import { sprintAutoGenerationService } from './sprintAutoGenerationService.js';
import { sprintEventEmitter, SprintEvent } from '../../domains/infrastructure/eventEmitter.js';
import type { Sprint } from '@prisma/client';
import type { ObjectiveProgress } from './objectiveProgressService.js';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface CompletionData {
  tasksCompleted: number;
  totalTasks: number;
  hoursSpent: number;
  evidenceSubmitted: boolean;
  reflection?: string;
}

export interface CompletionResult {
  sprintMarkedComplete: boolean;
  dayCompleted: number;
  nextSprintGenerated: boolean;
  nextSprint?: Sprint;
  milestoneReached?: any; // ObjectiveMilestone will be available after Prisma regeneration
  progressUpdate: ObjectiveProgress;
  streakUpdated: boolean;
  notifications: NotificationPayload[];
}

export interface ValidationResult {
  canComplete: boolean;
  reason?: string;
  missingRequirements?: string[];
}

export interface NotificationPayload {
  type: 'sprint_completed' | 'milestone_reached' | 'streak_milestone' | 'objective_progress';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

export interface HandleSprintCompletionParams {
  sprintId: string;
  userId: string;
  completionData: CompletionData;
}

// ============================================
// SERVICE CLASS
// ============================================

class SprintCompletionHandler {
  /**
   * Handle sprint completion and trigger all related actions
   */
  async handleSprintCompletion(params: HandleSprintCompletionParams): Promise<CompletionResult> {
    const { sprintId, userId, completionData } = params;

    // Validate completion
    const validation = await this.validateCompletion({ sprintId, completionData });
    if (!validation.canComplete) {
      throw new AppError(
        validation.reason ?? 'Cannot complete sprint',
        400,
        'SPRINT_COMPLETION_VALIDATION_FAILED'
      );
    }

    // Load sprint with objective
    const sprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: {
        objective: {
          include: {
            profileSnapshot: true,
            milestones: {
              where: { isCompleted: false },
              orderBy: { targetDay: 'asc' }
            }
          }
        }
      }
    });

    if (!sprint) {
      throw new AppError('Sprint not found', 404, 'SPRINT_NOT_FOUND');
    }

    if (!sprint.objective.profileSnapshot) {
      throw new AppError('Learner profile required', 400, 'LEARNER_PROFILE_REQUIRED');
    }

    // Verify user owns this sprint
    if (sprint.objective.profileSnapshot.userId !== userId) {
      throw new AppError('Unauthorized', 403, 'UNAUTHORIZED');
    }

    const notifications: NotificationPayload[] = [];

    // 1. Mark sprint as complete
    const markResult = await objectiveProgressService.markSprintComplete({
      sprintId,
      completionData
    });

    // Emit sprint completed event
    await sprintEventEmitter.emitSprintEvent(SprintEvent.SPRINT_COMPLETED, {
      objectiveId: sprint.objectiveId,
      sprintId,
      userId,
      data: {
        dayNumber: markResult.dayCompleted,
        completionRate: (completionData.tasksCompleted / completionData.totalTasks) * 100,
        hoursSpent: completionData.hoursSpent
      }
    });

    notifications.push({
      type: 'sprint_completed',
      title: 'Sprint Completed! 🎉',
      message: `Day ${markResult.dayCompleted} completed successfully!`,
      data: {
        dayNumber: markResult.dayCompleted,
        completionRate: (completionData.tasksCompleted / completionData.totalTasks) * 100
      }
    });

    // 2. Check for milestone achievements
    let milestoneReached: any | undefined;
    if (markResult.milestoneReached) {
      milestoneReached = markResult.milestoneReached;
      
      // Emit milestone reached event
      await sprintEventEmitter.emitSprintEvent(SprintEvent.MILESTONE_REACHED, {
        objectiveId: sprint.objectiveId,
        sprintId,
        userId,
        data: {
          milestoneId: milestoneReached.id,
          milestoneTitle: milestoneReached.title,
          targetDay: milestoneReached.targetDay
        }
      });
      
      notifications.push({
        type: 'milestone_reached',
        title: `Milestone Reached! 🏆`,
        message: `${milestoneReached.title}`,
        data: {
          milestoneId: milestoneReached.id,
          targetDay: milestoneReached.targetDay
        }
      });
    }

    // 3. Check for streak milestones
    if (markResult.streakUpdated) {
      const progress = await objectiveProgressService.getProgress(sprint.objectiveId);
      if (progress.currentStreak > 0 && progress.currentStreak % 7 === 0) {
        notifications.push({
          type: 'streak_milestone',
          title: `${progress.currentStreak}-Day Streak! 🔥`,
          message: `You're on fire! Keep the momentum going!`,
          data: {
            streak: progress.currentStreak,
            longestStreak: progress.longestStreak
          }
        });
      }
    }

    // 4. Generate next sprint automatically
    let nextSprintGenerated = false;
    let nextSprint: Sprint | undefined;

    const shouldGenerate = await sprintAutoGenerationService.shouldGenerateNext({
      objectiveId: sprint.objectiveId,
      currentSprintId: sprintId
    });

    if (shouldGenerate.shouldGenerate) {
      try {
        nextSprint = await sprintAutoGenerationService.generateNextSprint({
          objectiveId: sprint.objectiveId,
          userId,
          currentDay: markResult.nextDayNumber
        });
        nextSprintGenerated = true;

        console.log('[sprintCompletion] Next sprint auto-generated', {
          objectiveId: sprint.objectiveId,
          nextSprintId: nextSprint.id,
          dayNumber: nextSprint.dayNumber
        });
      } catch (error) {
        console.error('[sprintCompletion] Failed to auto-generate next sprint', error);
        // Don't fail the completion if auto-generation fails
      }
    }

    // 5. Maintain sprint buffer (generate ahead)
    try {
      await sprintAutoGenerationService.maintainSprintBuffer(sprint.objectiveId);
    } catch (error) {
      console.error('[sprintCompletion] Failed to maintain sprint buffer', error);
    }

    // 6. Get updated progress
    const progressUpdate = await objectiveProgressService.getProgress(sprint.objectiveId);

    // 7. Check if objective milestone reached (but don't auto-complete)
    // Objectives should only be marked complete when user explicitly confirms mastery
    if (progressUpdate.completedDays >= progressUpdate.totalEstimatedDays) {
      notifications.push({
        type: 'objective_progress',
        title: 'Initial Goal Reached! 🎯',
        message: `You've completed ${progressUpdate.completedDays} days of ${sprint.objective.title}. Ready to mark as complete or continue learning?`,
        data: {
          objectiveId: sprint.objectiveId,
          totalDays: progressUpdate.completedDays,
          totalHours: progressUpdate.totalHoursSpent,
          suggestCompletion: true
        }
      });

      // DO NOT auto-complete - let user decide when they've truly mastered the objective
      // User can manually mark as complete when ready
    } else {
      // Progress notification
      const milestones = [25, 50, 75];
      const nearestMilestone = milestones.find(m => 
        Math.abs(progressUpdate.percentComplete - m) < 2
      );

      if (nearestMilestone) {
        notifications.push({
          type: 'objective_progress',
          title: `${nearestMilestone}% Complete!`,
          message: `You're ${nearestMilestone}% of the way through ${sprint.objective.title}`,
          data: {
            percentComplete: progressUpdate.percentComplete,
            daysRemaining: progressUpdate.daysRemaining
          }
        });
      }
    }

    return {
      sprintMarkedComplete: true,
      dayCompleted: markResult.dayCompleted,
      nextSprintGenerated,
      nextSprint,
      milestoneReached,
      progressUpdate,
      streakUpdated: markResult.streakUpdated,
      notifications
    };
  }

  /**
   * Validate sprint can be marked complete
   */
  async validateCompletion(params: {
    sprintId: string;
    completionData: CompletionData;
  }): Promise<ValidationResult> {
    const { sprintId, completionData } = params;

    const sprint = await db.sprint.findUnique({
      where: { id: sprintId }
    });

    if (!sprint) {
      return {
        canComplete: false,
        reason: 'Sprint not found'
      };
    }

    if (sprint.completedAt) {
      return {
        canComplete: false,
        reason: 'Sprint already completed'
      };
    }

    const missingRequirements: string[] = [];

    // Check minimum task completion
    const completionRate = completionData.totalTasks > 0
      ? (completionData.tasksCompleted / completionData.totalTasks) * 100
      : 0;

    if (completionRate < 50) {
      missingRequirements.push('At least 50% of tasks must be completed');
    }

    // Check evidence submission (optional but recommended)
    if (!completionData.evidenceSubmitted) {
      // This is a warning, not a blocker
      console.warn('[sprintCompletion] No evidence submitted', { sprintId });
    }

    if (missingRequirements.length > 0) {
      return {
        canComplete: false,
        reason: 'Missing requirements',
        missingRequirements
      };
    }

    return {
      canComplete: true
    };
  }

  /**
   * Handle partial completion (update progress without marking complete)
   */
  async handlePartialCompletion(params: {
    sprintId: string;
    completionPercentage: number;
    hoursSpent?: number;
  }): Promise<void> {
    const { sprintId, completionPercentage } = params;

    const sprint = await db.sprint.findUnique({
      where: { id: sprintId }
    });

    if (!sprint) {
      throw new AppError('Sprint not found', 404, 'SPRINT_NOT_FOUND');
    }

    if (sprint.completedAt) {
      throw new AppError('Sprint already completed', 400, 'SPRINT_ALREADY_COMPLETED');
    }

    await objectiveProgressService.updateProgress({
      objectiveId: sprint.objectiveId,
      sprintId,
      completionPercentage,
      hoursSpent: params.hoursSpent
    });

    console.log('[sprintCompletion] Partial completion updated', {
      sprintId,
      completionPercentage
    });
  }

  /**
   * Get completion status for a sprint
   */
  async getCompletionStatus(sprintId: string): Promise<{
    canComplete: boolean;
    completionPercentage: number;
    tasksCompleted: number;
    totalTasks: number;
    missingRequirements?: string[];
  }> {
    const sprint = await db.sprint.findUnique({
      where: { id: sprintId }
    });

    if (!sprint) {
      throw new AppError('Sprint not found', 404, 'SPRINT_NOT_FOUND');
    }

    const plannerOutput = sprint.plannerOutput as any;
    const microTasks = plannerOutput?.projects?.[0]?.microTasks ?? [];
    const totalTasks = microTasks.length;

    // In a real implementation, you'd track which tasks are completed
    // For now, use the stored completion percentage
    const completionPercentage = sprint.completionPercentage ?? 0;
    const tasksCompleted = Math.floor((completionPercentage / 100) * totalTasks);

    const validation = await this.validateCompletion({
      sprintId,
      completionData: {
        tasksCompleted,
        totalTasks,
        hoursSpent: sprint.totalEstimatedHours,
        evidenceSubmitted: false
      }
    });

    return {
      canComplete: validation.canComplete,
      completionPercentage,
      tasksCompleted,
      totalTasks,
      missingRequirements: validation.missingRequirements
    };
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const sprintCompletionHandler = new SprintCompletionHandler();
export default sprintCompletionHandler;
