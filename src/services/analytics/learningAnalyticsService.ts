import { db } from '../../prisma/prismaWrapper.js';
import { AppError } from '../../errors/AppError.js';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface LearningAnalytics {
  userId: string;
  
  // Overall stats
  totalObjectives: number;
  activeObjectives: number;
  completedObjectives: number;
  
  // Time stats
  totalDaysLearning: number;
  totalHoursSpent: number;
  averageHoursPerDay: number;
  currentStreak: number;
  longestStreak: number;
  
  // Performance
  averageCompletionRate: number;
  averageVelocity: number;
  skillsAcquired: string[];
  
  // Trends
  weeklyProgress: Array<{
    week: string;
    daysCompleted: number;
    hoursSpent: number;
    sprintsCompleted: number;
  }>;
  
  // Recommendations
  suggestedNextObjectives: string[];
  areasForImprovement: string[];
}

export interface TimelineEvent {
  date: Date;
  type: 'sprint_completed' | 'milestone_reached' | 'objective_started' | 'objective_completed';
  title: string;
  description: string;
  metadata?: Record<string, unknown>;
}

// ============================================
// SERVICE CLASS
// ============================================

class LearningAnalyticsService {
  /**
   * Get comprehensive user analytics
   */
  async getUserAnalytics(userId: string): Promise<LearningAnalytics> {
    const objectives = await db.objective.findMany({
      where: {
        profileSnapshot: { userId }
      },
      include: {
        sprints: {
          where: { completedAt: { not: null } }
        }
      }
    });

    const totalObjectives = objectives.length;
    const activeObjectives = objectives.filter((o: any) => 
      o.status === 'active' && o.completedDays < (o.estimatedTotalDays ?? 30)
    ).length;
    const completedObjectives = objectives.filter((o: any) =>
      o.completedDays >= (o.estimatedTotalDays ?? 30) || o.status === 'completed'
    ).length;

    // Time stats
    const allSprints = objectives.flatMap((o: any) => o.sprints);
    const totalDaysLearning = allSprints.length;
    const totalHoursSpent = allSprints.reduce((sum: number, s: any) => sum + (s.totalEstimatedHours ?? 0), 0);
    const averageHoursPerDay = totalDaysLearning > 0 ? totalHoursSpent / totalDaysLearning : 0;

    // Calculate streaks across all objectives
    const { currentStreak, longestStreak } = this.calculateGlobalStreaks(allSprints);

    // Performance metrics
    const completionRates = allSprints.map((s: any) => s.completionPercentage ?? 0);
    const averageCompletionRate = completionRates.length > 0
      ? completionRates.reduce((sum: number, rate: number) => sum + rate, 0) / completionRates.length
      : 0;

    // Calculate average velocity
    const velocities = await Promise.all(
      objectives.map(async (o: any) => {
        if (o.sprints.length < 2) return 0;
        const firstSprint = o.sprints[0];
        const lastSprint = o.sprints[o.sprints.length - 1];
        if (!firstSprint.completedAt || !lastSprint.completedAt) return 0;
        
        const timeSpan = lastSprint.completedAt.getTime() - firstSprint.completedAt.getTime();
        const weeksElapsed = timeSpan / (1000 * 60 * 60 * 24 * 7);
        return weeksElapsed > 0 ? o.completedDays / weeksElapsed : 0;
      })
    );
    const averageVelocity = velocities.length > 0
      ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length
      : 0;

    // Skills acquired
    const skillsAcquired = [...new Set(
      objectives.flatMap((o: any) => o.requiredSkills)
    )] as string[];

    // Weekly progress
    const weeklyProgress = this.calculateWeeklyProgress(allSprints);

    // Recommendations
    const suggestedNextObjectives = this.generateObjectiveSuggestions(objectives);
    const areasForImprovement = this.identifyImprovementAreas(objectives, averageCompletionRate);

    return {
      userId,
      totalObjectives,
      activeObjectives,
      completedObjectives,
      totalDaysLearning,
      totalHoursSpent,
      averageHoursPerDay,
      currentStreak,
      longestStreak,
      averageCompletionRate,
      averageVelocity,
      skillsAcquired,
      weeklyProgress,
      suggestedNextObjectives,
      areasForImprovement
    };
  }

