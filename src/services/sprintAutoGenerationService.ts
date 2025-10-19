import { db } from '../prisma/prismaWrapper.js';
import { AppError } from '../errors/AppError.js';
import { plannerService, extractPreviousSprintContext } from './plannerService.js';
import type { GenerateSprintPlanInput, PreviousSprintContext } from './plannerService.js';
import { learnerProfileService } from './profile';
import { profileContextBuilder } from './profileContextBuilder.js';
import type { Objective, Sprint, LearnerProfile } from '@prisma/client';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface AutoGenerationConfig {
  mode: 'DAILY' | 'WEEKLY' | 'MILESTONE' | 'MANUAL';
  generateOnCompletion: boolean;
  lookaheadDays: number;     // Pre-generate N days ahead
  batchSize: number;         // Generate N sprints at once
  minDaysBuffer: number;     // Minimum days to keep ahead
}

export interface SequentialSprintContext {
  objectiveId: string;
  dayNumber: number;
  totalEstimatedDays: number;
  previousSprints: Array<{
    dayNumber: number;
    completedAt?: Date | null;
    completionPercentage: number;
    title: string;
  }>;
  upcomingMilestone?: {
    title: string;
    targetDay: number;
    description?: string | null;
  };
  learnerPerformance: {
    averageCompletionRate: number;
    averageTimePerSprint: number;
    strugglingAreas: string[];
  };
}

export interface GenerateNextSprintParams {
  objectiveId: string;
  userId: string;
  currentDay?: number;
  context?: SequentialSprintContext;
}

export interface GenerateSprintBatchParams {
  objectiveId: string;
  userId: string;
  startDay: number;
  count: number;
}

export interface GenerationStatus {
  currentDay: number;
  lastGeneratedDay: number;
  bufferDays: number;
  isGenerating: boolean;
  nextSprintReady: boolean;
}

// ============================================
// SERVICE CLASS
// ============================================

