import { Prisma } from '@prisma/client';
import { db } from '../prisma/prismaWrapper';
import { db as prisma } from '../prisma/prismaWrapper';
import { AppError } from '../errors/AppError';
import { learnerProfileService } from './learnerProfileService.js';
import { extractPreviousSprintContext, plannerService } from './plannerService.js';
import { sprintEventEmitter, SprintEvent } from './infrastructure/eventEmitter.js';
import type {
  SprintPlan,
  SprintPlanCore,
  SprintPlanExpansionGoal,
  SprintPlanMode,
  PreviousSprintContext
} from './plannerService.js';
import { sprintService } from './sprintService.js';
import { SprintUpdateInput } from '../repositories/sprintRepository.js';
import { profileContextBuilder, ProfileContext } from './profileContextBuilder.js';
import { config } from '../config/environment.js';
import {
  ObjectiveStatus,
  LearnerProfile,
  SprintStatus,
  SprintDifficulty,
  Objective,
  Progress,
  Sprint,
  SprintArtifact,
  ObjectiveContext
} from '../types/prisma';
import {
  ObjectiveUiPayload,
  ObjectiveWithRelations,
  SprintUiPayload,
  extractSprintPlanDetails,
  serializeObjective,
  serializeSprint
} from '../serializers/objectiveSerializer.js';
import type { PlanLimitsPayload, ObjectiveSprintLimitPayload } from '../types/planLimits.js';
import { planLimitationService, type PlanLimitsSummary } from './planLimitationService.js';
import { evidenceService, SubmittedArtifactInput } from './evidenceService.js';
import { reviewerService } from './reviewerService.js';
import { ReviewerSummary, zReviewerSummary } from '../types/reviewer.js';
import { objectiveEstimationService } from './objectiveEstimationService.js';
import adaptiveLearningService from './adaptiveLearningService.js';
import {
  generateAdaptiveMetadata,
  DEFAULT_ADAPTIVE_METADATA,
  type AdaptiveMetadataSignals,
  type AdaptivePlanMetadata
} from './sprintAdaptationStrategy.js';
import type { TechnicalAssessmentScore } from './technicalAssessmentService.js';

export interface CreateObjectiveRequest {
  userId: string;
  title: string;
  description?: string;
  learnerProfileId?: string;
  successCriteria?: string[];
  requiredSkills?: string[];
  priority?: number;
  context?: {
    priorKnowledge?: string[];
    relatedSkills?: string[];
    focusAreas?: string[];
    urgency?: string;
    depthPreference?: string;
    deadline?: string;
    domainExperience?: string;
    timeCommitmentHours?: number;
    notes?: string;
  };
}

export interface GenerateSprintRequest {
  userId: string;
  objectiveId: string;
  learnerProfileId?: string;
  preferLength?: number;
  allowedResources?: string[];
}

export interface ObjectiveListResponse {
  objectives: ObjectiveUiPayload[];
  planLimits: PlanLimitsPayload;
}

export interface ObjectiveDetailResponse {
  objective: ObjectiveUiPayload;
  planLimits: PlanLimitsPayload;
}

export interface CreateObjectiveResponse {
  objective: ObjectiveUiPayload;
  planLimits: PlanLimitsPayload;
}

export interface GenerateSprintResponse {
  sprint: SprintUiPayload;
  plan: SprintPlan;
  planLimits: PlanLimitsPayload;
  objectiveLimits: ObjectiveSprintLimitPayload;
}

export interface DeleteObjectiveRequest {
  userId: string;
  objectiveId: string;
}

export interface DeleteObjectiveResponse {
  planLimits: PlanLimitsPayload;
}


export interface ExpandSprintRequest {
  userId: string;
  objectiveId: string;
  sprintId: string;
  targetLengthDays?: number;
  additionalDays?: number;
  additionalMicroTasks?: number;
}

export interface ExpandSprintResponse {
  sprint: SprintUiPayload;
  plan: SprintPlan;
}

export interface SubmitSprintEvidenceRequest {
  userId: string;
  objectiveId: string;
  sprintId: string;
  artifacts: SubmittedArtifactInput[];
  selfEvaluation?: { confidence?: number; reflection?: string };
  markSubmitted?: boolean;
}

export interface SubmitSprintEvidenceResponse {
  sprint: SprintUiPayload;
}

export interface ReviewSprintRequest {
  userId: string;
  objectiveId: string;
  sprintId: string;
}

export interface SprintReviewResponse {
  sprint: SprintUiPayload;
  review: ReviewerSummary;
}

export interface SprintReviewDetailsResponse {
  sprint: SprintUiPayload;
  review: ReviewerSummary | null;
}

export class ObjectiveService {
  async listObjectives(userId: string): Promise<ObjectiveListResponse> {
    const [{ summary, plan: planLimits }, objectives] = await Promise.all([
      planLimitationService.getPlanLimits(userId),
      db.objective.findMany({
        where: {
          profileSnapshot: { userId }
        },
        include: {
          profileSnapshot: true,
          contexts: {
            orderBy: { createdAt: 'desc' }
          },
          sprints: {
            orderBy: { createdAt: 'desc' },
            include: {
              progresses: true,
              artifacts: true
            }
          }
        },
        orderBy: [
          { status: 'asc' },
          { priority: 'desc' }
        ]
      })
    ]);

    const summaryWithCounts: PlanLimitsSummary = {
      ...summary,
      objectiveCount: planLimits.objectiveCount
    };


    const payloads = (objectives as ObjectiveWithRelations[]).map((objective) => {
      const objectiveLimits = planLimitationService.buildObjectiveSprintLimit(
        summaryWithCounts,
        objective.sprints?.length ?? 0
      );
      return serializeObjective(objective, { userId, limits: objectiveLimits });
    });

    return {
      objectives: payloads,
      planLimits
    };
  }

