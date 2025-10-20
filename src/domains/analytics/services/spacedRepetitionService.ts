import { PrismaClient, ReviewType } from '@prisma/client';
import skillTrackingService from './skillTrackingService.js';

const prisma = new PrismaClient();

// ============================================
// INTERFACES
// ============================================

export interface ReviewScheduleInfo {
  skillId: string;
  skillName: string;
  lastReviewedAt: Date;
  nextReviewAt: Date;
  daysSinceLastReview: number;
  daysUntilNextReview: number;
  currentInterval: number;
  reviewCount: number;
  isOverdue: boolean;
}

export interface ReviewSprintPlan {
  dayNumber: number;
  type: ReviewType;
  skillsToReview: string[];
  estimatedHours: number;
  reviewTasks: Array<{
    skillId: string;
    taskType: 'quiz' | 'practice' | 'project';
    description: string;
  }>;
}

export interface ReviewRecommendation {
  type: ReviewType;
  skillIds: string[];
  priority: 'high' | 'medium' | 'low';
  reason: string;
  suggestedDay: number;
}

// ============================================
// SPACED REPETITION SERVICE
// ============================================

class SpacedRepetitionService {
  /**
   * Get skills due for review
   */
  async getSkillsDueForReview(params: {
    userId: string;
    objectiveId?: string;
  }): Promise<ReviewScheduleInfo[]> {
    const { userId, objectiveId } = params;
    const now = new Date();

    // Get review schedules
    const schedules = await prisma.reviewSchedule.findMany({
      where: {
        userId,
        nextReviewAt: {
          lte: now,
        },
      },
      include: {
        skill: true,
      },
    });

    // Filter by objective if provided
    let filteredSchedules = schedules;
    if (objectiveId) {
      const objective = await prisma.objective.findUnique({
        where: { id: objectiveId },
        select: { requiredSkills: true },
      });

      if (objective?.requiredSkills.length) {
        filteredSchedules = schedules.filter((s) =>
          objective.requiredSkills.includes(s.skill.name)
        );
      }
    }

    return filteredSchedules.map((schedule) => {
      const daysSinceLastReview = schedule.lastReviewedAt
        ? Math.floor((now.getTime() - schedule.lastReviewedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      const daysUntilNextReview = Math.floor(
        (schedule.nextReviewAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        skillId: schedule.skillId,
        skillName: schedule.skill.name,
        lastReviewedAt: schedule.lastReviewedAt || schedule.createdAt,
        nextReviewAt: schedule.nextReviewAt,
        daysSinceLastReview,
        daysUntilNextReview,
        currentInterval: schedule.currentInterval,
        reviewCount: schedule.reviewCount,
        isOverdue: daysUntilNextReview < 0,
      };
    });
  }

  /**
   * Schedule review for newly learned skill
   */
  async scheduleSkillReview(params: {
    userId: string;
    skillId: string;
    initialMasteryLevel: number;
  }) {
    const { userId, skillId, initialMasteryLevel } = params;

    // Check if schedule already exists
    const existing = await prisma.reviewSchedule.findUnique({
      where: {
        userId_skillId: { userId, skillId },
      },
    });

    if (existing) {
      // Update existing schedule
      return existing;
    }

    // Calculate initial review date based on mastery level
    const initialInterval = this.calculateInitialInterval(initialMasteryLevel);
    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + initialInterval);

    const schedule = await prisma.reviewSchedule.create({
      data: {
        userId,
        skillId,
        currentInterval: initialInterval,
        nextReviewAt,
        reviewCount: 0,
      },
    });

    return schedule;
  }

  /**
   * Update review schedule after review completion
   */
  async updateReviewSchedule(params: {
    userId: string;
    skillId: string;
    reviewScore: number;
  }): Promise<{
    schedule: any;
    intervalAdjusted: boolean;
    nextReviewAt: Date;
  }> {
    const { userId, skillId, reviewScore } = params;

    const schedule = await prisma.reviewSchedule.findUnique({
      where: {
        userId_skillId: { userId, skillId },
      },
    });

    if (!schedule) {
      throw new Error(`Review schedule not found for user ${userId}, skill ${skillId}`);
    }

    // Calculate new interval based on performance
    const { newInterval, reasoning } = await this.calculateReviewInterval({
      currentInterval: schedule.currentInterval,
      reviewScore,
      reviewCount: schedule.reviewCount,
    });

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

    // Update average review score
    const newAverageScore =
      (schedule.averageReviewScore * schedule.reviewCount + reviewScore) /
      (schedule.reviewCount + 1);

    // Check if skill is retained (consistently scoring 80%+)
    const isRetained = newAverageScore >= 80 && schedule.reviewCount >= 2;

    const updatedSchedule = await prisma.reviewSchedule.update({
      where: {
        userId_skillId: { userId, skillId },
      },
      data: {
        currentInterval: newInterval,
        nextReviewAt,
        lastReviewedAt: new Date(),
        reviewCount: schedule.reviewCount + 1,
        averageReviewScore: newAverageScore,
        isRetained,
      },
    });

    return {
      schedule: updatedSchedule,
      intervalAdjusted: newInterval !== schedule.currentInterval,
      nextReviewAt,
    };
  }

  /**
   * Generate review sprint
   */
  async generateReviewSprint(params: {
    objectiveId: string;
    userId: string;
    skillIds: string[];
    type: ReviewType;
    insertAfterDay: number;
  }) {
    const { objectiveId, userId, skillIds, type, insertAfterDay } = params;

    // Get skills
    const skills = await prisma.skill.findMany({
      where: { id: { in: skillIds } },
    });

    // Get user skill levels for these skills
    const userSkills = await prisma.userSkill.findMany({
      where: {
        userId,
        skillId: { in: skillIds },
      },
      include: { skill: true },
    });

    // Build review sprint content
    const sprintTitle = `Review: ${skills.slice(0, 2).map((s) => s.name).join(' & ')}${
      skills.length > 2 ? ` +${skills.length - 2} more` : ''
    }`;

    const sprintDescription = this.getReviewTypeDescription(type);

    // Create sprint using planner service (simplified for now)
    const sprint = await prisma.sprint.create({
      data: {
        objectiveId,
        dayNumber: insertAfterDay + 1,
        lengthDays: 1,
        totalEstimatedHours: 2,
        difficulty: 'intermediate',
        status: 'planned',
        isAutoGenerated: true,
        isReviewSprint: true,
        plannerInput: {
          type: 'review',
          skillIds,
        },
        plannerOutput: {
          title: sprintTitle,
          description: sprintDescription,
          microTasks: this.generateReviewTasks(userSkills),
        },
        targetSkills: skillIds,
      },
    });

    // Create review sprint record
    await prisma.reviewSprint.create({
      data: {
        sprintId: sprint.id,
        type,
        skillIds,
        triggerReason: this.getReviewTriggerReason(type),
        scheduledFor: new Date(),
      },
    });

    // Link skills to sprint
    for (const userSkill of userSkills) {
      await prisma.sprintSkill.create({
        data: {
          sprintId: sprint.id,
          skillId: userSkill.skillId,
          targetLevel: Math.min(100, userSkill.level + 10), // Aim to increase by 10
          practiceType: 'review',
          preSprintLevel: userSkill.level,
        },
      });
    }

    return sprint;
  }

  /**
   * Calculate optimal review timing
   */
  async calculateReviewInterval(params: {
    currentInterval: number;
    reviewScore: number;
    reviewCount: number;
  }): Promise<{
    newInterval: number;
    reasoning: string;
  }> {
    const { currentInterval, reviewScore, reviewCount } = params;

    let newInterval = currentInterval;
    let reasoning = '';

    // Simplified SM-2 algorithm
    if (reviewScore >= 90) {
      // Excellent: Double the interval
      newInterval = Math.min(60, currentInterval * 2);
      reasoning = 'Excellent performance - doubling review interval';
    } else if (reviewScore >= 80) {
      // Good: Increase interval by 50%
      newInterval = Math.min(60, Math.round(currentInterval * 1.5));
      reasoning = 'Good performance - increasing review interval';
    } else if (reviewScore >= 70) {
      // Acceptable: Keep same interval
      newInterval = currentInterval;
      reasoning = 'Acceptable performance - maintaining review interval';
    } else if (reviewScore >= 60) {
      // Weak: Decrease interval slightly
      newInterval = Math.max(1, Math.round(currentInterval * 0.75));
      reasoning = 'Weak performance - decreasing review interval';
    } else {
      // Poor: Reset to short interval
      newInterval = Math.max(1, Math.floor(currentInterval / 2));
      reasoning = 'Poor performance - resetting to shorter review interval';
    }

    // Cap maximum interval at 60 days
    newInterval = Math.min(60, newInterval);

    return { newInterval, reasoning };
  }

  /**
   * Check if review sprint should be inserted
   */
  async shouldInsertReviewSprint(params: {
    objectiveId: string;
    userId: string;
    currentDay: number;
  }): Promise<{
    shouldInsert: boolean;
    reason?: string;
    skillsToReview?: string[];
    suggestedDay?: number;
  }> {
    const { objectiveId, userId, currentDay } = params;

    // Get skills due for review
    const skillsDue = await this.getSkillsDueForReview({ userId, objectiveId });

    if (skillsDue.length === 0) {
      return { shouldInsert: false };
    }

    // Check if there are overdue skills
    const overdueSkills = skillsDue.filter((s) => s.isOverdue);

    if (overdueSkills.length >= 3) {
      return {
        shouldInsert: true,
        reason: `${overdueSkills.length} skills are overdue for review`,
        skillsToReview: overdueSkills.map((s) => s.skillId),
        suggestedDay: currentDay + 1,
      };
    }

    // Check if enough skills are due soon (within 2 days)
    const dueSoon = skillsDue.filter((s) => s.daysUntilNextReview <= 2);

    if (dueSoon.length >= 5) {
      return {
        shouldInsert: true,
        reason: `${dueSoon.length} skills are due for review soon`,
        skillsToReview: dueSoon.map((s) => s.skillId),
        suggestedDay: currentDay + 1,
      };
    }

    return { shouldInsert: false };
  }

  /**
   * Get review sprint recommendations
   */
  async getReviewRecommendations(params: {
    userId: string;
    objectiveId: string;
  }): Promise<ReviewRecommendation[]> {
    const { userId, objectiveId } = params;
    const recommendations: ReviewRecommendation[] = [];

    // Get skills due for review
    const skillsDue = await this.getSkillsDueForReview({ userId, objectiveId });

    if (skillsDue.length > 0) {
      const overdueCount = skillsDue.filter((s) => s.isOverdue).length;

      recommendations.push({
        type: 'spaced_repetition',
        skillIds: skillsDue.map((s) => s.skillId),
        priority: overdueCount >= 3 ? 'high' : overdueCount > 0 ? 'medium' : 'low',
        reason: `${skillsDue.length} skills need review (${overdueCount} overdue)`,
        suggestedDay: 0, // Insert ASAP
      });
    }

    // Get struggling skills
    const strugglingAreas = await skillTrackingService.detectStrugglingAreas(userId);

    if (strugglingAreas.length > 0) {
      recommendations.push({
        type: 'struggling_skill',
        skillIds: strugglingAreas.map((s) => s.skillId),
        priority: 'high',
        reason: `${strugglingAreas.length} skills need extra practice`,
        suggestedDay: 0, // Insert ASAP
      });
    }

    return recommendations;
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Calculate initial review interval based on mastery level
   */
  private calculateInitialInterval(masteryLevel: number): number {
    if (masteryLevel >= 90) return 7; // Mastered: review in 1 week
    if (masteryLevel >= 70) return 3; // Proficient: review in 3 days
    if (masteryLevel >= 50) return 2; // Practicing: review in 2 days
    return 1; // Learning: review tomorrow
  }

  /**
   * Get review type description
   */
  private getReviewTypeDescription(type: ReviewType): string {
    const descriptions: Record<ReviewType, string> = {
      spaced_repetition: 'Review previously learned skills to ensure long-term retention.',
      struggling_skill: 'Extra practice for skills you are struggling with.',
      milestone_prep: 'Review all skills before the upcoming milestone.',
      comprehensive: 'Comprehensive review of all skills learned so far.',
    };

    return descriptions[type];
  }

  /**
   * Get review trigger reason
   */
  private getReviewTriggerReason(type: ReviewType): string {
    const reasons: Record<ReviewType, string> = {
      spaced_repetition: 'Skills due for spaced repetition review',
      struggling_skill: 'Struggling skills detected',
      milestone_prep: 'Milestone approaching',
      comprehensive: 'Comprehensive review scheduled',
    };

    return reasons[type];
  }

  /**
   * Generate review tasks
   */
  private generateReviewTasks(userSkills: any[]): any[] {
    return userSkills.map((us, idx) => ({
      id: `review_task_${idx + 1}`,
      title: `Review: ${us.skill.name}`,
      type: 'review',
      estimatedMinutes: 30,
      instructions: `Review and practice ${us.skill.name}. Complete exercises to reinforce your understanding.`,
      acceptanceTest: {
        type: 'checklist',
        spec: [
          'Complete review exercises',
          'Pass review quiz',
          'Demonstrate understanding',
        ],
      },
      resources: [],
    }));
  }
}

export default new SpacedRepetitionService();
