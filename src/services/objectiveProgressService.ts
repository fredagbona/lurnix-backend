import { db } from '../prisma/prismaWrapper.js';
import { AppError } from '../errors/AppError.js';
import type { Objective, Sprint } from '@prisma/client';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface ObjectiveProgress {
  objectiveId: string;
  
  // Timeline
  totalEstimatedDays: number;
  currentDay: number;
  completedDays: number;
  daysRemaining: number;
  percentComplete: number;
  
  // Sprint stats
  totalSprints: number;
  completedSprints: number;
  currentStreak: number;
  longestStreak: number;
  
  // Milestone progress
  milestonesTotal: number;
  milestonesCompleted: number;
  nextMilestone?: {
    title: string;
    targetDay: number;
    daysUntil: number;
    description?: string | null;
  };
  
  // Time tracking
  totalHoursSpent: number;
  averageHoursPerDay: number;
  estimatedCompletionDate: Date;
  projectedCompletionDate: Date; // Based on actual pace
  
  // Performance
  onTrack: boolean;
  performanceRating: 'ahead' | 'on-track' | 'behind' | 'at-risk';
  completionRate: number; // % of tasks completed per sprint
  velocity: number; // Days completed per week
  
  // Learning insights
  strugglingAreas: string[];
  masteredSkills: string[];
  recommendedFocus: string[];
}

export interface UpdateProgressParams {
  objectiveId: string;
  sprintId: string;
  completionPercentage: number;
  hoursSpent?: number;
}

export interface MarkSprintCompleteParams {
  sprintId: string;
  completionData: {
    tasksCompleted: number;
    totalTasks: number;
    hoursSpent: number;
    evidenceSubmitted: boolean;
  };
}

export interface MarkSprintCompleteResult {
  dayCompleted: number;
  nextDayNumber: number;
  milestoneReached?: any;
  streakUpdated: boolean;
}

export interface PerformanceMetrics {
  completionRate: number;
  velocity: number;
  onTrack: boolean;
  projectedEndDate: Date;
}

export interface LearningInsights {
  strugglingAreas: string[];
  masteredSkills: string[];
  recommendedFocus: string[];
  strengthAreas: string[];
}

// ============================================
// SERVICE CLASS
// ============================================

class ObjectiveProgressService {
  /**
   * Get comprehensive progress for objective
   */
  async getProgress(objectiveId: string): Promise<ObjectiveProgress> {
    const objective = await db.objective.findUnique({
      where: { id: objectiveId },
      include: {
        sprints: {
          orderBy: { dayNumber: 'asc' }
        },
        milestones: {
          orderBy: { targetDay: 'asc' }
        }
      }
    });

    if (!objective) {
      throw new AppError('Objective not found', 404, 'OBJECTIVE_NOT_FOUND');
    }

    const completedSprints = objective.sprints.filter((s: any) => s.completedAt !== null);
    const totalSprints = objective.sprints.length;
    const estimatedTotalDays = objective.estimatedTotalDays ?? 30;
    const completedDays = objective.completedDays;
    const currentDay = objective.currentDay;
    const daysRemaining = Math.max(0, estimatedTotalDays - completedDays);
    const percentComplete = estimatedTotalDays > 0 
      ? (completedDays / estimatedTotalDays) * 100 
      : 0;

    // Calculate streaks
    const { currentStreak, longestStreak } = this.calculateStreaks(objective.sprints);

    // Milestone progress
    const milestonesTotal = objective.milestones.length;
    const milestonesCompleted = objective.milestones.filter((m: any) => m.isCompleted).length;
    const nextMilestone = objective.milestones.find((m: any) => !m.isCompleted);

    // Time tracking
    const totalHoursSpent = completedSprints.reduce((sum: number, s: any) => {
      return sum + (s.totalEstimatedHours ?? 0);
    }, 0);
    const averageHoursPerDay = completedDays > 0 ? totalHoursSpent / completedDays : 0;

    // Estimated completion date
    const estimatedCompletionDate = this.calculateEstimatedCompletionDate(
      objective.estimatedAt ?? objective.createdAt,
      estimatedTotalDays
    );

    // Performance metrics
    const metrics = await this.calculatePerformanceMetrics(objectiveId);
    const projectedCompletionDate = metrics.projectedEndDate;

    // Learning insights
    const insights = await this.getLearningInsights(objectiveId);

    return {
      objectiveId,
      totalEstimatedDays: estimatedTotalDays,
      currentDay,
      completedDays,
      daysRemaining,
      percentComplete,
      totalSprints,
      completedSprints: completedSprints.length,
      currentStreak,
      longestStreak,
      milestonesTotal,
      milestonesCompleted,
      nextMilestone: nextMilestone ? {
        title: nextMilestone.title,
        targetDay: nextMilestone.targetDay,
        daysUntil: nextMilestone.targetDay - completedDays,
        description: nextMilestone.description
      } : undefined,
      totalHoursSpent,
      averageHoursPerDay,
      estimatedCompletionDate,
      projectedCompletionDate,
      onTrack: metrics.onTrack,
      performanceRating: this.getPerformanceRating(metrics),
      completionRate: metrics.completionRate,
      velocity: metrics.velocity,
      strugglingAreas: insights.strugglingAreas,
      masteredSkills: insights.masteredSkills,
      recommendedFocus: insights.recommendedFocus
    };
  }

