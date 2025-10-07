import { z } from 'zod';
import { LearnerProfile, SprintDifficulty } from '../types/prisma';
import {
  PlannerClientResult,
  PlannerRequestError,
  PlannerRequestPayload,
  PlannerRequestTelemetry,
  requestPlannerPlan
} from './plannerClient.js';
import { ProfileContext } from './profileContextBuilder.js';
import { config } from '../config/environment.js';

export type SprintPlanMode = 'skeleton' | 'expansion';

export interface SprintPlanExpansionGoal {
  targetLengthDays?: number | null;
  additionalMicroTasks?: number | null;
}

export interface GenerateSprintPlanInput {
  objectiveId: string;
  objectiveTitle: string;
  objectiveDescription?: string | null;
  successCriteria?: string[];
  requiredSkills?: string[];
  learnerProfile?: LearnerProfile | null;
  preferLength?: number;
  profileContext?: ProfileContext;
  allowedResources?: string[];
  plannerVersion?: string;
  requestedAt?: Date;
  objectivePriority?: number;
  objectiveStatus?: string;
  mode?: SprintPlanMode;
  currentPlan?: Partial<SprintPlanCore> | null;
  expansionGoal?: SprintPlanExpansionGoal | null;
  userLanguage?: string;
}

type EvidenceRubric = {
  dimensions: { name: string; weight: number; levels?: string[] }[];
  passThreshold: number;
};

export interface SprintProjectPlan {
  id: string;
  title: string;
  brief: string;
  requirements: string[];
  acceptanceCriteria: string[];
  deliverables: {
    type: 'repository' | 'deployment' | 'video' | 'screenshot';
    title: string;
    artifactId: string;
  }[];
  evidenceRubric: EvidenceRubric;
  checkpoints?: { id: string; title: string; type: 'assessment' | 'quiz' | 'demo'; spec: string }[];
  support?: {
    concepts?: { id: string; title: string; summary: string }[];
    practiceKatas?: { id: string; title: string; estimateMin: number }[];
    allowedResources?: string[];
  };
  reflection?: { prompt: string; moodCheck?: boolean };
}

export interface SprintMicroTaskPlan {
  id: string;
  projectId: string;
  title: string;
  type: 'concept' | 'practice' | 'project' | 'assessment' | 'reflection';
  estimatedMinutes: number;
  instructions: string;
  acceptanceTest: { type: 'checklist' | 'unit_tests' | 'quiz' | 'demo'; spec: string | string[] };
  resources?: string[];
}

const sprintPlanCoreSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(3),
  description: z.string().min(5),
  lengthDays: z.union([z.literal(1), z.literal(3), z.literal(7), z.literal(14)]),
  totalEstimatedHours: z.number().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  projects: z.array(z.object({
    id: z.string(),
    title: z.string(),
    brief: z.string(),
    requirements: z.array(z.string()).min(1),
    acceptanceCriteria: z.array(z.string()).min(1),
    deliverables: z.array(z.object({
      type: z.enum(['repository', 'deployment', 'video', 'screenshot']),
      title: z.string(),
      artifactId: z.string()
    })).min(1),
    evidenceRubric: z.object({
      dimensions: z.array(z.object({
        name: z.string(),
        weight: z.number().min(0).max(1),
        levels: z.array(z.string()).optional()
      })).min(1),
      passThreshold: z.number().min(0).max(1)
    }),
    checkpoints: z.array(z.object({
      id: z.string(),
      title: z.string(),
      type: z.enum(['assessment', 'quiz', 'demo']),
      spec: z.string()
    })).optional(),
    support: z.object({
      concepts: z.array(z.object({ id: z.string(), title: z.string(), summary: z.string() })).optional(),
      practiceKatas: z.array(z.object({ id: z.string(), title: z.string(), estimateMin: z.number().min(5) })).optional(),
      allowedResources: z.array(z.string()).optional()
    }).optional(),
    reflection: z.object({ prompt: z.string(), moodCheck: z.boolean().optional() }).optional()
  })).min(1),
  microTasks: z.array(z.object({
    id: z.string(),
    projectId: z.string(),
    title: z.string(),
    type: z.enum(['concept', 'practice', 'project', 'assessment', 'reflection']),
    estimatedMinutes: z.number().min(15).max(180),
    instructions: z.string(),
    acceptanceTest: z.object({
      type: z.enum(['checklist', 'unit_tests', 'quiz', 'demo']),
      spec: z.union([z.string(), z.array(z.string()).min(1)])
    }),
    resources: z.array(z.string()).optional()
  })).min(3),
  portfolioCards: z.array(z.object({
    projectId: z.string(),
    cover: z.string().optional(),
    headline: z.string(),
    badges: z.array(z.string()).optional(),
    links: z.object({
      repo: z.string().optional(),
      demo: z.string().optional(),
      video: z.string().optional()
    }).optional()
  })).optional(),
  adaptationNotes: z.string().min(5)
});