  /**
   * Get objective timeline with all events
   */
  async getObjectiveTimeline(objectiveId: string): Promise<TimelineEvent[]> {
    const objective = await db.objective.findUnique({
      where: { id: objectiveId },
      include: {
        sprints: {
          where: { completedAt: { not: null } },
          orderBy: { completedAt: 'asc' }
        },
        milestones: {
          where: { isCompleted: true },
          orderBy: { completedAt: 'asc' }
        }
      }
    });

    if (!objective) {
      throw new AppError('Objective not found', 404, 'OBJECTIVE_NOT_FOUND');
    }

    const events: TimelineEvent[] = [];

    // Objective started
    events.push({
      date: objective.createdAt,
      type: 'objective_started',
      title: 'Objective Started',
      description: `Started learning: ${objective.title}`,
      metadata: {
        estimatedDays: objective.estimatedTotalDays,
        difficulty: objective.estimatedTotalDays ? 
          (objective.estimatedTotalDays > 60 ? 'advanced' : 
           objective.estimatedTotalDays > 30 ? 'intermediate' : 'beginner') : 'unknown'
      }
    });

    // Sprint completions
    for (const sprint of objective.sprints) {
      if (sprint.completedAt) {
        const plannerOutput = sprint.plannerOutput as any;
        events.push({
          date: sprint.completedAt,
          type: 'sprint_completed',
          title: `Day ${sprint.dayNumber} Completed`,
          description: plannerOutput?.title ?? `Sprint ${sprint.dayNumber}`,
          metadata: {
            dayNumber: sprint.dayNumber,
            completionRate: sprint.completionPercentage,
            hoursSpent: sprint.totalEstimatedHours
          }
        });
      }
    }

    // Milestone completions
    for (const milestone of objective.milestones) {
      if (milestone.completedAt) {
        events.push({
          date: milestone.completedAt,
          type: 'milestone_reached',
          title: `Milestone: ${milestone.title}`,
          description: milestone.description ?? 'Milestone achieved',
          metadata: {
            targetDay: milestone.targetDay,
            milestoneId: milestone.id
          }
        });
      }
    }

    // Objective completed (if applicable)
    if (objective.completedDays >= (objective.estimatedTotalDays ?? 30)) {
      const lastSprint = objective.sprints[objective.sprints.length - 1];
      if (lastSprint?.completedAt) {
        events.push({
          date: lastSprint.completedAt,
          type: 'objective_completed',
          title: 'Objective Completed! 🎉',
          description: `Completed: ${objective.title}`,
          metadata: {
            totalDays: objective.completedDays,
            totalHours: objective.sprints.reduce((sum: number, s: any) => sum + (s.totalEstimatedHours ?? 0), 0)
          }
        });
      }
    }

    // Sort by date
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    return events;
  }

  /**
   * Export progress data
   */
  async exportProgress(objectiveId: string, format: 'json' | 'csv'): Promise<string> {
    const objective = await db.objective.findUnique({
      where: { id: objectiveId },
      include: {
        sprints: {
          orderBy: { dayNumber: 'asc' }
        },
        milestones: true
      }
    });

    if (!objective) {
      throw new AppError('Objective not found', 404, 'OBJECTIVE_NOT_FOUND');
    }

    if (format === 'json') {
      return JSON.stringify({
        objective: {
          id: objective.id,
          title: objective.title,
          description: objective.description,
          estimatedDays: objective.estimatedTotalDays,
          completedDays: objective.completedDays,
          progressPercentage: objective.progressPercentage
        },
        sprints: objective.sprints.map((s: any) => ({
          dayNumber: s.dayNumber,
          completedAt: s.completedAt,
          completionPercentage: s.completionPercentage,
          hoursSpent: s.totalEstimatedHours
        })),
        milestones: objective.milestones.map((m: any) => ({
          title: m.title,
          targetDay: m.targetDay,
          isCompleted: m.isCompleted,
          completedAt: m.completedAt
        }))
      }, null, 2);
    } else {
      // CSV format
      const lines: string[] = [];
      lines.push('Day,Date,Completion %,Hours Spent,Status');
      
      for (const sprint of objective.sprints) {
        lines.push([
          sprint.dayNumber,
          sprint.completedAt?.toISOString().split('T')[0] ?? 'In Progress',
          sprint.completionPercentage ?? 0,
          sprint.totalEstimatedHours ?? 0,
          sprint.completedAt ? 'Completed' : 'Pending'
        ].join(','));
      }

      return lines.join('\n');
    }
  }

