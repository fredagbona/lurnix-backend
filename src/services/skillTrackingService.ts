import { PrismaClient, SkillStatus, SkillDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

// ============================================
// INTERFACES
// ============================================

export interface SkillLevel {
  skillId: string;
  skillName: string;
  level: number; // 0-100
  status: SkillStatus;
  successRate: number;
  practiceCount: number;
  lastPracticedAt?: Date;
  nextReviewAt?: Date;
  needsReview: boolean;
}

export interface SkillMap {
  userId: string;
  skills: SkillLevel[];
  masteredSkills: string[]; // Skill names
  strugglingAreas: string[]; // Skill names
  inProgress: string[]; // Skill names
  notStarted: string[]; // Skill names
  overallProgress: number; // 0-100
}

export interface SkillUpdateResult {
  skillId: string;
  skillName: string;
  previousLevel: number;
  newLevel: number;
  statusChanged: boolean;
  newStatus: SkillStatus;
  masteredNow: boolean;
  needsReview: boolean;
}

export interface StrugglingArea {
  skillId: string;
  skillName: string;
  level: number;
  consecutiveFailures: number;
  recommendedAction: string;
}

export interface SkillDueForReview {
  skillId: string;
  skillName: string;
  lastPracticedAt: Date;
  daysSinceLastPractice: number;
  reviewInterval: number;
}

// ============================================
// SKILL TRACKING SERVICE
// ============================================

class SkillTrackingService {
  /**
   * Get user's complete skill map
   */
  async getUserSkillMap(userId: string, objectiveId?: string): Promise<SkillMap> {
    // Get all user skills
    const userSkills = await prisma.userSkill.findMany({
      where: { userId },
      include: {
        skill: true,
      },
    });

    // If objectiveId provided, filter to skills relevant to that objective
    let relevantSkills = userSkills;
    if (objectiveId) {
      const objective = await prisma.objective.findUnique({
        where: { id: objectiveId },
        select: { requiredSkills: true },
      });

      if (objective?.requiredSkills.length) {
        relevantSkills = userSkills.filter((us) =>
          objective.requiredSkills.includes(us.skill.name)
        );
      }
    }

    // Map to SkillLevel format
    const skills: SkillLevel[] = relevantSkills.map((us) => ({
      skillId: us.skillId,
      skillName: us.skill.name,
      level: us.level,
      status: us.status,
      successRate: us.successRate,
      practiceCount: us.practiceCount,
      lastPracticedAt: us.lastPracticedAt || undefined,
      nextReviewAt: us.nextReviewAt || undefined,
      needsReview: us.needsReview,
    }));

    // Categorize skills
    const masteredSkills = skills
      .filter((s) => s.status === 'mastered')
      .map((s) => s.skillName);

    const strugglingAreas = skills
      .filter((s) => s.status === 'struggling')
      .map((s) => s.skillName);

    const inProgress = skills
      .filter((s) => ['learning', 'practicing', 'proficient'].includes(s.status))
      .map((s) => s.skillName);

    const notStarted = skills
      .filter((s) => s.status === 'not_started')
      .map((s) => s.skillName);

    // Calculate overall progress
    const totalSkills = skills.length;
    const overallProgress =
      totalSkills > 0
        ? Math.round(skills.reduce((sum, s) => sum + s.level, 0) / totalSkills)
        : 0;

    return {
      userId,
      skills,
      masteredSkills,
      strugglingAreas,
      inProgress,
      notStarted,
      overallProgress,
    };
  }

  /**
   * Update skill level after sprint completion
   */
  async updateSkillLevel(params: {
    userId: string;
    skillId: string;
    performance: number; // 0-100 score
    practiceType: 'introduction' | 'practice' | 'review' | 'mastery';
  }): Promise<SkillUpdateResult> {
    const { userId, skillId, performance, practiceType } = params;

    // Get or create user skill
    let userSkill = await prisma.userSkill.findUnique({
      where: {
        userId_skillId: { userId, skillId },
      },
      include: { skill: true },
    });

    if (!userSkill) {
      userSkill = await prisma.userSkill.create({
        data: {
          userId,
          skillId,
          level: 0,
          status: 'not_started',
        },
        include: { skill: true },
      });
    }

    const previousLevel = userSkill.level;
    const previousStatus = userSkill.status;

    // Calculate level change
    const levelChange = this.calculateLevelChange({
      currentLevel: previousLevel,
      performance,
      practiceType,
      consecutiveFailures: userSkill.consecutiveFailures,
    });

    const newLevel = Math.max(0, Math.min(100, previousLevel + levelChange));

    // Update success rate
    const totalAttempts = userSkill.practiceCount + 1;
    const newSuccessRate =
      (userSkill.successRate * userSkill.practiceCount + performance / 100) /
      totalAttempts;

    // Update consecutive failures
    const consecutiveFailures = performance < 70 ? userSkill.consecutiveFailures + 1 : 0;

    // Determine new status
    const newStatus = this.determineSkillStatus(newLevel, newSuccessRate);

    // Calculate next review date
    const { nextReviewAt, newInterval } = this.calculateNextReview({
      currentInterval: userSkill.reviewInterval,
      performance,
    });

    // Update user skill
    const updatedSkill = await prisma.userSkill.update({
      where: {
        userId_skillId: { userId, skillId },
      },
      data: {
        level: newLevel,
        status: newStatus,
        practiceCount: totalAttempts,
        successRate: newSuccessRate,
        lastPracticedAt: new Date(),
        consecutiveFailures,
        needsReview: consecutiveFailures >= 2 || performance < 70,
        nextReviewAt,
        reviewInterval: newInterval,
        masteredAt: newStatus === 'mastered' && previousStatus !== 'mastered' ? new Date() : userSkill.masteredAt,
      },
      include: { skill: true },
    });

    return {
      skillId,
      skillName: updatedSkill.skill.name,
      previousLevel,
      newLevel,
      statusChanged: previousStatus !== newStatus,
      newStatus,
      masteredNow: newStatus === 'mastered' && previousStatus !== 'mastered',
      needsReview: updatedSkill.needsReview,
    };
  }

  /**
   * Batch update skills from sprint completion
   */
  async updateSkillsFromSprint(params: {
    userId: string;
    sprintId: string;
    skillScores: Array<{
      skillId: string;
      score: number;
    }>;
  }): Promise<SkillUpdateResult[]> {
    const { userId, sprintId, skillScores } = params;

    // Get sprint to determine practice type
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        skills: {
          include: { skill: true },
        },
      },
    });

    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found`);
    }

    const results: SkillUpdateResult[] = [];

    for (const { skillId, score } of skillScores) {
      // Find practice type from sprint skills
      const sprintSkill = sprint.skills.find((ss) => ss.skillId === skillId);
      const practiceType = (sprintSkill?.practiceType || 'practice') as
        | 'introduction'
        | 'practice'
        | 'review'
        | 'mastery';

      const result = await this.updateSkillLevel({
        userId,
        skillId,
        performance: score,
        practiceType,
      });

      results.push(result);

      // Update sprint skill with post-sprint level
      if (sprintSkill) {
        await prisma.sprintSkill.update({
          where: { id: sprintSkill.id },
          data: {
            postSprintLevel: result.newLevel,
            scoreAchieved: score,
          },
        });
      }
    }

    return results;
  }

  /**
   * Detect struggling areas
   */
  async detectStrugglingAreas(userId: string): Promise<StrugglingArea[]> {
    const userSkills = await prisma.userSkill.findMany({
      where: {
        userId,
        OR: [
          { status: 'struggling' },
          { consecutiveFailures: { gte: 2 } },
          { successRate: { lt: 0.7 } },
        ],
      },
      include: { skill: true },
    });

    return userSkills.map((us) => ({
      skillId: us.skillId,
      skillName: us.skill.name,
      level: us.level,
      consecutiveFailures: us.consecutiveFailures,
      recommendedAction: this.getRecommendedAction(us),
    }));
  }

  /**
   * Get skills that need review (spaced repetition)
   */
  async getSkillsDueForReview(userId: string): Promise<SkillDueForReview[]> {
    const now = new Date();

    const userSkills = await prisma.userSkill.findMany({
      where: {
        userId,
        nextReviewAt: {
          lte: now,
        },
        status: {
          in: ['proficient', 'mastered'],
        },
      },
      include: { skill: true },
    });

    return userSkills.map((us) => {
      const daysSinceLastPractice = us.lastPracticedAt
        ? Math.floor((now.getTime() - us.lastPracticedAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        skillId: us.skillId,
        skillName: us.skill.name,
        lastPracticedAt: us.lastPracticedAt!,
        daysSinceLastPractice,
        reviewInterval: us.reviewInterval,
      };
    });
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Calculate skill level change based on performance
   */
  private calculateLevelChange(params: {
    currentLevel: number;
    performance: number;
    practiceType: string;
    consecutiveFailures: number;
  }): number {
    const { currentLevel, performance, practiceType, consecutiveFailures } = params;

    // Base change depends on performance
    let baseChange = 0;

    if (performance >= 90) {
      baseChange = 15; // Excellent performance
    } else if (performance >= 80) {
      baseChange = 10; // Good performance
    } else if (performance >= 70) {
      baseChange = 5; // Acceptable performance
    } else if (performance >= 60) {
      baseChange = 2; // Weak performance
    } else {
      baseChange = -5; // Poor performance (decrease level)
    }

    // Adjust based on practice type
    const practiceTypeMultiplier: Record<string, number> = {
      introduction: 1.2, // Learn faster on first exposure
      practice: 1.0, // Normal learning rate
      review: 0.8, // Slower gains on review (maintenance)
      mastery: 1.5, // Faster gains when pushing to mastery
    };

    baseChange *= practiceTypeMultiplier[practiceType] || 1.0;

    // Diminishing returns at higher levels
    if (currentLevel > 80) {
      baseChange *= 0.5;
    } else if (currentLevel > 60) {
      baseChange *= 0.75;
    }

    // Penalty for consecutive failures
    if (consecutiveFailures > 0) {
      baseChange *= 0.7;
    }

    return Math.round(baseChange);
  }

  /**
   * Determine skill status based on level and success rate
   */
  private determineSkillStatus(level: number, successRate: number): SkillStatus {
    if (level >= 90 && successRate >= 0.85) {
      return 'mastered';
    } else if (level >= 70 && successRate >= 0.75) {
      return 'proficient';
    } else if (level >= 40 && successRate >= 0.6) {
      return 'practicing';
    } else if (level >= 20) {
      return 'learning';
    } else if (successRate < 0.5 && level < 40) {
      return 'struggling';
    } else {
      return 'not_started';
    }
  }

  /**
   * Calculate next review date using spaced repetition algorithm
   */
  private calculateNextReview(params: {
    currentInterval: number;
    performance: number;
  }): { nextReviewAt: Date; newInterval: number } {
    const { currentInterval, performance } = params;

    let newInterval = currentInterval;

    // Adjust interval based on performance (simplified SM-2 algorithm)
    if (performance >= 90) {
      // Excellent: Double the interval
      newInterval = currentInterval * 2;
    } else if (performance >= 80) {
      // Good: Increase interval by 50%
      newInterval = Math.round(currentInterval * 1.5);
    } else if (performance >= 70) {
      // Acceptable: Keep same interval
      newInterval = currentInterval;
    } else {
      // Poor: Reset to shorter interval
      newInterval = Math.max(1, Math.floor(currentInterval / 2));
    }

    // Cap maximum interval at 60 days
    newInterval = Math.min(60, newInterval);

    const nextReviewAt = new Date();
    nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

    return { nextReviewAt, newInterval };
  }

  /**
   * Get recommended action for struggling skill
   */
  private getRecommendedAction(userSkill: any): string {
    if (userSkill.consecutiveFailures >= 3) {
      return 'Immediate review sprint required - Multiple consecutive failures detected';
    } else if (userSkill.successRate < 0.5) {
      return 'Revisit fundamentals - Success rate below 50%';
    } else if (userSkill.level < 30) {
      return 'Additional practice needed - Skill level too low';
    } else {
      return 'Review and practice - Struggling detected';
    }
  }
}

export default new SkillTrackingService();