  async getObjective(userId: string, objectiveId: string): Promise<ObjectiveDetailResponse> {
    const [{ summary, plan: planLimits }, objective] = await Promise.all([
      planLimitationService.getPlanLimits(userId),
      db.objective.findFirst({
        where: {
          id: objectiveId,
          profileSnapshot: { userId }
        },
        include: {
          profileSnapshot: true,
          contexts: {
            orderBy: { createdAt: 'desc' }
          },
          sprints: {
            orderBy: { createdAt: 'desc' },
            include: {
              progresses: true,
              artifacts: true
            }
          }
        }
      })
    ]);

    const objectiveRecord = objective as ObjectiveWithRelations | null;

    if (!objectiveRecord) {
      throw new AppError('objectives.errors.notFound', 404, 'OBJECTIVE_NOT_FOUND');
    }

    const summaryWithCounts: PlanLimitsSummary = {
      ...summary,
      objectiveCount: planLimits.objectiveCount
    };
    const objectiveLimits = planLimitationService.buildObjectiveSprintLimit(
      summaryWithCounts,
      objectiveRecord.sprints?.length ?? 0
    );

    return {
      objective: serializeObjective(objectiveRecord, { userId, limits: objectiveLimits }),
      planLimits
    };

  }

  async deleteObjective(request: DeleteObjectiveRequest): Promise<DeleteObjectiveResponse> {
    const objective = await db.objective.findFirst({
      where: {
        id: request.objectiveId,
        profileSnapshot: { userId: request.userId }
      },
      include: {
        sprints: {
          select: { id: true },
          take: 1
        }
      }
    });

    if (!objective) {
      throw new AppError('objectives.errors.notFound', 404, 'OBJECTIVE_NOT_FOUND');
    }

    if (objective.sprints && objective.sprints.length > 0) {
      throw new AppError('objectives.errors.deleteHasSprints', 400, 'OBJECTIVE_HAS_SPRINTS');
    }

    await db.objective.delete({ where: { id: objective.id } });

    const { plan } = await planLimitationService.getPlanLimits(request.userId);

    return { planLimits: plan };
  }

  async createObjective(request: CreateObjectiveRequest): Promise<CreateObjectiveResponse> {
    const { summary } = await planLimitationService.ensureCanCreateObjective(request.userId);
    const [learnerProfile, user] = await Promise.all([
      this.resolveLearnerProfile(request.userId, request.learnerProfileId),
      db.user.findUnique({
        where: { id: request.userId },
        select: { language: true }
      })
    ]);

    if (!learnerProfile) {
      throw new AppError('objectives.errors.profileRequired', 400, 'LEARNER_PROFILE_REQUIRED');
    }

    // Estimate objective duration using AI
    let estimate;
    try {
      estimate = await objectiveEstimationService.estimateObjectiveDuration({
        objectiveTitle: request.title,
        objectiveDescription: request.description,
        successCriteria: request.successCriteria ?? [],
        requiredSkills: request.requiredSkills ?? [],
        learnerProfile: learnerProfile ? {
          ...learnerProfile,
          hoursPerWeek: learnerProfile.hoursPerWeek ?? null
        } as any : undefined,
        userLanguage: user?.language ?? 'en',
        context: request.context,
        technicalLevel: learnerProfile?.technicalLevel as Prisma.JsonValue | null
      });
      console.log('[objectiveService] Duration estimated', {
        objectiveTitle: request.title,
        estimatedDays: estimate.estimatedTotalDays,
        difficulty: estimate.difficulty,
        confidence: estimate.confidence
      });
    } catch (error) {
      console.warn('[objectiveService] AI estimation failed, using fallback', error);
      estimate = objectiveEstimationService.generateFallbackEstimate({
        objectiveTitle: request.title,
        objectiveDescription: request.description,
        successCriteria: request.successCriteria ?? [],
        requiredSkills: request.requiredSkills ?? [],
        learnerProfile: learnerProfile ? {
          ...learnerProfile,
          hoursPerWeek: learnerProfile.hoursPerWeek ?? null
        } as any : undefined,
        userLanguage: user?.language ?? 'en',
        context: request.context,
        technicalLevel: learnerProfile?.technicalLevel as Prisma.JsonValue | null
      });
    }

    const objective = await db.objective.create({
      data: {
        title: request.title,
        description: request.description ?? null,
        profileSnapshotId: learnerProfile.id,
        status: ObjectiveStatus.active,
        priority: request.priority ?? 2,
        successCriteria: request.successCriteria ?? [],
        requiredSkills: request.requiredSkills ?? [],
        // Add estimation data
        estimatedTotalDays: estimate.estimatedTotalDays,
        estimatedDailyHours: estimate.estimatedDailyHours,
        estimationReasoning: estimate.reasoning,
        estimatedAt: new Date()
      }
    });

    if (request.context) {
      await db.objectiveContext.create({
        data: {
          objectiveId: objective.id,
          userId: request.userId,
          priorKnowledge: request.context.priorKnowledge ?? [],
          relatedSkills: request.context.relatedSkills ?? [],
          focusAreas: request.context.focusAreas ?? [],
          urgency: request.context.urgency ?? null,
          depthPreference: request.context.depthPreference ?? null,
          specificDeadline: request.context.deadline ? new Date(request.context.deadline) : null,
          timeCommitmentHours: request.context.timeCommitmentHours ?? null,
          domainExperience: request.context.domainExperience ?? null,
          notes: request.context.notes ?? null
        }
      });
    }

    // Create milestones (will be available after Prisma client regeneration)
    // if (estimate.milestones.length > 0) {
    //   await db.objectiveMilestone.createMany({
    //     data: estimate.milestones.map(milestone => ({
    //       objectiveId: objective.id,
    //       title: milestone.title,
    //       description: milestone.description,
    //       targetDay: milestone.targetDay
    //     }))
    //   });
    // }

    const objectiveRecord = (await db.objective.findFirst({

      where: { id: objective.id },
      include: {
        profileSnapshot: true,
        contexts: {
          orderBy: { createdAt: 'desc' }
        },
        sprints: {
          orderBy: { createdAt: 'desc' },
          include: { progresses: true, artifacts: true }
        }
      }
    })) as ObjectiveWithRelations | null;

    if (!objectiveRecord) {
      throw new AppError('objectives.errors.notFound', 404, 'OBJECTIVE_NOT_FOUND');
    }

    const updatedSummary: PlanLimitsSummary = {
      ...summary,
      objectiveCount: summary.objectiveCount + 1
    };
    const planLimits = planLimitationService.buildPlanPayload(updatedSummary);
    const objectiveLimits = planLimitationService.buildObjectiveSprintLimit(
      updatedSummary,
      objectiveRecord.sprints?.length ?? 0
    );
    const objectivePayload = serializeObjective(objectiveRecord, {
      userId: request.userId,
      limits: objectiveLimits
    });

    return {
      objective: objectivePayload,
      planLimits
    };
  }