  /**
   * Calculate global streaks across all sprints
   */
  private calculateGlobalStreaks(sprints: any[]): { currentStreak: number; longestStreak: number } {
    const completedSprints = sprints
      .filter(s => s.completedAt !== null)
      .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());

    if (completedSprints.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    let currentStreak = 1;
    let longestStreak = 1;
    let tempStreak = 1;

    for (let i = 1; i < completedSprints.length; i++) {
      const prevDate = new Date(completedSprints[i - 1].completedAt);
      const currDate = new Date(completedSprints[i].completedAt);
      
      prevDate.setHours(0, 0, 0, 0);
      currDate.setHours(0, 0, 0, 0);
      
      const daysDiff = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysDiff === 1) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, tempStreak);

    // Check if streak is still active
    const lastSprint = completedSprints[completedSprints.length - 1];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const lastDate = new Date(lastSprint.completedAt);
    lastDate.setHours(0, 0, 0, 0);
    const daysSinceLastSprint = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLastSprint <= 1) {
      currentStreak = tempStreak;
    } else {
      currentStreak = 0;
    }

    return { currentStreak, longestStreak };
  }

  /**
   * Calculate weekly progress
   */
  private calculateWeeklyProgress(sprints: any[]): Array<{
    week: string;
    daysCompleted: number;
    hoursSpent: number;
    sprintsCompleted: number;
  }> {
    const weeklyData = new Map<string, { daysCompleted: number; hoursSpent: number; sprintsCompleted: number }>();

    for (const sprint of sprints) {
      if (!sprint.completedAt) continue;

      const date = new Date(sprint.completedAt);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];

      if (!weeklyData.has(weekKey)) {
        weeklyData.set(weekKey, { daysCompleted: 0, hoursSpent: 0, sprintsCompleted: 0 });
      }

      const data = weeklyData.get(weekKey)!;
      data.daysCompleted += 1;
      data.hoursSpent += sprint.totalEstimatedHours ?? 0;
      data.sprintsCompleted += 1;
    }

    return Array.from(weeklyData.entries())
      .map(([week, data]) => ({ week, ...data }))
      .sort((a, b) => a.week.localeCompare(b.week))
      .slice(-12); // Last 12 weeks
  }

  /**
   * Generate objective suggestions
   */
  private generateObjectiveSuggestions(objectives: any[]): string[] {
    const completedSkills = new Set(
      objectives
        .filter(o => o.completedDays >= (o.estimatedTotalDays ?? 30))
        .flatMap(o => o.requiredSkills)
    );

    const suggestions: string[] = [];

    // Suggest related skills
    if (completedSkills.has('javascript')) {
      suggestions.push('TypeScript', 'React', 'Node.js');
    }
    if (completedSkills.has('python')) {
      suggestions.push('Django', 'FastAPI', 'Data Science');
    }
    if (completedSkills.has('java')) {
      suggestions.push('Spring Boot', 'Kotlin', 'Android Development');
    }

    return suggestions.slice(0, 3);
  }

  /**
   * Identify areas for improvement
   */
  private identifyImprovementAreas(objectives: any[], averageCompletionRate: number): string[] {
    const areas: string[] = [];

    if (averageCompletionRate < 70) {
      areas.push('Task completion consistency');
    }

    const activeObjectives = objectives.filter(o => o.status === 'active');
    if (activeObjectives.length > 3) {
      areas.push('Focus on fewer objectives at once');
    }

    const staleObjectives = objectives.filter(o => {
      if (!o.sprints || o.sprints.length === 0) return false;
      const lastSprint = o.sprints[o.sprints.length - 1];
      if (!lastSprint.completedAt) return false;
      const daysSince = (Date.now() - lastSprint.completedAt.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince > 7;
    });

    if (staleObjectives.length > 0) {
      areas.push('Maintain daily learning momentum');
    }

    return areas;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const learningAnalyticsService = new LearningAnalyticsService();
export default learningAnalyticsService;