  /**
   * Update progress after sprint activity
   */
  async updateProgress(params: UpdateProgressParams): Promise<void> {
    const { objectiveId, sprintId, completionPercentage, hoursSpent } = params;

    await db.sprint.update({
      where: { id: sprintId },
      data: {
        completionPercentage: Math.min(100, Math.max(0, completionPercentage))
      }
    });

    // Update objective progress percentage
    const objective = await db.objective.findUnique({
      where: { id: objectiveId },
      include: { sprints: true }
    });

    if (objective) {
      const totalCompletion = objective.sprints.reduce((sum: number, s: any) => {
        return sum + (s.completionPercentage ?? 0);
      }, 0);
      const avgCompletion = objective.sprints.length > 0 
        ? totalCompletion / objective.sprints.length 
        : 0;

      await db.objective.update({
        where: { id: objectiveId },
        data: {
          progressPercentage: avgCompletion
        }
      });
    }
  }

  /**
   * Mark sprint as complete and update objective progress
   */
  async markSprintComplete(params: MarkSprintCompleteParams): Promise<MarkSprintCompleteResult> {
    const { sprintId, completionData } = params;

    const sprint = await db.sprint.findUnique({
      where: { id: sprintId },
      include: {
        objective: {
          include: {
            milestones: true,
            sprints: {
              orderBy: { dayNumber: 'desc' },
              take: 10
            }
          }
        }
      }
    });

    if (!sprint) {
      throw new AppError('Sprint not found', 404, 'SPRINT_NOT_FOUND');
    }

    if (sprint.completedAt) {
      throw new AppError('Sprint already completed', 400, 'SPRINT_ALREADY_COMPLETED');
    }

    const completionPercentage = completionData.totalTasks > 0
      ? (completionData.tasksCompleted / completionData.totalTasks) * 100
      : 100;

    // Mark sprint as completed
    await db.sprint.update({
      where: { id: sprintId },
      data: {
        completedAt: new Date(),
        completionPercentage,
        status: 'reviewed'
      }
    });

    // Update objective progress
    const objective = sprint.objective;
    const newCompletedDays = objective.completedDays + 1;
    const newProgressPercentage = objective.estimatedTotalDays 
      ? (newCompletedDays / objective.estimatedTotalDays) * 100
      : 0;

    await db.objective.update({
      where: { id: objective.id },
      data: {
        completedDays: newCompletedDays,
        progressPercentage: newProgressPercentage
      }
    });

    // Check for milestone completion
    const milestoneReached = await this.checkMilestoneCompletion(objective.id);

    // Calculate streak
    const { currentStreak } = this.calculateStreaks(objective.sprints);
    const streakUpdated = currentStreak > 0;

    return {
      dayCompleted: sprint.dayNumber,
      nextDayNumber: sprint.dayNumber + 1,
      milestoneReached: milestoneReached[0],
      streakUpdated
    };
  }

  /**
   * Check and update milestone completion
   */
  async checkMilestoneCompletion(objectiveId: string): Promise<any[]> {
    const objective = await db.objective.findUnique({
      where: { id: objectiveId },
      include: {
        milestones: {
          where: { isCompleted: false },
          orderBy: { targetDay: 'asc' }
        }
      }
    });

    if (!objective) {
      return [];
    }

    const completedMilestones: any[] = [];

    for (const milestone of objective.milestones) {
      if (objective.completedDays >= milestone.targetDay) {
        await db.objectiveMilestone.update({
          where: { id: milestone.id },
          data: {
            isCompleted: true,
            completedAt: new Date()
          }
        });
        completedMilestones.push(milestone);
      }
    }

    return completedMilestones;
  }

