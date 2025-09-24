import { Prisma } from '@prisma/client';
import { db } from '../prisma/prismaWrapper';
import { AppError } from '../errors/AppError';
import { learnerProfileService } from './learnerProfileService.js';
import { plannerService } from './plannerService.js';
import type { SprintPlan } from './plannerService.js';
import { sprintService } from './sprintService.js';
import { SprintUpdateInput } from '../repositories/sprintRepository.js';
import { profileContextBuilder, ProfileContext } from './profileContextBuilder.js';
import { config } from '../config/environment.js';
import {
  ObjectiveStatus,
  LearnerProfile,
  RoadmapType,
  SprintStatus,
  SprintDifficulty,
  Objective,
  Progress,
  Sprint,
  SprintArtifact
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


export interface CreateObjectiveRequest {
  userId: string;
  title: string;
  description?: string;
  learnerProfileId?: string;
  successCriteria?: string[];
  requiredSkills?: string[];
  priority?: number;
  roadmapType?: RoadmapType;
}

export interface GenerateSprintRequest {
  userId: string;
  objectiveId: string;
  learnerProfileId?: string;
  preferLength?: number;
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
  sprint: SprintUiPayload;
  plan: SprintPlan;
  planLimits: PlanLimitsPayload;
}

export interface GenerateSprintResponse {
  sprint: SprintUiPayload;
  plan: SprintPlan;
  planLimits: PlanLimitsPayload;
  objectiveLimits: ObjectiveSprintLimitPayload;
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
          sprints: {
            orderBy: { createdAt: 'desc' },
            include: {
              progresses: true,
              artifacts: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
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

  async createObjective(request: CreateObjectiveRequest): Promise<CreateObjectiveResponse> {
    const { summary } = await planLimitationService.ensureCanCreateObjective(request.userId);
    const learnerProfile = await this.resolveLearnerProfile(request.userId, request.learnerProfileId);

    if (!learnerProfile) {
      throw new AppError('objectives.errors.profileRequired', 400, 'LEARNER_PROFILE_REQUIRED');
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
        estimatedWeeksMin: request.roadmapType === RoadmapType.thirty_day ? 3 : 1,
        estimatedWeeksMax: request.roadmapType === RoadmapType.thirty_day ? 6 : 2
      }
    });

    const profileContext = await profileContextBuilder.build({
      userId: request.userId,
      learnerProfileId: learnerProfile.id,
      objectiveId: objective.id
    });

    const { sprint, plan } = await this.generateAndPersistSprint({
      userId: request.userId,
      objectiveId: objective.id,
      learnerProfile,
      profileContext,
      preferLength: request.roadmapType === RoadmapType.thirty_day ? 14 : undefined
    });

    const objectiveWithRelations = (await db.objective.findFirst({
      where: { id: objective.id },
      include: {
        profileSnapshot: true,
        sprints: {
          orderBy: { createdAt: 'desc' },
          include: { progresses: true, artifacts: true }

        }
      }
    })) as ObjectiveWithRelations | null;

    if (!objectiveWithRelations) {
      throw new AppError('objectives.errors.notFound', 404, 'OBJECTIVE_NOT_FOUND');
    }

    const updatedSummary: PlanLimitsSummary = {
      ...summary,
      objectiveCount: summary.objectiveCount + 1
    };
    const planLimits = planLimitationService.buildPlanPayload(updatedSummary);
    const objectiveLimits = planLimitationService.buildObjectiveSprintLimit(
      updatedSummary,
      objectiveWithRelations.sprints?.length ?? 0
    );
    const objectivePayload = serializeObjective(objectiveWithRelations, {
      userId: request.userId,
      limits: objectiveLimits
    });
    const metadataOverride = plan.metadata
      ? (JSON.parse(JSON.stringify(plan.metadata)) as Record<string, unknown>)
      : undefined;
    const sprintPayload = serializeSprint(
      { ...sprint, progresses: [], artifacts: [] },

      request.userId,
      objectiveWithRelations,
      {
        title: plan.title,
        description: plan.description,
        projects: plan.projects,
        microTasks: plan.microTasks,
        portfolioCards: plan.portfolioCards,
        adaptationNotes: plan.adaptationNotes,
        metadata: metadataOverride,
        lengthDays: plan.lengthDays,
        totalEstimatedHours: plan.totalEstimatedHours,
        difficulty: plan.difficulty as SprintDifficulty
      }
    );

    return {
      objective: objectivePayload,
      sprint: sprintPayload,
      plan,
      planLimits
    };
  }

  async generateSprint(request: GenerateSprintRequest): Promise<GenerateSprintResponse> {
    const [objective, learnerProfile] = await Promise.all([
      db.objective.findFirst({
        where: {
          id: request.objectiveId,
          OR: [
            { roadmap: { userId: request.userId } },
            { profileSnapshot: { userId: request.userId } }
          ]
        }
      }),
      this.resolveLearnerProfile(request.userId, request.learnerProfileId)
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

    const { sprint, plan } = await this.generateAndPersistSprint({
      userId: request.userId,
      objectiveId: objective.id,
      learnerProfile,
      profileContext,
      preferLength: request.preferLength,
      objective
    });

    const metadataOverride = plan.metadata
      ? (JSON.parse(JSON.stringify(plan.metadata)) as Record<string, unknown>)
      : undefined;
    const sprintPayload = serializeSprint(
      { ...sprint, progresses: [] },
      request.userId,
      objective,
      {
        title: plan.title,
        description: plan.description,
        projects: plan.projects,
        microTasks: plan.microTasks,
        portfolioCards: plan.portfolioCards,
        adaptationNotes: plan.adaptationNotes,
        metadata: metadataOverride,
        lengthDays: plan.lengthDays,
        totalEstimatedHours: plan.totalEstimatedHours,
        difficulty: plan.difficulty as SprintDifficulty
      }
    );

    const objectiveLimits = planLimitationService.buildObjectiveSprintLimit(summary, sprintCount + 1);

    return {
      sprint: sprintPayload,
      plan,
      planLimits,
      objectiveLimits
    };
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
        objective: true
      }
    })) as (Sprint & {
      progresses?: Progress[];
      artifacts?: SprintArtifact[];
      objective?: Objective | null;
    }) | null;

    if (!sprint) {
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

  private async generateAndPersistSprint(params: {
    userId: string;
    objectiveId: string;
    learnerProfile: LearnerProfile;
    profileContext: ProfileContext;
    preferLength?: number;
    objective?: { title: string; description?: string | null; successCriteria: string[]; requiredSkills: string[]; priority?: number; status?: ObjectiveStatus } | null;
  }) {
    const objective = params.objective ?? (await db.objective.findUnique({ where: { id: params.objectiveId } }));
    if (!objective) {
      throw new AppError('objectives.errors.notFound', 404, 'OBJECTIVE_NOT_FOUND');
    }

    const plannerVersion = config.PLANNER_VERSION ?? 'unversioned';
    const requestedAt = new Date();

    const plan = await plannerService.generateSprintPlan({
      objectiveId: params.objectiveId,
      objectiveTitle: objective.title,
      objectiveDescription: objective.description,
      successCriteria: objective.successCriteria,
      requiredSkills: objective.requiredSkills,
      learnerProfile: params.learnerProfile,
      profileContext: params.profileContext,
      preferLength: params.preferLength,
      objectivePriority: objective.priority,
      objectiveStatus: objective.status,
      plannerVersion,
      requestedAt
    });

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
      preferLength: params.preferLength ?? null
    };

    const plannerInputJson = JSON.parse(JSON.stringify(plannerInputPayload)) as unknown as Prisma.JsonValue;
    const plannerOutputJson = JSON.parse(JSON.stringify(plan.plannerOutput ?? {})) as unknown as Prisma.JsonValue;

    const sprint = await sprintService.createSprint({
      objectiveId: params.objectiveId,
      profileSnapshotId: params.learnerProfile.id,
      plannerInput: plannerInputJson,
      plannerOutput: plannerOutputJson,
      lengthDays: plan.lengthDays,
      totalEstimatedHours: plan.totalEstimatedHours,
      difficulty: plan.difficulty as SprintDifficulty,
      status: SprintStatus.planned
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
      requestedAt: requestedAt.toISOString()
    });

    return { sprint, plan };
  }
}

export const objectiveService = new ObjectiveService();