  async generateSprint(request: GenerateSprintRequest): Promise<GenerateSprintResponse> {
    const [objective, learnerProfile, user] = await Promise.all([
      db.objective.findFirst({
        where: {
          id: request.objectiveId,
          profileSnapshot: { userId: request.userId }
        }
      }),
      this.resolveLearnerProfile(request.userId, request.learnerProfileId),
      db.user.findUnique({
        where: { id: request.userId },
        select: { language: true }
      })
    ]);

    if (!objective) {
      throw new AppError('objectives.errors.notFound', 404, 'OBJECTIVE_NOT_FOUND');
    }

    if (!learnerProfile) {
      throw new AppError('objectives.sprint.errors.profileRequired', 400, 'LEARNER_PROFILE_REQUIRED');
    }

    const { summary, plan: planLimits, sprintCount } = await planLimitationService.ensureCanGenerateSprint(
      request.userId,
      objective.id
    );

    const profileContext = await profileContextBuilder.build({
      userId: request.userId,
      learnerProfileId: learnerProfile.id,
      objectiveId: objective.id
    });

    const expansionGoal = request.preferLength
      ? ({ targetLengthDays: request.preferLength } as SprintPlanExpansionGoal)
      : null;

    const allowedResources = Array.isArray(request.allowedResources)
      ? request.allowedResources.filter((value) => typeof value === 'string' && value.trim().length > 0)
      : undefined;


    const { sprint, plan } = await this.generateAndPersistSprint({
      userId: request.userId,
      objectiveId: objective.id,
      learnerProfile,
      profileContext,
      preferLength: request.preferLength,
      objective,
      mode: 'skeleton',
      expansionGoal,
      allowedResources,
      userLanguage: user?.language ?? 'en'
    });


    await this.applyPlanEstimates(objective.id, plan.lengthDays, {
      estimatedWeeksMin: objective.estimatedWeeksMin ?? null,
      estimatedWeeksMax: objective.estimatedWeeksMax ?? null
    });

    if (plan.lengthDays) {
      const estimates = this.deriveEstimatedWeeks(plan.lengthDays);
      objective.estimatedWeeksMin = estimates.min;
      objective.estimatedWeeksMax = estimates.max;
    }

    const sprintPayload = this.buildSprintPayload({
      sprint,
      userId: request.userId,
      objective,
      plan,
      progresses: [],
      artifacts: []
    });

    const objectiveLimits = planLimitationService.buildObjectiveSprintLimit(summary, sprintCount + 1);

    return {
      sprint: sprintPayload,
      plan,
      planLimits,
      objectiveLimits
    };
  }

  async expandSprint(request: ExpandSprintRequest): Promise<ExpandSprintResponse> {
    const sprint = await this.loadSprintForUser({
      userId: request.userId,
      objectiveId: request.objectiveId,
      sprintId: request.sprintId
    });

    const profileSnapshotId = sprint.profileSnapshotId ?? sprint.profileSnapshot?.id ?? null;
    if (!profileSnapshotId) {
      throw new AppError('objectives.sprint.errors.profileRequired', 400, 'LEARNER_PROFILE_REQUIRED');
    }

    const [learnerProfile, user] = await Promise.all([
      learnerProfileService.getProfileById(profileSnapshotId),
      db.user.findUnique({
        where: { id: request.userId },
        select: { language: true }
      })
    ]);
    
    if (!learnerProfile) {
      throw new AppError('objectives.sprint.errors.profileRequired', 400, 'LEARNER_PROFILE_REQUIRED');
    }

    const profileContext = await profileContextBuilder.build({
      userId: request.userId,
      learnerProfileId: learnerProfile.id,
      objectiveId: sprint.objectiveId
    });

    const currentPlan = this.buildCurrentPlanPayload(sprint);
    const expansionGoal = this.normalizeExpansionGoal(request, sprint);

    const { plan } = await this.generateAndPersistSprint({
      userId: request.userId,
      objectiveId: sprint.objectiveId,
      learnerProfile,
      profileContext,
      preferLength: expansionGoal?.targetLengthDays ?? undefined,
      objective: sprint.objective ?? null,
      existingSprintId: sprint.id,
      mode: 'expansion',
      currentPlan,
      expansionGoal,
      userLanguage: user?.language ?? 'en'
    });

    await this.applyPlanEstimates(sprint.objectiveId, plan.lengthDays, {
      estimatedWeeksMin: sprint.objective?.estimatedWeeksMin ?? null,
      estimatedWeeksMax: sprint.objective?.estimatedWeeksMax ?? null
    });

    const refreshed = await this.loadSprintForUser({
      userId: request.userId,
      objectiveId: request.objectiveId,
      sprintId: request.sprintId
    });

    const sprintPayload = this.buildSprintPayload({
      sprint: refreshed,
      userId: request.userId,
      objective: refreshed.objective ?? null,
      plan,
      progresses: refreshed.progresses ?? [],
      artifacts: refreshed.artifacts ?? []
    });

    return { sprint: sprintPayload, plan };
  }