  /**
   * Calculate performance metrics
   */
  async calculatePerformanceMetrics(objectiveId: string): Promise<PerformanceMetrics> {
    const objective = await db.objective.findUnique({
      where: { id: objectiveId },
      include: {
        sprints: {
          where: { completedAt: { not: null } },
          orderBy: { completedAt: 'asc' }
        }
      }
    });

    if (!objective || objective.sprints.length === 0) {
      return {
        completionRate: 0,
        velocity: 0,
        onTrack: true,
        projectedEndDate: new Date()
      };
    }

    // Calculate completion rate (average task completion per sprint)
    const completionRates = objective.sprints.map((s: any) => s.completionPercentage ?? 0);
    const completionRate = completionRates.length > 0
      ? completionRates.reduce((sum: number, rate: number) => sum + rate, 0) / completionRates.length
      : 0;

    // Calculate velocity (days completed per week)
    const firstSprint = objective.sprints[0];
    const lastSprint = objective.sprints[objective.sprints.length - 1];
    
    if (!firstSprint.completedAt || !lastSprint.completedAt) {
      return {
        completionRate,
        velocity: 0,
        onTrack: true,
        projectedEndDate: new Date()
      };
    }

    const timeSpan = lastSprint.completedAt.getTime() - firstSprint.completedAt.getTime();
    const weeksElapsed = timeSpan / (1000 * 60 * 60 * 24 * 7);
    const velocity = weeksElapsed > 0 ? objective.completedDays / weeksElapsed : 0;

    // Project completion date based on velocity
    const daysRemaining = (objective.estimatedTotalDays ?? 30) - objective.completedDays;
    const weeksRemaining = velocity > 0 ? daysRemaining / velocity : daysRemaining / 7;
    const projectedEndDate = new Date();
    projectedEndDate.setDate(projectedEndDate.getDate() + (weeksRemaining * 7));

    // Determine if on track
    const expectedProgress = objective.estimatedTotalDays 
      ? objective.completedDays / objective.estimatedTotalDays
      : 0;
    const timeElapsed = Date.now() - (objective.estimatedAt ?? objective.createdAt).getTime();
    const expectedTimeElapsed = (objective.estimatedTotalDays ?? 30) * 24 * 60 * 60 * 1000;
    const actualProgress = expectedTimeElapsed > 0 ? timeElapsed / expectedTimeElapsed : 0;
    const onTrack = expectedProgress >= actualProgress * 0.8; // Within 20% tolerance

    return {
      completionRate,
      velocity,
      onTrack,
      projectedEndDate
    };
  }

  /**
   * Get learning insights
   */
  async getLearningInsights(objectiveId: string): Promise<LearningInsights> {
    const objective = await db.objective.findUnique({
      where: { id: objectiveId },
      include: {
        sprints: {
          where: { completedAt: { not: null } },
          orderBy: { completedAt: 'desc' },
          take: 10
        }
      }
    });

    if (!objective) {
      return {
        strugglingAreas: [],
        masteredSkills: [],
        recommendedFocus: [],
        strengthAreas: []
      };
    }

    // Analyze sprint completion rates to identify struggling areas
    const strugglingAreas: string[] = [];
    const masteredSkills: string[] = [];
    const strengthAreas: string[] = [];

    // Low completion rate sprints indicate struggling
    const lowCompletionSprints = objective.sprints.filter((s: any) => 
      (s.completionPercentage ?? 0) < 70
    );

    if (lowCompletionSprints.length > 0) {
      strugglingAreas.push('Task completion consistency');
    }

    // High completion rate sprints indicate mastery
    const highCompletionSprints = objective.sprints.filter((s: any) =>
      (s.completionPercentage ?? 0) >= 90
    );

    if (highCompletionSprints.length >= 3) {
      masteredSkills.push('Consistent execution');
      strengthAreas.push('Strong learning momentum');
    }

    // Recommended focus based on progress
    const recommendedFocus: string[] = [];
    if (objective.completedDays < (objective.estimatedTotalDays ?? 30) * 0.3) {
      recommendedFocus.push('Build strong fundamentals');
    } else if (objective.completedDays < (objective.estimatedTotalDays ?? 30) * 0.7) {
      recommendedFocus.push('Practice intermediate concepts');
    } else {
      recommendedFocus.push('Complete portfolio projects');
    }

    return {
      strugglingAreas,
      masteredSkills,
      recommendedFocus,
      strengthAreas
    };
  }

  /**
   * Calculate streaks from sprint history
   */
  private calculateStreaks(sprints: Sprint[]): { currentStreak: number; longestStreak: number } {
    const completedSprints = sprints
      .filter(s => s.completedAt !== null)
      .sort((a, b) => a.dayNumber - b.dayNumber);

    if (completedSprints.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 0; i < completedSprints.length; i++) {
      if (i > 0) {
        const prevDay = completedSprints[i - 1].dayNumber;
        const currDay = completedSprints[i].dayNumber;

        if (currDay === prevDay + 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    // Current streak is the last consecutive sequence
    const lastSprint = completedSprints[completedSprints.length - 1];
    const today = new Date();
    const daysSinceLastSprint = lastSprint.completedAt
      ? Math.floor((today.getTime() - lastSprint.completedAt.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceLastSprint <= 1) {
      currentStreak = tempStreak;
    } else {
      currentStreak = 0;
    }

    return { currentStreak, longestStreak };
  }

  /**
   * Calculate estimated completion date
   */
  private calculateEstimatedCompletionDate(startDate: Date, totalDays: number): Date {
    const completionDate = new Date(startDate);
    completionDate.setDate(completionDate.getDate() + totalDays);
    return completionDate;
  }

  /**
   * Get performance rating
   */
  private getPerformanceRating(metrics: PerformanceMetrics): 'ahead' | 'on-track' | 'behind' | 'at-risk' {
    if (metrics.velocity > 1.2) {
      return 'ahead';
    } else if (metrics.onTrack) {
      return 'on-track';
    } else if (metrics.velocity > 0.5) {
      return 'behind';
    } else {
      return 'at-risk';
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const objectiveProgressService = new ObjectiveProgressService();
export default objectiveProgressService;