export type SprintPlanCore = z.infer<typeof sprintPlanCoreSchema>;

const DEFAULT_EVIDENCE_RUBRIC: EvidenceRubric = Object.freeze({
  dimensions: [
    { name: 'Fonctionnalité', weight: 0.4 },
    { name: 'Qualité du code', weight: 0.25 },
    { name: 'Expérience utilisateur', weight: 0.2 },
    { name: 'Documentation', weight: 0.15 }
  ],
  passThreshold: 0.7
});

const cloneDefaultEvidenceRubric = (): EvidenceRubric => ({
  dimensions: DEFAULT_EVIDENCE_RUBRIC.dimensions.map(dimension => ({ ...dimension })),
  passThreshold: DEFAULT_EVIDENCE_RUBRIC.passThreshold
});

const cloneValue = <T>(value: T): T => {
  if (typeof globalThis.structuredClone === 'function') {
    return globalThis.structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
};

const ensureProjectEvidenceRubrics = (rawPlan: unknown): unknown => {
  if (!rawPlan || typeof rawPlan !== 'object') {
    return rawPlan;
  }

  const clonedPlan = cloneValue(rawPlan) as Record<string, any>;

  if (!Array.isArray(clonedPlan.projects)) {
    return clonedPlan;
  }

  clonedPlan.projects = clonedPlan.projects.map(project => {
    if (!project || typeof project !== 'object') {
      return project;
    }

    const candidate = project as Record<string, any>;
    const evidenceRubric = candidate.evidenceRubric as Record<string, any> | undefined;
    const dimensions = evidenceRubric?.dimensions;
    const passThreshold = evidenceRubric?.passThreshold;
    const hasValidRubric =
      Array.isArray(dimensions) &&
      dimensions.length > 0 &&
      dimensions.every(
        (dimension: any) =>
          dimension &&
          typeof dimension.name === 'string' &&
          typeof dimension.weight === 'number' &&
          Number.isFinite(dimension.weight) &&
          dimension.weight >= 0 &&
          dimension.weight <= 1
      ) &&
      typeof passThreshold === 'number' &&
      Number.isFinite(passThreshold) &&
      passThreshold >= 0 &&
      passThreshold <= 1;

    if (hasValidRubric) {
      return candidate;
    }

    return {
      ...candidate,
      evidenceRubric: cloneDefaultEvidenceRubric()
    };
  });

  return clonedPlan;
};

export interface PlannerPlanMetadata {
  plannerVersion: string;
  requestedAt: string;
  provider: 'remote' | 'fallback';
  objectiveId: string;
  learnerProfileId?: string | null;
  preferLength?: number | null;
  mode: SprintPlanMode;
  incremental: boolean;
  expansionGoal?: SprintPlanExpansionGoal | null;
}

interface PlannerPlanMetadataInput {
  plannerVersion: string;
  requestedAt: Date;
  provider: 'remote' | 'fallback';
  objectiveId: string;
  learnerProfileId?: string | null;
  preferLength?: number | null;
  mode: SprintPlanMode;
  incremental: boolean;
  expansionGoal?: SprintPlanExpansionGoal | null;
}

export interface SprintPlan extends SprintPlanCore {
  plannerOutput: Record<string, unknown>;
  metadata: PlannerPlanMetadata;
}

class PlannerSchemaValidationError extends Error {
  readonly issues: z.ZodIssue[];

  constructor(issues: z.ZodIssue[]) {
    super('Planner response failed schema validation');
    this.name = 'PlannerSchemaValidationError';
    this.issues = issues;
  }
}

const MAX_REMOTE_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [500, 1500, 3000];

class PlannerService {
  async generateSprintPlan(input: GenerateSprintPlanInput): Promise<SprintPlan> {
    const requestedAt = input.requestedAt ?? new Date();
    const plannerVersion = input.plannerVersion ?? config.PLANNER_VERSION ?? 'unversioned';
    const planId = this.buildPlanId(input.objectiveId, requestedAt);
    const mode: SprintPlanMode = input.mode ?? 'skeleton';
    let attempt = 0;
    let lastError: unknown = null;

    while (attempt < MAX_REMOTE_ATTEMPTS) {
      attempt += 1;
      let attemptTelemetry: PlannerRequestTelemetry | undefined;

      try {
        const remoteResult = await requestPlannerPlan(
          this.buildPlannerPayload(input, plannerVersion, requestedAt, planId)
        );
        attemptTelemetry = remoteResult.telemetry;
        const corePlan = this.validateRemotePlan(remoteResult.plan, input, planId);
        const metadata = this.buildPlanMetadata({
          plannerVersion,
          requestedAt,
          provider: 'remote',
          objectiveId: input.objectiveId,
          learnerProfileId: input.learnerProfile?.id ?? null,
          preferLength: input.preferLength ?? null,
          mode,
          incremental: true,
          expansionGoal: input.expansionGoal ?? null
        });

        this.logRemoteAttemptSuccess(attempt, planId, input.objectiveId, remoteResult);

        return {
          ...corePlan,
          id: planId,
          plannerOutput: this.enrichPlannerOutput(remoteResult.plan, metadata, input.profileContext),
          metadata
        };
      } catch (error) {
        lastError = error;
        this.logRemoteAttemptFailure({
          attempt,
          error,
          planId,
          objectiveId: input.objectiveId,
          telemetry: attemptTelemetry
        });

        if (attempt < MAX_REMOTE_ATTEMPTS && this.shouldRetry(error)) {
          const delayMs = this.resolveRetryDelay(attempt);
          await this.wait(delayMs);
          continue;
        }

        break;
      }
    }

    this.logFallback(planId, input.objectiveId, attempt, lastError);
    return this.buildFallbackPlan({
      input,
      planId,
      requestedAt,
      plannerVersion,
      mode
    });
  }

  private validateRemotePlan(
    rawPlan: unknown,
    input: GenerateSprintPlanInput,
    planId: string
  ): SprintPlanCore {
    const sanitizedPlan = ensureProjectEvidenceRubrics(rawPlan);
    const parsed = sprintPlanCoreSchema.safeParse(sanitizedPlan);
    if (!parsed.success) {
      throw new PlannerSchemaValidationError(parsed.error.issues);
    }

    const plan = parsed.data;
    plan.id = planId;

    return plan;
  }

  private shouldRetry(error: unknown): boolean {
    if (error instanceof PlannerSchemaValidationError) {
      return true;
    }

    if (error instanceof PlannerRequestError) {
      return error.reason === 'invalid_json';
    }

    return false;
  }

  private resolveRetryDelay(attempt: number): number {
    const index = Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1);
    return RETRY_DELAYS_MS[index];
  }

  private async wait(ms: number): Promise<void> {
    if (ms <= 0) {
      return;
    }

    await new Promise(resolve => setTimeout(resolve, ms));
  }

  private logRemoteAttemptSuccess(
    attempt: number,
    planId: string,
    objectiveId: string,
    result: PlannerClientResult
  ): void {
    console.info('[plannerService] Remote planner attempt succeeded', {
      attempt,
      planId,
      objectiveId,
      provider: result.telemetry.provider,
      model: result.telemetry.model,
      latencyMs: result.telemetry.latencyMs,
      promptHash: result.telemetry.promptHash
    });
  }

  private logRemoteAttemptFailure(params: {
    attempt: number;
    error: unknown;
    planId: string;
    objectiveId: string;
    telemetry?: PlannerRequestTelemetry;
  }): void {
    const { attempt, error, planId, objectiveId, telemetry } = params;
    const resolvedTelemetry =
      telemetry ?? (error instanceof PlannerRequestError ? error.telemetry : undefined);
    
    const logData: Record<string, any> = {
      attempt,
      planId,
      objectiveId,
      provider: resolvedTelemetry?.provider,
      model: resolvedTelemetry?.model,
      latencyMs: resolvedTelemetry?.latencyMs,
      promptHash: resolvedTelemetry?.promptHash,
      timedOut: resolvedTelemetry?.timedOut ?? false,
      timeoutMs: resolvedTelemetry?.timeoutMs,
      errorReason: error instanceof PlannerRequestError ? error.reason : undefined,
      error: error instanceof Error ? error.message : error
    };
    
    if (error instanceof PlannerSchemaValidationError) {
      logData.validationIssues = error.issues.map(issue => ({
        path: issue.path.join('.'),
        message: issue.message,
        code: issue.code
      }));
    }
    
    console.error('[plannerService] Remote planner attempt failed', logData);
  }

  private logFallback(
    planId: string,
    objectiveId: string,
    attempts: number,
    error: unknown
  ): void {
    console.warn('[plannerService] Falling back to heuristic planner', {
      planId,
      objectiveId,
      attempts,
      error: error instanceof Error ? error.message : error
    });
  }

  private buildPlannerPayload(
    input: GenerateSprintPlanInput,
    plannerVersion: string,
    requestedAt: Date,
    planId: string
  ): PlannerRequestPayload {
    const profileContext = input.profileContext
      ? JSON.parse(JSON.stringify(input.profileContext))
      : null;
    const mode: SprintPlanMode = input.mode ?? 'skeleton';
    const currentPlan = input.currentPlan ? JSON.parse(JSON.stringify(input.currentPlan)) : null;

    return {
      objective: {
        id: input.objectiveId,
        title: input.objectiveTitle,
        description: input.objectiveDescription ?? null,
        successCriteria: input.successCriteria ?? [],
        requiredSkills: input.requiredSkills ?? [],
        priority: input.objectivePriority ?? null,
        status: input.objectiveStatus ?? null
      },
      learnerProfile: input.learnerProfile
        ? {
            id: input.learnerProfile.id,
            hoursPerWeek: input.learnerProfile.hoursPerWeek ?? null,
            strengths: input.learnerProfile.strengths ?? [],
            gaps: input.learnerProfile.gaps ?? [],
            passionTags: input.learnerProfile.passionTags ?? [],
            blockers: input.learnerProfile.blockers ?? [],
            goals: input.learnerProfile.goals ?? []
          }
        : null,
      preferLength: input.preferLength,
      allowedResources: input.allowedResources ?? null,
      userLanguage: input.userLanguage ?? 'en',
      mode,
      currentPlan,
      expansionGoal: input.expansionGoal ?? null,
      context: {
        plannerVersion,
        requestedAt: requestedAt.toISOString(),
        planId,
        profileContext,
        mode,
        currentPlan,
        expansionGoal: input.expansionGoal ?? null,
        allowedResources: input.allowedResources ?? null
      }
    };
  }

  private buildFallbackPlan(params: {
    input: GenerateSprintPlanInput;
    planId: string;
    requestedAt: Date;
    plannerVersion: string;
    mode: SprintPlanMode;
  }): SprintPlan {
    const { input, planId, requestedAt, plannerVersion, mode } = params;
    const sanitizedCurrentPlan = this.sanitizeCurrentPlan(input.currentPlan);
    const lengthDays = this.resolveFallbackLength(input);
    const previousLength = this.normalizeLength(sanitizedCurrentPlan?.lengthDays);
    const difficulty = (sanitizedCurrentPlan?.difficulty ?? this.resolveFallbackDifficulty(input)) as SprintDifficulty;
    const projectId = sanitizedCurrentPlan?.projects?.[0]?.id ?? `${planId}_project`;
    const projects =
      Array.isArray(sanitizedCurrentPlan?.projects) && sanitizedCurrentPlan?.projects?.length
        ? (sanitizedCurrentPlan.projects as SprintProjectPlan[])
        : this.buildFallbackProjects(planId, projectId, input, difficulty);

    const microTasks = this.buildFallbackMicroTasks({
      planId,
      projectId,
      input,
      lengthDays,
      mode,
      currentPlan: sanitizedCurrentPlan
    });

    const totalEstimatedHours = this.resolveFallbackHours(
      input,
      lengthDays,
      previousLength,
      sanitizedCurrentPlan?.totalEstimatedHours ?? null,
      mode,
      microTasks.length,
      sanitizedCurrentPlan?.microTasks?.length ?? 0
    );

    const portfolioCards =
      Array.isArray(sanitizedCurrentPlan?.portfolioCards) && sanitizedCurrentPlan?.portfolioCards?.length
        ? sanitizedCurrentPlan.portfolioCards
        : this.buildFallbackPortfolioCards(projectId, input);

    const baseNotes =
      typeof sanitizedCurrentPlan?.adaptationNotes === 'string'
        ? sanitizedCurrentPlan?.adaptationNotes
        : undefined;
    const adaptationNotes = baseNotes
      ? `${baseNotes} Continue building on the existing plan incrementally.`
      : this.buildAdaptationNotes(input, mode);

    const metadata = this.buildPlanMetadata({
      plannerVersion,
      requestedAt,
      provider: 'fallback',
      objectiveId: input.objectiveId,
      learnerProfileId: input.learnerProfile?.id ?? null,
      preferLength: input.preferLength ?? null,
      mode,
      incremental: true,
      expansionGoal: input.expansionGoal ?? null
    });

    const plannerOutput: Record<string, unknown> = {
      provider: 'fallback',
      generatedAt: requestedAt.toISOString(),
      plannerVersion,
      planId,
      profileContext: input.profileContext ?? null,
      mode,
      expansionGoal: input.expansionGoal ?? null,
      projects,
      microTasks,
      portfolioCards,
      adaptationNotes,
      metadata
    };

    return {
      id: planId,
      title: sanitizedCurrentPlan?.title ?? `${input.objectiveTitle} — Sprint`,
      description:
        sanitizedCurrentPlan?.description ?? input.objectiveDescription ?? `Sprint focusing on ${input.objectiveTitle}.`,
      lengthDays,
      totalEstimatedHours,
      difficulty,
      projects,
      microTasks,
      portfolioCards,
      adaptationNotes,
      plannerOutput,
      metadata
    };
  }

  private buildPlanId(objectiveId: string, requestedAt: Date): string {
    const timestamp = requestedAt.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
    return `spr_${objectiveId}_${timestamp}`;
  }

  private buildPlanMetadata(params: PlannerPlanMetadataInput): PlannerPlanMetadata {
    return {
      plannerVersion: params.plannerVersion,
      requestedAt: params.requestedAt.toISOString(),
      provider: params.provider,
      objectiveId: params.objectiveId,
      learnerProfileId: params.learnerProfileId ?? null,
      preferLength: params.preferLength ?? null,
      mode: params.mode,
      incremental: params.incremental,
      expansionGoal: params.expansionGoal ?? null
    };
  }

  private enrichPlannerOutput(
    rawPlan: unknown,
    metadata: PlannerPlanMetadata,
    profileContext?: ProfileContext
  ): Record<string, unknown> {
    const payload = this.deepClone(rawPlan);
    payload.metadata = metadata;
    payload.mode = metadata.mode;
    payload.incremental = metadata.incremental;
    if (metadata.expansionGoal) {
      payload.expansionGoal = metadata.expansionGoal;
    }
    if (profileContext) {
      payload.profileContext = profileContext;
    }
    return payload;
  }

  private deepClone(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.warn('[plannerService] Failed to clone planner payload, returning shallow copy');
      return {};
    }
  }

  private resolveFallbackLength(input: GenerateSprintPlanInput): 1 | 3 | 7 | 14 {
    const mode: SprintPlanMode = input.mode ?? 'skeleton';
    if (mode === 'skeleton') {
      return 1;
    }

    const targetLength = this.normalizeLength(input.expansionGoal?.targetLengthDays);
    if (targetLength) {
      return targetLength;
    }

    const currentLength = this.normalizeLength(input.currentPlan?.lengthDays);
    if (currentLength) {
      const allowed: Array<1 | 3 | 7 | 14> = [1, 3, 7, 14];
      const next = allowed.find((value) => value > currentLength);
      return next ?? currentLength;
    }

    const preferred = this.normalizeLength(input.preferLength);
    if (preferred) {
      return preferred;
    }

    return this.resolveHeuristicLength(input);
  }

  private resolveFallbackHours(
    input: GenerateSprintPlanInput,
    lengthDays: 1 | 3 | 7 | 14,
    previousLength: 1 | 3 | 7 | 14 | null,
    previousHours: number | null,
    mode: SprintPlanMode,
    totalTasks: number,
    previousTaskCount: number
  ): number {
    const hoursPerWeek = input.learnerProfile?.hoursPerWeek;

    if (mode === 'expansion' && typeof previousHours === 'number') {
      const normalizedPreviousLength = previousLength ?? 1;
      const lengthDelta = Math.max(0, lengthDays - normalizedPreviousLength);
      const taskDelta = Math.max(0, totalTasks - previousTaskCount);
      const additionalHoursFromLength = lengthDelta * 2;
      const additionalHoursFromTasks = taskDelta * 0.75;
      const updated = previousHours + Math.max(1, additionalHoursFromLength + additionalHoursFromTasks);
      return Math.round(updated * 10) / 10;
    }

    if (lengthDays === 1) {
      if (hoursPerWeek && hoursPerWeek > 0) {
        const hoursPerDay = hoursPerWeek / 7;
        return Math.max(1, Math.round(hoursPerDay * 10) / 10);
      }
      return 2;
    }

    if (hoursPerWeek && hoursPerWeek > 0) {
      const hoursPerDay = hoursPerWeek / 7;
      return Math.round(hoursPerDay * lengthDays * 10) / 10;
    }

    const defaultHoursPerDay = lengthDays === 3 ? 3 : lengthDays === 7 ? 2.5 : 2;
    return Math.round(defaultHoursPerDay * lengthDays * 10) / 10;
  }

  private normalizeLength(value?: number | null): 1 | 3 | 7 | 14 | null {
    if (typeof value !== 'number') {
      return null;
    }
    const allowed: Array<1 | 3 | 7 | 14> = [1, 3, 7, 14];
    return allowed.includes(value as 1 | 3 | 7 | 14) ? (value as 1 | 3 | 7 | 14) : null;
  }

  private resolveHeuristicLength(input: GenerateSprintPlanInput): 1 | 3 | 7 | 14 {
    const hoursPerWeek = input.learnerProfile?.hoursPerWeek ?? null;
    if (!hoursPerWeek) {
      return 3;
    }
    if (hoursPerWeek < 8) {
      return 14;
    }
    if (hoursPerWeek <= 15) {
      return 7;
    }
    return 3;
  }

  private resolveFallbackDifficulty(input: GenerateSprintPlanInput): SprintDifficulty {
    const profile = input.learnerProfile;
    const strengths = profile?.strengths ?? [];
    const requiredSkills = input.requiredSkills ?? [];
    const hasMatchingStrength = requiredSkills.some((skill) =>
      strengths.map((s) => s.toLowerCase()).includes(skill.toLowerCase())
    );

    if (!hasMatchingStrength && (profile?.gaps?.length ?? 0) > 0) {
      return SprintDifficulty.beginner;
    }
    if (profile?.hoursPerWeek && profile.hoursPerWeek > 20) {
      return SprintDifficulty.advanced;
    }
    return SprintDifficulty.intermediate;
  }

  private buildFallbackProjects(
    planId: string,
    projectId: string,
    input: GenerateSprintPlanInput,
    difficulty: SprintDifficulty
  ): SprintProjectPlan[] {
    const acceptanceCriteria = input.successCriteria?.slice(0, 3) ?? [
      'Submit code repository',
      'Record demo or screenshots',
      'Write sprint retrospective'
    ];

    const allowedResources = Array.isArray(input.allowedResources) && input.allowedResources.length
      ? [...input.allowedResources]
      : undefined;

    const project: SprintProjectPlan = {
      id: projectId,
      title: `${input.objectiveTitle} project`,
      brief: input.objectiveDescription ?? `Ship a tangible artifact for ${input.objectiveTitle}.`,
      requirements: [
        'Follow accessible and inclusive best practices',
        'Document project decisions in README',
        `Highlight how this work contributes to ${input.objectiveTitle}`
      ],
      acceptanceCriteria,
      deliverables: [
        { type: 'repository', title: 'Repository link', artifactId: `${projectId}_repo` },
        { type: 'deployment', title: 'Demo link', artifactId: `${projectId}_demo` }
      ],
      evidenceRubric: cloneDefaultEvidenceRubric(),
      checkpoints: [
        {
          id: `${planId}_checkpoint_review`,
          title: 'Mid-sprint review',
          type: 'demo',
          spec: 'Walk through core functionality and capture blockers.'
        }
      ],
      support: {
        concepts: [
          {
            id: `${planId}_concept_scope`,
            title: 'Scope definition',
            summary: 'Clarify MVP vs stretch tasks before starting.'
          }
        ],
        practiceKatas: [
          {
            id: `${planId}_kata_tests`,
            title: 'Write smoke tests for critical flows',
            estimateMin: 30
          }
        ],
        ...(allowedResources ? { allowedResources } : {})
      },
      reflection: {
        prompt: 'What did this sprint change about your understanding of the objective?',
        moodCheck: true
      }
    };

    if (difficulty === SprintDifficulty.beginner) {
      project.requirements.push('Include learning journal notes in repository.');
    }

    return [project];
  }

  private sanitizeCurrentPlan(plan?: Partial<SprintPlanCore> | null): Partial<SprintPlanCore> | null {
    if (!plan || typeof plan !== 'object') {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(plan)) as Partial<SprintPlanCore>;
    } catch (error) {
      console.warn('[plannerService] Failed to sanitize current plan payload', error);
      return null;
    }
  }

  private buildFallbackMicroTasks(params: {
    planId: string;
    projectId: string;
    input: GenerateSprintPlanInput;
    lengthDays: 1 | 3 | 7 | 14;
    mode: SprintPlanMode;
    currentPlan?: Partial<SprintPlanCore> | null;
  }): SprintMicroTaskPlan[] {
    const { planId, projectId, input, lengthDays, mode, currentPlan } = params;
    const planSnapshot = currentPlan ?? null;

    if (mode === 'skeleton') {
      return this.buildSkeletonMicroTasks(planId, projectId, input);
    }

    const existingTasks = Array.isArray(planSnapshot?.microTasks)
      ? (JSON.parse(JSON.stringify(planSnapshot.microTasks)) as SprintMicroTaskPlan[])
      : [];

    const additionalCount = this.resolveExpansionMicroTaskCount(lengthDays, input, planSnapshot, existingTasks.length);
    const newTasks = this.buildExpansionMicroTaskBatch(
      planId,
      projectId,
      input,
      lengthDays,
      existingTasks.length,
      additionalCount
    );

    return [...existingTasks, ...newTasks];
  }

  private buildSkeletonMicroTasks(
    planId: string,
    projectId: string,
    input: GenerateSprintPlanInput
  ): SprintMicroTaskPlan[] {
    const estimatedMinutes = 60;
    const hasAllowedResources = Array.isArray(input.allowedResources) && input.allowedResources.length > 0;

    const templates = [
      {
        title: `Plan a quick win for ${input.objectiveTitle}`,
        type: 'concept' as const,
        instructions: `Define a single-day success outcome for ${input.objectiveTitle}. Clarify what artifact you'll ship and list blockers to unblock early.`,
        acceptance: [
          'Document a concise goal for the day',
          'List key steps and blockers',
          'Share the plan with an accountability partner or journal'
        ],
        defaultResources: [
          'https://www.atlassian.com/agile/project-management/user-stories',
          'https://www.smartsheet.com/content/project-planning-guide'
        ]
      },
      {
        title: `Ship the core slice of ${input.objectiveTitle}`,
        type: 'project' as const,
        instructions: `Implement the smallest meaningful deliverable that proves progress on ${input.objectiveTitle}. Commit code or notes that demonstrate momentum.`,
        acceptance: [
          'Produce a tangible artifact (code, notes, draft)',
          'Record what changed compared to yesterday',
          'Capture screenshots or repo links for evidence'
        ],
        defaultResources: [
          'https://github.com/github/gitignore',
          'https://docs.github.com/en/get-started/quickstart'
        ]
      },
      {
        title: 'Rapid evidence + reflection',
        type: 'reflection' as const,
        instructions:
          'Collect the day-one artifact, summarize what you learned, and note one improvement to tackle during the next expansion request.',
        acceptance: [
          'Attach at least one evidence link',
          'Write a short reflection with a next-step focus',
          'Identify one risk or question to explore next'
        ],
        defaultResources: [
          'https://www.atlassian.com/agile/project-management/retrospectives',
          'https://retrospectivewiki.org/index.php?title=Agile_Retrospective_Resource_Wiki'
        ]
      }
    ];

    return templates.map((template, index) => {
      const resources = hasAllowedResources 
        ? input.allowedResources!
        : template.defaultResources;
      
      return {
        id: `${planId}_task_${index + 1}`,
        projectId,
        title: template.title,
        type: template.type,
        estimatedMinutes,
        instructions: template.instructions,
        acceptanceTest: {
          type: 'checklist',
          spec: template.acceptance
        },
        resources
      };
    });
  }

  private resolveExpansionMicroTaskCount(
    lengthDays: 1 | 3 | 7 | 14,
    input: GenerateSprintPlanInput,
    currentPlan: Partial<SprintPlanCore> | null,
    existingCount: number
  ): number {
    if (input.expansionGoal?.additionalMicroTasks && input.expansionGoal.additionalMicroTasks > 0) {
      return input.expansionGoal.additionalMicroTasks;
    }

    const currentLength = this.normalizeLength(currentPlan?.lengthDays) ?? 1;
    const lengthDelta = Math.max(0, lengthDays - currentLength);

    if (lengthDelta >= 7) {
      return 6;
    }
    if (lengthDelta >= 4) {
      return 4;
    }
    if (lengthDelta >= 2) {
      return 3;
    }
    if (lengthDelta > 0) {
      return 2;
    }

    return existingCount >= 6 ? 2 : 3;
  }

  private buildExpansionMicroTaskBatch(
    planId: string,
    projectId: string,
    input: GenerateSprintPlanInput,
    lengthDays: 1 | 3 | 7 | 14,
    startIndex: number,
    count: number
  ): SprintMicroTaskPlan[] {
    if (count <= 0) {
      return [];
    }

    const estimatedMinutes = lengthDays >= 7 ? 90 : 75;
    const resources = Array.isArray(input.allowedResources) && input.allowedResources.length
      ? [...input.allowedResources]
      : undefined;
    const templates = [
      {
        title: `Extend the deliverable for ${input.objectiveTitle}`,
        type: 'project' as const,
        instructions:
          'Add a stretch enhancement or robustness improvement. Focus on polish that showcases quality when you share the sprint.',
        acceptance: [
          'Document the enhancement in CHANGELOG or README',
          'Record before/after screenshots or metrics',
          'Note any trade-offs introduced by the enhancement'
        ]
      },
      {
        title: 'Quality sweep & peer feedback',
        type: 'assessment' as const,
        instructions:
          'Run tests or manual QA, capture issues found, and share progress with a peer or community channel for quick feedback.',
        acceptance: [
          'List bugs or gaps discovered during QA',
          'Summarize feedback received (or your own review notes)',
          'Identify follow-up tasks to address in the next iteration'
        ]
      },
      {
        title: 'Evidence packaging sprint',
        type: 'reflection' as const,
        instructions:
          'Produce supporting materials—demo video, screenshots, or walkthrough notes—to make your progress portfolio-ready.',
        acceptance: [
          'Capture at least two artifacts (video, screenshot, repo diff)',
          'Write a narrative that highlights new capabilities',
          'List questions to explore in the next planning cycle'
        ]
      },
      {
        title: 'Skill deep-dive booster',
        type: 'concept' as const,
        instructions:
          'Study a targeted concept or tutorial that unlocks the next milestone. Summarize takeaways and how they apply to the project.',
        acceptance: [
          'Link to the resource consumed',
          'Summarize top three insights',
          'Describe how you will apply the insight in upcoming work'
        ]

      }
    ];

    return Array.from({ length: count }).map((_, index) => {
      const template = templates[index % templates.length];
      const idIndex = startIndex + index + 1;
      return {
        id: `${planId}_task_${idIndex}`,
        projectId,
        title: template.title,
        type: template.type,
        estimatedMinutes,
        instructions: template.instructions,
        acceptanceTest: {
          type: 'checklist',
          spec: template.acceptance
        },
        ...(resources ? { resources } : {})
      } satisfies SprintMicroTaskPlan;
    });
  }

  private buildFallbackPortfolioCards(projectId: string, input: GenerateSprintPlanInput) {
    return [
      {
        projectId,
        headline: `Showcase: ${input.objectiveTitle}`,
        badges: input.requiredSkills?.slice(0, 3) ?? [],
        links: {}
      }
    ];
  }

  private buildAdaptationNotes(input: GenerateSprintPlanInput, mode: SprintPlanMode): string {
    const strengths = input.learnerProfile?.strengths ?? [];
    const gaps = input.learnerProfile?.gaps ?? [];

    const notes: string[] = [];

    if (mode === 'skeleton') {
      notes.push('Focus on a single quick win today, then request an expansion to layer additional scope.');
    }

    if (gaps.length > 0) {
      notes.push('Insert refresher resources for learner gaps before core tasks.');
    }

    if (strengths.includes('collaboration')) {
      notes.push('Encourage pair or community review midway through the sprint.');
    }

    if (input.profileContext?.progress?.streak && input.profileContext.progress.streak > 3) {
      notes.push('Sustain momentum with a stretch checkpoint on day 3.');
    }

    if (input.profileContext?.progress?.completedTasks === 0) {
      notes.push('Start with a quick win task to build confidence before tackling core work.');
    }

    if (notes.length === 0) {
      notes.push('Review progress every two days to adjust scope if needed.');
    }

    if (mode === 'expansion') {
      notes.push('Carry forward evidence from the skeleton sprint and highlight new additions in each expansion.');
    }

    return notes.join(' ');
  }
}

export const plannerServiceTestables = {
  ensureProjectEvidenceRubrics,
  sprintPlanCoreSchema,
  defaultEvidenceRubric: DEFAULT_EVIDENCE_RUBRIC
};

export const plannerService = new PlannerService();