  async getSprint(userId: string, objectiveId: string, sprintId: string): Promise<SprintUiPayload> {
    const sprint = await this.loadSprintForUser({ userId, objectiveId, sprintId });

    return serializeSprint(sprint, userId, sprint.objective ?? null);
  }

  async submitSprintEvidence(request: SubmitSprintEvidenceRequest): Promise<SubmitSprintEvidenceResponse> {
    const sprint = await this.loadSprintForUser({
      userId: request.userId,
      objectiveId: request.objectiveId,
      sprintId: request.sprintId
    });

    await evidenceService.upsertArtifacts(request.sprintId, request.artifacts ?? []);

    const updates: SprintUpdateInput = {};
    let hasUpdates = false;

    const normalizedSelfEval = this.normalizeSelfEvaluationInput(request.selfEvaluation);
    if (normalizedSelfEval) {
      updates.selfEvaluationConfidence = normalizedSelfEval.confidence ?? null;
      updates.selfEvaluationReflection = normalizedSelfEval.reflection ?? null;
      hasUpdates = true;
    }

    if (request.markSubmitted && sprint.status !== SprintStatus.reviewed) {
      updates.status = SprintStatus.submitted;
      updates.completedAt = sprint.completedAt ?? new Date();
      hasUpdates = true;
    }

    if (hasUpdates) {
      await sprintService.updateSprint(request.sprintId, updates);
    }


    const refreshed = await this.loadSprintForUser({
      userId: request.userId,
      objectiveId: request.objectiveId,
      sprintId: request.sprintId
    });

    const payload = serializeSprint(refreshed, request.userId, refreshed.objective ?? null);

    return { sprint: payload };
  }

  async reviewSprint(request: ReviewSprintRequest): Promise<SprintReviewResponse> {
    const sprint = await this.loadSprintForUser({
      userId: request.userId,
      objectiveId: request.objectiveId,
      sprintId: request.sprintId
    });

    const planDetails = extractSprintPlanDetails(sprint.plannerOutput);
    const projects = Array.isArray(planDetails.projects)
      ? (planDetails.projects as Record<string, unknown>[])
      : [];

    const selfEvaluation = this.normalizeSelfEvaluationInput({
      confidence: sprint.selfEvaluationConfidence ?? undefined,
      reflection: sprint.selfEvaluationReflection ?? undefined
    });

    const { summary } = await reviewerService.reviewSprint({
      projects,
      artifacts: Array.isArray(sprint.artifacts) ? sprint.artifacts : [],
      selfEvaluation
    });

    const reviewerSummaryJson = this.cloneAsJson(summary);

    await sprintService.markSprintStatus(sprint.id, SprintStatus.reviewed, {
      completedAt: sprint.completedAt ?? new Date(),
      score: summary.overall.score,
      reviewerSummary: reviewerSummaryJson
    });

    const refreshed = await this.loadSprintForUser({
      userId: request.userId,
      objectiveId: request.objectiveId,
      sprintId: request.sprintId
    });

    const sprintPayload = serializeSprint(refreshed, request.userId, refreshed.objective ?? null);


    return {
      sprint: sprintPayload,
      review: summary
    };
  }

  async getSprintReview(request: ReviewSprintRequest): Promise<SprintReviewDetailsResponse> {
    const sprint = await this.loadSprintForUser({
      userId: request.userId,
      objectiveId: request.objectiveId,
      sprintId: request.sprintId
    });

    const sprintPayload = serializeSprint(sprint, request.userId, sprint.objective ?? null);
    const reviewSummary = this.parseReviewerSummary(sprint.reviewerSummary);

    return {
      sprint: sprintPayload,

      review: reviewSummary
    };
  }

  private async resolveLearnerProfile(userId: string, learnerProfileId?: string): Promise<LearnerProfile | null> {
    if (learnerProfileId) {
      const profile = await learnerProfileService.getProfileById(learnerProfileId);
      if (profile && profile.userId === userId) {
        return profile;
      }
      throw new AppError('objectives.errors.profileNotFound', 404, 'LEARNER_PROFILE_NOT_FOUND');
    }

    return learnerProfileService.getLatestProfileForUser(userId);
  }

  private async loadSprintForUser(params: {
    userId: string;
    objectiveId: string;
    sprintId: string;
  }): Promise<
    Sprint & {
      progresses?: Progress[];
      artifacts?: SprintArtifact[];
      objective?: Objective | null;
      profileSnapshot?: LearnerProfile | null;
    }
  > {
    const sprint = (await db.sprint.findFirst({
      where: {
        id: params.sprintId,
        objective: {
          id: params.objectiveId,
          profileSnapshot: { userId: params.userId }
        }
      },
      include: {
        progresses: true,
        artifacts: true,
        objective: true,
        profileSnapshot: true
      }
    })) as (Sprint & {
      progresses?: Progress[];
      artifacts?: SprintArtifact[];
      objective?: Objective | null;
      profileSnapshot?: LearnerProfile | null;
    }) | null;

    if (!sprint) {
      console.warn('[objectiveService] Sprint lookup failed', {
        userId: params.userId,
        objectiveId: params.objectiveId,
        sprintId: params.sprintId
      });
      throw new AppError('objectives.sprint.errors.notFound', 404, 'SPRINT_NOT_FOUND');
    }

    return sprint;
  }