class SprintAutoGenerationService {
  /**
   * Generate next sprint in the daily sequence
   */
  async generateNextSprint(params: GenerateNextSprintParams): Promise<Sprint> {
    const { objectiveId, userId, currentDay } = params;

    // Load objective with current state
    const objective = await db.objective.findFirst({
      where: {
        id: objectiveId,
        profileSnapshot: { userId }
      },
      include: {
        profileSnapshot: true,
        sprints: {
          orderBy: { dayNumber: 'desc' },
          take: 5 // Get last 5 sprints for context
        },
        milestones: {
          where: { isCompleted: false },
          orderBy: { targetDay: 'asc' },
          take: 1
        }
      }
    });

    if (!objective) {
      throw new AppError('Objective not found', 404, 'OBJECTIVE_NOT_FOUND');
    }

    if (!objective.profileSnapshot) {
      throw new AppError('Learner profile required', 400, 'LEARNER_PROFILE_REQUIRED');
    }

    // Determine next day number
    const lastSprint = objective.sprints[0];
    const nextDayNumber = currentDay ?? (lastSprint ? lastSprint.dayNumber + 1 : 1);

    // Check if sprint already exists for this day
    const existingSprint = objective.sprints.find((s: any) => s.dayNumber === nextDayNumber);
    if (existingSprint) {
      console.log('[sprintAutoGeneration] Sprint already exists for day', {
        objectiveId,
        dayNumber: nextDayNumber,
        sprintId: existingSprint.id
      });
      return existingSprint;
    }

    // Build context for sequential generation
    const context = params.context ?? await this.buildSequentialContext(objective, nextDayNumber);

    // Get user language
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { language: true }
    });

    // Build profile context
    const profileContext = await profileContextBuilder.build({
      userId,
      learnerProfileId: objective.profileSnapshot.id,
      objectiveId
    });

    const previousSprintContext = lastSprint
      ? extractPreviousSprintContext({
          dayNumber: lastSprint.dayNumber,
          plannerOutput: lastSprint.plannerOutput,
          reflection: lastSprint.selfEvaluationReflection,
          completionPercentage: lastSprint.completionPercentage
        })
      : null;

    const customInstructions = this.buildCustomInstructions(objective.profileSnapshot, previousSprintContext);

    // Generate sprint plan with sequential context
    const plannerInput: GenerateSprintPlanInput = {
      objectiveId,
      objectiveTitle: objective.title,
      objectiveDescription: objective.description,
      successCriteria: objective.successCriteria,
      requiredSkills: objective.requiredSkills,
      learnerProfile: objective.profileSnapshot,
      profileContext,
      preferLength: 1, // Always 1 day for daily mode
      objectivePriority: objective.priority,
      objectiveStatus: objective.status,
      mode: 'skeleton',
      userLanguage: user?.language ?? 'en',
      customInstructions,
      previousSprint: previousSprintContext
    };

    const plan = await plannerService.generateSprintPlan(plannerInput);

    // Create sprint in database
    const sprint = await db.sprint.create({
      data: {
        objectiveId,
        profileSnapshotId: objective.profileSnapshot.id,
        plannerInput: plannerInput as any,
        plannerOutput: plan as any,
        lengthDays: 1,
        totalEstimatedHours: plan.totalEstimatedHours,
        difficulty: plan.difficulty,
        status: 'planned',
        dayNumber: nextDayNumber,
        isAutoGenerated: true
      }
    });

    // Link to previous sprint if exists
    if (lastSprint) {
      await db.sprint.update({
        where: { id: lastSprint.id },
        data: { nextSprintId: sprint.id }
      });
    }

    // Update objective progress
    await db.objective.update({
      where: { id: objectiveId },
      data: {
        currentDay: nextDayNumber,
        totalSprintsGenerated: { increment: 1 }
      }
    });

    console.log('[sprintAutoGeneration] Sprint generated', {
      objectiveId,
      sprintId: sprint.id,
      dayNumber: nextDayNumber,
      totalDays: objective.estimatedTotalDays
    });

    return sprint;
  }

  private buildCustomInstructions(profile: LearnerProfile, previousSprint?: PreviousSprintContext | null): string[] {
    const formatList = (items?: string[]) => (items && items.length ? items.join(', ') : 'n/a');

    const instructions: string[] = [
      'ACTIONABLE TASKS: Use strong verbs (e.g., "Build", "Configure", "Deploy"). Avoid generic titles like "Introduction to...".',
      'CONCISE TEXT: Keep descriptions and instructions to a maximum of 3 sentences.',
      'PROJECT FOCUS: Define one concrete desktop feature set (e.g., "Offline to-do manager that syncs to local JSON store") with a measurable outcome and list the exact verification steps (cargo build, tauri dev/bundle run, manual user flow).',
      'MEASURABLE TASKS: Every microTask must end with a validation step (tests, command output, screenshot, repository checkpoint) so completion can be observed.',
      'PROJECT NAMING: Give the project a distinctive feature-based name (not the objective title) and mention the target user scenario in the brief.'
    ];

    if (previousSprint) {
      const deliverableSummary = previousSprint.deliverables && previousSprint.deliverables.length
        ? previousSprint.deliverables.slice(0, 3).join('; ')
        : 'previous deliverables';

      instructions.push(
        `CONTINUATION: Reference Day ${previousSprint.dayNumber}'s outcome "${previousSprint.title ?? 'Prior Sprint'}" and design the next increment that advances that work rather than restarting.`
      );
      instructions.push(
        `DO NOT REPEAT: Avoid recreating prior deliverables (${deliverableSummary}). Ship a complementary feature or enhancement.`
      );

      if (previousSprint.reflection) {
        const normalizedReflection = previousSprint.reflection.replace(/\s+/g, ' ').trim();
        const truncatedReflection = normalizedReflection.length > 160
          ? `${normalizedReflection.slice(0, 157)}...`
          : normalizedReflection;
        instructions.push(
          `ADDRESS REFLECTION: The learner noted "${truncatedReflection}". Incorporate a task that tackles this insight or blocker.`
        );
      }
    }

    if (profile.gaps?.length) {
      instructions.push(
        `ADDRESS GAPS (${formatList(profile.gaps)}): Convert each gap into a concrete micro-task with a build-or-do deliverable.`
      );
    }

    if (profile.strengths?.length) {
      instructions.push(
        `LEVERAGE STRENGTHS (${formatList(profile.strengths)}): Frame at least one requirement or deliverable so the learner showcases these strengths.`
      );
    }

    if (profile.passionTags?.length || profile.goals?.length) {
      instructions.push(
        `ALIGN WITH MOTIVATORS (${formatList(profile.passionTags)} | goals: ${formatList(profile.goals)}): Anchor the sprint narrative and examples in these interests.`
      );
    }

    instructions.push(
      'REFLECTION LOOP: Include a final microTask that captures learnings, blockers, and metrics (time spent, build status) to feed the next sprint.'
    );

    return instructions;
  }

  /**
   * Generate multiple sprints ahead (batch generation)
   */
  async generateSprintBatch(params: GenerateSprintBatchParams): Promise<Sprint[]> {
    const { objectiveId, userId, startDay, count } = params;

    if (count <= 0 || count > 10) {
      throw new AppError('Batch size must be between 1 and 10', 400, 'INVALID_BATCH_SIZE');
    }

    const sprints: Sprint[] = [];

    for (let i = 0; i < count; i++) {
      const dayNumber = startDay + i;
      
      try {
        const sprint = await this.generateNextSprint({
          objectiveId,
          userId,
          currentDay: dayNumber
        });
        sprints.push(sprint);
      } catch (error) {
        console.error('[sprintAutoGeneration] Batch generation failed', {
          objectiveId,
          dayNumber,
          error
        });
        // Continue with next sprint even if one fails
        break;
      }
    }

    return sprints;
  }

  /**
   * Check if next sprint should be generated
   */
  async shouldGenerateNext(params: {
    objectiveId: string;
    currentSprintId?: string;
  }): Promise<{
    shouldGenerate: boolean;
    reason: string;
    nextDayNumber: number;
  }> {
    const objective = await db.objective.findUnique({
      where: { id: params.objectiveId },
      include: {
        sprints: {
          orderBy: { dayNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!objective) {
      return {
        shouldGenerate: false,
        reason: 'Objective not found',
        nextDayNumber: 0
      };
    }

    if (!objective.autoGenerateNextSprint) {
      return {
        shouldGenerate: false,
        reason: 'Auto-generation disabled',
        nextDayNumber: 0
      };
    }

    const lastSprint = objective.sprints[0];
    const nextDayNumber = lastSprint ? lastSprint.dayNumber + 1 : 1;

    // Check if we've reached the estimated total days
    if (objective.estimatedTotalDays && nextDayNumber > objective.estimatedTotalDays) {
      return {
        shouldGenerate: false,
        reason: 'Objective estimated duration reached',
        nextDayNumber
      };
    }

    // Check if current sprint is completed
    if (params.currentSprintId) {
      const currentSprint = await db.sprint.findUnique({
        where: { id: params.currentSprintId }
      });

      if (currentSprint && !currentSprint.completedAt) {
        return {
          shouldGenerate: false,
          reason: 'Current sprint not completed',
          nextDayNumber
        };
      }
    }

    return {
      shouldGenerate: true,
      reason: 'Ready to generate next sprint',
      nextDayNumber
    };
  }

  /**
   * Maintain sprint buffer (pre-generate ahead)
   */
  async maintainSprintBuffer(objectiveId: string): Promise<void> {
    const objective = await db.objective.findUnique({
      where: { id: objectiveId },
      include: {
        sprints: {
          orderBy: { dayNumber: 'desc' }
        },
        profileSnapshot: true
      }
    });

    if (!objective || !objective.profileSnapshot) {
      return;
    }

    if (!objective.autoGenerateNextSprint) {
      return;
    }

    const config = this.getAutoGenerationConfig(objective.sprintGenerationMode);
    const lastSprint = objective.sprints[0];
    const lastGeneratedDay = lastSprint?.dayNumber ?? 0;
    const completedDay = objective.completedDays;
    const bufferDays = lastGeneratedDay - completedDay;

    // Generate more sprints if buffer is low
    if (bufferDays < config.minDaysBuffer) {
      const sprintsToGenerate = Math.min(
        config.lookaheadDays - bufferDays,
        config.batchSize
      );

      if (sprintsToGenerate > 0) {
        console.log('[sprintAutoGeneration] Maintaining buffer', {
          objectiveId,
          bufferDays,
          sprintsToGenerate
        });

        await this.generateSprintBatch({
          objectiveId,
          userId: objective.profileSnapshot.userId,
          startDay: lastGeneratedDay + 1,
          count: sprintsToGenerate
        });
      }
    }
  }

  /**
   * Get generation queue status
   */
  async getGenerationStatus(objectiveId: string): Promise<GenerationStatus> {
    const objective = await db.objective.findUnique({
      where: { id: objectiveId },
      include: {
        sprints: {
          orderBy: { dayNumber: 'desc' },
          take: 1
        }
      }
    });

    if (!objective) {
      throw new AppError('Objective not found', 404, 'OBJECTIVE_NOT_FOUND');
    }

    const lastSprint = objective.sprints[0];
    const lastGeneratedDay = lastSprint?.dayNumber ?? 0;
    const bufferDays = lastGeneratedDay - objective.completedDays;
    const nextSprintExists = lastGeneratedDay > objective.currentDay;

    return {
      currentDay: objective.currentDay,
      lastGeneratedDay,
      bufferDays,
      isGenerating: false, // TODO: Track active generation
      nextSprintReady: nextSprintExists
    };
  }

  /**
   * Build sequential context from previous sprints
   */
  private async buildSequentialContext(
    objective: Objective & { sprints: Sprint[]; milestones: any[] },
    nextDayNumber: number
  ): Promise<SequentialSprintContext> {
    const previousSprints = objective.sprints
      .filter(s => s.dayNumber < nextDayNumber)
      .map(s => ({
        dayNumber: s.dayNumber,
        completedAt: s.completedAt,
        completionPercentage: s.completionPercentage,
        title: (s.plannerOutput as any)?.title ?? 'Sprint'
      }));

    const upcomingMilestone = objective.milestones[0] ?? undefined;

    // Calculate performance metrics
    const completedSprints = previousSprints.filter(s => s.completedAt);
    const averageCompletionRate = completedSprints.length > 0
      ? completedSprints.reduce((sum, s) => sum + s.completionPercentage, 0) / completedSprints.length
      : 0;

    const sprintDurations = completedSprints
      .map(s => {
        if (!s.completedAt) return null;
        const sprint = objective.sprints.find(os => os.dayNumber === s.dayNumber);
        if (!sprint?.startedAt) return null;
        return (s.completedAt.getTime() - sprint.startedAt.getTime()) / (1000 * 60 * 60 * 24);
      })
      .filter((d): d is number => d !== null);

    const averageTimePerSprint = sprintDurations.length > 0
      ? sprintDurations.reduce((sum, d) => sum + d, 0) / sprintDurations.length
      : 1;

    return {
      objectiveId: objective.id,
      dayNumber: nextDayNumber,
      totalEstimatedDays: objective.estimatedTotalDays ?? 30,
      previousSprints,
      upcomingMilestone,
      learnerPerformance: {
        averageCompletionRate,
        averageTimePerSprint,
        strugglingAreas: [] // TODO: Extract from sprint feedback
      }
    };
  }

  /**
   * Get auto-generation configuration based on mode
   */
  private getAutoGenerationConfig(mode: string): AutoGenerationConfig {
    const configs: Record<string, AutoGenerationConfig> = {
      DAILY: {
        mode: 'DAILY',
        generateOnCompletion: true,
        lookaheadDays: 3,
        batchSize: 3,
        minDaysBuffer: 1
      },
      WEEKLY: {
        mode: 'WEEKLY',
        generateOnCompletion: false,
        lookaheadDays: 7,
        batchSize: 1,
        minDaysBuffer: 0
      },
      MILESTONE: {
        mode: 'MILESTONE',
        generateOnCompletion: false,
        lookaheadDays: 1,
        batchSize: 1,
        minDaysBuffer: 0
      },
      MANUAL: {
        mode: 'MANUAL',
        generateOnCompletion: false,
        lookaheadDays: 0,
        batchSize: 1,
        minDaysBuffer: 0
      }
    };

    return configs[mode] ?? configs.DAILY;
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const sprintAutoGenerationService = new SprintAutoGenerationService();
export default sprintAutoGenerationService;