  private normalizeSelfEvaluationInput(
    selfEvaluation?: { confidence?: number | null; reflection?: string | null }
  ): { confidence?: number | null; reflection?: string | null } | null {
    if (!selfEvaluation) {
      return null;
    }

    const payload: { confidence?: number | null; reflection?: string | null } = {};

    if (typeof selfEvaluation.confidence === 'number' && !Number.isNaN(selfEvaluation.confidence)) {
      payload.confidence = selfEvaluation.confidence;
    }

    if (typeof selfEvaluation.reflection === 'string' && selfEvaluation.reflection.trim().length > 0) {
      payload.reflection = selfEvaluation.reflection.trim();
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  private cloneAsJson<T>(value: T): Prisma.JsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.JsonValue;
  }

  private buildCurrentPlanPayload(
    sprint: Sprint & {
      plannerOutput?: Prisma.JsonValue | null;
      objective?: Objective | null;
    }
  ): Partial<SprintPlanCore> | null {
    const planDetails = extractSprintPlanDetails(sprint.plannerOutput);

    const payload: Partial<SprintPlanCore> = {
      title: planDetails.title ?? sprint.objective?.title ?? undefined,
      description: planDetails.description ?? sprint.objective?.description ?? undefined,
      projects: Array.isArray(planDetails.projects) ? (planDetails.projects as SprintPlanCore['projects']) : undefined,
      microTasks: Array.isArray(planDetails.microTasks) ? (planDetails.microTasks as SprintPlanCore['microTasks']) : undefined,
      portfolioCards: Array.isArray(planDetails.portfolioCards)
        ? (planDetails.portfolioCards as SprintPlanCore['portfolioCards'])
        : undefined,
      adaptationNotes: planDetails.adaptationNotes ?? undefined,
      lengthDays: sprint.lengthDays as SprintPlanCore['lengthDays'],
      totalEstimatedHours: sprint.totalEstimatedHours,
      difficulty: sprint.difficulty
    };

    return payload;
  }

  private normalizeExpansionGoal(
    request: ExpandSprintRequest,
    sprint: Sprint
  ): SprintPlanExpansionGoal | null {
    const payload: SprintPlanExpansionGoal = {};

    if (typeof request.targetLengthDays === 'number') {
      const normalized = this.normalizeTargetLength(sprint.lengthDays, request.targetLengthDays);
      if (normalized !== null) {
        payload.targetLengthDays = normalized;
      }
    } else if (typeof request.additionalDays === 'number') {
      const proposed = sprint.lengthDays + request.additionalDays;
      const normalized = this.normalizeTargetLength(sprint.lengthDays, proposed);
      if (normalized !== null) {
        payload.targetLengthDays = normalized;
      }
    }

    if (typeof request.additionalMicroTasks === 'number') {
      payload.additionalMicroTasks = request.additionalMicroTasks;
    }

    return Object.keys(payload).length > 0 ? payload : null;
  }

  private normalizeTargetLength(currentLength: number, target?: number | null): number | null {
    if (typeof target !== 'number' || Number.isNaN(target)) {
      return null;
    }

    const allowed = [1, 3, 7, 14];
    const normalizedTarget = allowed.find((value) => target <= value) ?? allowed[allowed.length - 1];
    const normalizedCurrent = allowed.find((value) => currentLength <= value) ?? allowed[allowed.length - 1];

    return Math.max(normalizedTarget, normalizedCurrent);
  }

  private parseReviewerSummary(value: Prisma.JsonValue | null | undefined): ReviewerSummary | null {
    if (!value) {
      return null;
    }

    try {
      const cloned = JSON.parse(JSON.stringify(value));
      return zReviewerSummary.parse(cloned);
    } catch (error) {
      console.warn('[objectiveService] Failed to parse reviewer summary payload', error);
      return null;
    }
  }

  private deriveEstimatedWeeks(lengthDays?: number | null): { min: number | null; max: number | null } {
    if (!lengthDays || lengthDays <= 0) {
      return { min: null, max: null };
    }

    if (lengthDays <= 7) {
      return { min: 1, max: 2 };
    }

    if (lengthDays <= 14) {
      return { min: 2, max: 4 };
    }

    return { min: 3, max: 6 };
  }

  private async applyPlanEstimates(
    objectiveId: string,
    lengthDays?: number | null,
    current?: { estimatedWeeksMin: number | null; estimatedWeeksMax: number | null }
  ): Promise<void> {
    const { min, max } = this.deriveEstimatedWeeks(lengthDays);

    if (min === current?.estimatedWeeksMin && max === current?.estimatedWeeksMax) {
      return;
    }

    await db.objective.update({
      where: { id: objectiveId },
      data: {
        estimatedWeeksMin: min,
        estimatedWeeksMax: max
      }
    });
  }


  private async generateAndPersistSprint(params: {
    userId: string;
    objectiveId: string;
    learnerProfile: LearnerProfile;
    profileContext: ProfileContext;
    preferLength?: number;
    objective?: { title: string; description?: string | null; successCriteria: string[]; requiredSkills: string[]; priority?: number; status?: ObjectiveStatus } | null;
    existingSprintId?: string;
    mode?: SprintPlanMode;
    currentPlan?: Partial<SprintPlanCore> | null;
    expansionGoal?: SprintPlanExpansionGoal | null;
    allowedResources?: string[];
    userLanguage?: string;
  }) {
    const objective = params.objective ?? (await db.objective.findUnique({ where: { id: params.objectiveId } }));
    if (!objective) {
      throw new AppError('objectives.errors.notFound', 404, 'OBJECTIVE_NOT_FOUND');
    }

    const plannerVersion = config.PLANNER_VERSION ?? 'unversioned';
    const requestedAt = new Date();
    const mode: SprintPlanMode = params.mode ?? 'skeleton';
    const plannerPreferLength =
      mode === 'skeleton'
        ? 1
        : params.preferLength ?? params.expansionGoal?.targetLengthDays ?? undefined;

    let previousSprintContext: PreviousSprintContext | null = null;

    if (!params.existingSprintId) {
      const previousSprintRecord = await db.sprint.findFirst({
        where: { objectiveId: params.objectiveId },
        orderBy: { dayNumber: 'desc' }
      });

      if (previousSprintRecord) {
        previousSprintContext = extractPreviousSprintContext({
          dayNumber: previousSprintRecord.dayNumber,
          plannerOutput: previousSprintRecord.plannerOutput,
          reflection: previousSprintRecord.selfEvaluationReflection,
          completionPercentage: previousSprintRecord.completionPercentage
        });
      }
    }

    const adaptiveMetadata = await this.buildAdaptiveMetadata({
      userId: params.userId,
      objectiveId: params.objectiveId,
      learnerProfile: params.learnerProfile,
      profileContext: params.profileContext
    });

    // Build custom instructions for personalization
    const customInstructions = this.buildCustomInstructions({
      learnerProfile: params.learnerProfile,
      previousSprint: previousSprintContext,
      objectiveTitle: objective.title
    });

    const plan = await plannerService.generateSprintPlan({
      objectiveId: params.objectiveId,
      objectiveTitle: objective.title,
      objectiveDescription: objective.description,
      successCriteria: objective.successCriteria,
      requiredSkills: objective.requiredSkills,
      learnerProfile: params.learnerProfile,
      profileContext: params.profileContext,
      preferLength: plannerPreferLength,
      objectivePriority: objective.priority,
      objectiveStatus: objective.status,
      plannerVersion,
      requestedAt,
      mode,
      currentPlan: params.currentPlan ?? null,
      expansionGoal: params.expansionGoal ?? null,
      allowedResources: params.allowedResources ?? undefined,
      userLanguage: params.userLanguage ?? 'en',
      previousSprint: previousSprintContext,
      adaptiveMetadata,
      customInstructions
    });

    const resolvedAdaptiveMetadata = plan.adaptiveMetadata ?? adaptiveMetadata ?? null;
    if (resolvedAdaptiveMetadata) {
      plan.adaptiveMetadata = resolvedAdaptiveMetadata;
    }

    const plannerInputPayload = {
      objectiveContext: {
        id: objective.id,
        title: objective.title,
        description: objective.description,
        priority: objective.priority,
        status: objective.status,
        successCriteria: objective.successCriteria,
        requiredSkills: objective.requiredSkills
      },
      learnerProfileId: params.learnerProfile.id,
      profileContext: params.profileContext,
      plannerVersion,
      requestedAt: requestedAt.toISOString(),
      preferLength: plannerPreferLength ?? null,
      mode,
      currentPlan: params.currentPlan ?? null,
      expansionGoal: params.expansionGoal ?? null,
      existingSprintId: params.existingSprintId ?? null,
      adaptiveMetadata: resolvedAdaptiveMetadata
    };

    const plannerInputJson = this.cloneAsJson(plannerInputPayload);
    const plannerOutputJson = JSON.parse(JSON.stringify(plan.plannerOutput ?? {})) as unknown as Prisma.JsonValue;

    if (params.existingSprintId) {
      const adaptiveMetadataJson = resolvedAdaptiveMetadata
        ? this.cloneAsJson(resolvedAdaptiveMetadata)
        : null;

      const sprint = await sprintService.updateSprint(params.existingSprintId, {
        plannerInput: plannerInputJson,
        plannerOutput: plannerOutputJson,
        adaptiveMetadata: adaptiveMetadataJson,
        lengthDays: plan.lengthDays,
        totalEstimatedHours: plan.totalEstimatedHours,
        difficulty: plan.difficulty as SprintDifficulty
      });

      console.info('[objectiveService] sprint_expanded', {
        objectiveId: params.objectiveId,
        sprintId: sprint.id,
        plannerVersion,
        learnerProfileId: params.learnerProfile.id,
        profileHash: params.profileContext.learnerProfile.profileHash,
        provider: plan.metadata.provider,
        lengthDays: plan.lengthDays,
        requestedAt: requestedAt.toISOString(),
        mode,
        expansionGoal: params.expansionGoal ?? null,
        adaptiveStrategy: resolvedAdaptiveMetadata?.strategy ?? null
      });

      return { sprint, plan };
    }

    // Calculate the next day number for this objective
    const existingSprints = await db.sprint.findMany({
      where: { objectiveId: params.objectiveId },
      select: { dayNumber: true },
      orderBy: { dayNumber: 'desc' },
      take: 1
    });

    const nextDayNumber = existingSprints.length > 0 
      ? (existingSprints[0].dayNumber ?? 0) + 1 
      : 1;

    const sprint = await sprintService.createSprint({
      objectiveId: params.objectiveId,
      profileSnapshotId: params.learnerProfile.id,
      plannerInput: plannerInputJson,
      plannerOutput: plannerOutputJson,
      adaptiveMetadata: resolvedAdaptiveMetadata ? this.cloneAsJson(resolvedAdaptiveMetadata) : null,
      lengthDays: plan.lengthDays,
      totalEstimatedHours: plan.totalEstimatedHours,
      difficulty: plan.difficulty as SprintDifficulty,
      status: SprintStatus.planned,
      dayNumber: nextDayNumber
    });

    await db.progress.create({
      data: {
        userId: params.userId,
        sprintId: sprint.id,
        completedTasks: [],
        completedObjectives: 0,
        streak: 0
      }
    });

    console.info('[objectiveService] sprint_generated', {
      objectiveId: params.objectiveId,
      sprintId: sprint.id,
      plannerVersion,
      learnerProfileId: params.learnerProfile.id,
      profileHash: params.profileContext.learnerProfile.profileHash,
      provider: plan.metadata.provider,
      lengthDays: plan.lengthDays,
      requestedAt: requestedAt.toISOString(),
      mode,
      expansionGoal: params.expansionGoal ?? null,
      adaptiveStrategy: resolvedAdaptiveMetadata?.strategy ?? null
    });

    return { sprint, plan };
  }

  private buildSprintPayload(params: {
    sprint: Sprint;
    userId: string;
    objective: Objective | ObjectiveWithRelations | null;
    plan: SprintPlan;
    progresses?: Progress[];
    artifacts?: SprintArtifact[];
  }): SprintUiPayload {
    const metadataOverride = params.plan.metadata
      ? (JSON.parse(JSON.stringify(params.plan.metadata)) as Record<string, unknown>)
      : undefined;

    const sprintRecord = {
      ...params.sprint,
      progresses: params.progresses ?? [],
      artifacts: params.artifacts ?? []
    } as Sprint & { progresses: Progress[]; artifacts: SprintArtifact[] };

    return serializeSprint(sprintRecord, params.userId, params.objective, {
      title: params.plan.title,
      description: params.plan.description,
      projects: params.plan.projects,
      microTasks: params.plan.microTasks,
      portfolioCards: params.plan.portfolioCards,
      adaptationNotes: params.plan.adaptationNotes,
      metadata: metadataOverride,
      adaptiveMetadata: params.plan.adaptiveMetadata
        ? (JSON.parse(JSON.stringify(params.plan.adaptiveMetadata)) as Record<string, unknown>)
        : undefined,
      lengthDays: params.plan.lengthDays,
      totalEstimatedHours: params.plan.totalEstimatedHours,
      difficulty: params.plan.difficulty as SprintDifficulty
    });
  }

  private async buildAdaptiveMetadata(params: {
    userId: string;
    objectiveId: string;
    learnerProfile: LearnerProfile;
    profileContext: ProfileContext;
  }): Promise<AdaptivePlanMetadata | null> {
    if (!config.FEATURE_ADAPTIVE_PLANNER) {
      return null;
    }

    try {
      const [objectiveContextRecord, performance] = await Promise.all([
        db.objectiveContext.findFirst({
          where: { objectiveId: params.objectiveId },
          orderBy: { createdAt: 'desc' }
        }),
        adaptiveLearningService
          .analyzePerformance({ objectiveId: params.objectiveId, userId: params.userId })
          .catch((error) => {
            console.warn('[objectiveService] adaptive performance analysis failed', {
              objectiveId: params.objectiveId,
              error
            });
            return null;
          })
      ]);

      const technicalAssessment = this.extractTechnicalAssessment(
        params.profileContext.learnerProfile?.technicalLevel ?? null
      );

      const signals: AdaptiveMetadataSignals = {
        technicalAssessment,
        hoursPerWeek: params.learnerProfile.hoursPerWeek ?? null,
        objectiveContext: (objectiveContextRecord as ObjectiveContext | null) ?? null,
        performanceTrend: performance?.trend,
        performanceAverageScore: performance?.averageScore ?? null,
        generatedAt: new Date()
      };

      return generateAdaptiveMetadata(signals);
    } catch (error) {
      console.warn('[objectiveService] adaptive metadata generation failed', {
        objectiveId: params.objectiveId,
        error
      });
      return {
        ...DEFAULT_ADAPTIVE_METADATA,
        computedAt: new Date().toISOString()
      };
    }
  }

  private extractTechnicalAssessment(value: unknown): TechnicalAssessmentScore | null {
    if (isTechnicalAssessmentScore(value)) {
      return value;
    }
    return null;
  }

  private buildCustomInstructions(params: {
    learnerProfile: LearnerProfile;
    previousSprint?: PreviousSprintContext | null;
    objectiveTitle: string;
  }): string[] {
    const { learnerProfile, previousSprint, objectiveTitle } = params;
    const formatList = (items?: string[]) => (items && items.length ? items.join(', ') : 'n/a');

    const instructions: string[] = [
      'ACTIONABLE TASKS: Use strong verbs (e.g., "Build", "Configure", "Deploy"). Avoid generic titles like "Introduction to...".',
      'CONCISE TEXT: Keep descriptions and instructions to a maximum of 3 sentences.',
      'PROJECT FOCUS: Define one concrete feature set with a measurable outcome and list the exact verification steps.',
      'MEASURABLE TASKS: Every microTask must end with a validation step (tests, command output, screenshot, repository checkpoint) so completion can be observed.'
    ];

    // Special instructions for absolute beginners - guide progressive learning
    const technicalLevel = (learnerProfile as any).rawSnapshot?.technicalAssessment?.score?.overall;
    const technicalFlags = (learnerProfile as any).rawSnapshot?.technicalAssessment?.score?.flags;
    
    if (technicalLevel === 'absolute_beginner' && !previousSprint) {
      // Check if environment setup is needed
      if (technicalFlags?.needsEnvironmentSetup) {
        instructions.push(
          `ENVIRONMENT SETUP REQUIRED: This learner has NO development environment set up. The FIRST 2-3 tasks MUST cover: (1) Installing a code editor (VS Code), (2) Setting up terminal and Git, (3) Creating their first repository. These are prerequisites before any coding.`
        );
      }
      
      instructions.push(
        `ABSOLUTE BEGINNER - FIRST SPRINT: This learner has ZERO coding experience. Design this sprint to focus ONLY on foundational prerequisites. Do NOT attempt to build the final objective yet.`
      );
      instructions.push(
        `PROGRESSIVE LEARNING PATH: Break the objective into a multi-sprint journey. Sprint 1 should cover basics (e.g., for Node.js: learn JavaScript fundamentals like variables, functions, loops). Future sprints will build on this foundation.`
      );
      instructions.push(
        `APPROPRIATE SCOPE: For an absolute beginner learning backend/Node.js, Sprint 1 should teach core JavaScript concepts using browser console or simple .js files. Do NOT create APIs, servers, or databases yet.`
      );
    } else if (technicalLevel === 'absolute_beginner' && previousSprint) {
      instructions.push(
        `ABSOLUTE BEGINNER - CONTINUATION: This learner is still building fundamentals. Design tasks that incrementally advance from Sprint ${previousSprint.dayNumber}. Ensure prerequisites are met before introducing new concepts.`
      );
      instructions.push(
        `SCAFFOLDED PROGRESSION: Review what was covered in the previous sprint and design the next logical step. Avoid jumping too far ahead. Each sprint should feel achievable and build confidence.`
      );
    }

    // Handle reflection from previous sprint
    if (previousSprint?.reflection) {
      const normalizedReflection = previousSprint.reflection.replace(/\s+/g, ' ').trim();
      const truncatedReflection = normalizedReflection.length > 160
        ? `${normalizedReflection.slice(0, 157)}...`
        : normalizedReflection;
      instructions.push(
        `ADDRESS REFLECTION: The learner noted "${truncatedReflection}". Design tasks that address this feedback and incorporate their insights.`
      );
    }

    // Prevent repeating previous deliverables
    if (previousSprint?.deliverables?.length) {
      const deliverableSummary = previousSprint.deliverables.slice(0, 3).join('; ');
      instructions.push(
        `DO NOT REPEAT: Avoid recreating prior deliverables (${deliverableSummary}). Ship a complementary feature or enhancement.`
      );
    }

    // Align with learner goals and passions
    if (learnerProfile.goals?.length || learnerProfile.passionTags?.length) {
      const interests = [
        ...(learnerProfile.goals ?? []),
        ...(learnerProfile.passionTags ?? [])
      ].slice(0, 5).join(', ');
      
      instructions.push(
        `PROJECT THEME: Align the sprint project with these learner interests: ${interests}. Avoid generic examples like to-do lists unless they explicitly match the learner's stated goals.`
      );
    }

    // Address gaps
    if (learnerProfile.gaps?.length) {
      instructions.push(
        `ADDRESS GAPS (${formatList(learnerProfile.gaps)}): Convert each gap into a concrete micro-task with a build-or-do deliverable.`
      );
    }

    // Leverage strengths
    if (learnerProfile.strengths?.length) {
      instructions.push(
        `LEVERAGE STRENGTHS (${formatList(learnerProfile.strengths)}): Frame at least one requirement or deliverable so the learner showcases these strengths.`
      );
    }

    // Address blockers
    if (learnerProfile.blockers?.length) {
      instructions.push(
        `MITIGATE BLOCKERS (${formatList(learnerProfile.blockers)}): Design tasks that work around or directly address these blockers.`
      );
    }

    // Emphasize hands-on practice for learners who dislike theory
    if (learnerProfile.blockers?.some(b => b.toLowerCase().includes('théorie') || b.toLowerCase().includes('theory'))) {
      instructions.push(
        'HANDS-ON FOCUS: This learner dislikes excessive theory. Every concept must be immediately applied through coding exercises or mini-projects. Minimize reading, maximize doing.'
      );
    }

    instructions.push(
      'REFLECTION LOOP: Include a final microTask that captures learnings, blockers, and metrics (time spent, build status) to feed the next sprint.'
    );

    return instructions;
  }

  async completeObjective(params: {
    userId: string;
    objectiveId: string;
    completionNotes?: string;
  }): Promise<{
    objectiveId: string;
    status: string;
    completedAt: Date;
    totalDays: number;
    totalHours: number;
  }> {
    const { userId, objectiveId, completionNotes } = params;

    // Verify objective belongs to user
    const objective = await prisma.objective.findFirst({
      where: {
        id: objectiveId,
        userId
      },
      include: {
        sprints: {
          where: { completedAt: { not: null } },
          select: {
            totalEstimatedHours: true
          }
        }
      }
    });

    if (!objective) {
      throw new AppError('Objective not found', 404, 'OBJECTIVE_NOT_FOUND');
    }

    // Calculate totals
    const totalDays = objective.completedDays;
    const totalHours = objective.sprints.reduce(
      (sum: number, sprint: { totalEstimatedHours: number | null }) => sum + (sprint.totalEstimatedHours || 0),
      0
    );

    // Mark as completed
    const updatedObjective = await prisma.objective.update({
      where: { id: objectiveId },
      data: {
        status: 'completed',
        completedAt: new Date(),
        completionNotes: completionNotes || null
      }
    });

    // Emit completion event
    sprintEventEmitter.emitSprintEvent(SprintEvent.OBJECTIVE_COMPLETED, {
      userId,
      objectiveId,
      data: {
        totalDays,
        totalHours,
        completedAt: updatedObjective.completedAt
      }
    });

    return {
      objectiveId: updatedObjective.id,
      status: updatedObjective.status,
      completedAt: updatedObjective.completedAt!,
      totalDays,
      totalHours
    };
  }
}

export const objectiveService = new ObjectiveService();

function isTechnicalAssessmentScore(value: unknown): value is TechnicalAssessmentScore {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.overall !== 'string') {
    return false;
  }

  if (typeof record.score !== 'number') {
    return false;
  }

  if (!record.flags || typeof record.flags !== 'object') {
    return false;
  }

  return true;
}
