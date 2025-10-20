import { Prisma } from '@prisma/client';
import {
  Objective,
  ObjectiveContext,
  Progress,
  Sprint,
  SprintArtifact,
  SprintDifficulty,
  SprintStatus,
  ArtifactStatus,
  ArtifactType,
  LearnerProfile
} from '@prisma/client';
import type { ObjectiveSprintLimitPayload } from '../types/planLimits.js';

type JsonValue = Prisma.JsonValue;

export interface SprintProgressPayload {
  completedTasks: number;
  completedDays: number;
  scoreEstimate: number | null;
}

function serializeObjectiveContexts(contexts: ObjectiveContext[]): ObjectiveContextPayload[] {
  if (!contexts.length) {
    return [];
  }

  const sorted = [...contexts].sort((a, b) => {
    const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
    const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
    return bTime - aTime;
  });

  return sorted.map((context) => ({
    id: context.id,
    priorKnowledge: jsonValueToStringArray(context.priorKnowledge),
    relatedSkills: jsonValueToStringArray(context.relatedSkills),
    focusAreas: jsonValueToStringArray(context.focusAreas),
    extractedSkills: jsonValueToStringArray(context.extractedSkills),
    urgency: context.urgency ?? null,
    depthPreference: context.depthPreference ?? null,
    specificDeadline: context.specificDeadline instanceof Date
      ? context.specificDeadline.toISOString()
      : context.specificDeadline
        ? new Date(context.specificDeadline as unknown as string).toISOString()
        : null,
    timeCommitmentHours: typeof context.timeCommitmentHours === 'number' ? context.timeCommitmentHours : null,
    domainExperience: context.domainExperience ?? null,
    notes: context.notes ?? null,
    createdAt: context.createdAt instanceof Date ? context.createdAt.toISOString() : new Date(context.createdAt).toISOString(),
    updatedAt: context.updatedAt instanceof Date ? context.updatedAt.toISOString() : new Date(context.updatedAt).toISOString()
  }));
}

function jsonValueToStringArray(value: Prisma.JsonValue | null | undefined): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }

  return [];
}

export interface ObjectiveContextPayload {
  id: string;
  priorKnowledge: string[];
  relatedSkills: string[];
  focusAreas: string[];
  extractedSkills: string[];
  urgency: string | null;
  depthPreference: string | null;
  specificDeadline: string | null;
  timeCommitmentHours: number | null;
  domainExperience: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SprintArtifactPayload {
  artifactId: string;
  projectId: string;
  type: ArtifactType;
  status: ArtifactStatus;
  title: string | null;
  url: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface SprintReviewSummaryPayload {
  score: number;
  pass: boolean;
  achieved: string[];
  missing: string[];
  nextRecommendations: string[];
}

export interface SprintReviewProjectPayload {
  projectId: string;
  projectTitle?: string;
  review: SprintReviewSummaryPayload;
}

export interface SprintReviewPayload {
  status: 'not_requested' | 'pending' | 'completed';
  reviewedAt: string | null;
  score: number | null;
  summary: SprintReviewSummaryPayload | null;
  projectSummaries: SprintReviewProjectPayload[];
  metadata: Record<string, unknown> | null;
}

export interface SprintUiPayload {
  id: string;
  objectiveId: string;
  title: string;
  description: string;
  lengthDays: number;
  totalEstimatedHours: number;
  difficulty: SprintDifficulty;
  status: SprintStatus;
  projects: unknown[];
  microTasks: unknown[];
  portfolioCards: unknown[];
  adaptationNotes: string | null;
  progress: SprintProgressPayload;
  startedAt: string | null;
  completedAt: string | null;
  score: number | null;
  metadata: Record<string, unknown> | null;
  adaptiveMetadata: Record<string, unknown> | null;
  evidence: {
    artifacts: SprintArtifactPayload[];
    selfEvaluation: { confidence?: number | null; reflection?: string | null } | null;
  };
  review: SprintReviewPayload;
}

export interface ObjectiveProgressPayload {
  sprintsDone: number;
  sprintsPlanned: number;
  percent: number;
}

export interface ObjectiveUiPayload {
  id: string;
  title: string;
  description: string | null;
  passionTags: string[];
  priority: number;
  status: string;
  estimatedTotalWeeks: { min: number | null; max: number | null };
  estimatedTotalDays?: number | null;
  estimatedDailyHours?: number | null;
  currentDay?: number;
  completedDays?: number;
  progressPercentage?: number;
  successCriteria: string[];
  requiredSkills: string[];
  currentSprintId: string | null;
  currentSprint: SprintUiPayload | null;
  pastSprints: SprintUiPayload[];
  progress: ObjectiveProgressPayload;
  totalSprints: number;
  createdAt: string;
  updatedAt: string;
  limits: ObjectiveSprintLimitPayload;
  latestContext: ObjectiveContextPayload | null;
  contextHistory: ObjectiveContextPayload[];
}

export interface ObjectiveWithRelations extends Omit<Objective, 'estimatedTotalDays' | 'estimatedDailyHours' | 'currentDay' | 'completedDays' | 'progressPercentage'> {
  sprints: (Sprint & { progresses?: Progress[]; artifacts?: SprintArtifact[] })[];
  profileSnapshot?: LearnerProfile | null;
  estimatedTotalDays: number | null;
  estimatedDailyHours: number | null;
  currentDay: number;
  completedDays: number;
  progressPercentage: number;
  contexts?: ObjectiveContext[];
}

interface SprintPlanDetails {
  title?: string;
  description?: string;
  projects?: unknown[];
  microTasks?: unknown[];
  portfolioCards?: unknown[];
  adaptationNotes?: string | null;
  progress?: { completedTasks?: number; completedDays?: number; scoreEstimate?: number };
  metadata?: Record<string, unknown> | null;
  adaptiveMetadata?: Record<string, unknown> | null;
}

interface SprintPlanOverride extends SprintPlanDetails {
  lengthDays?: number;
  totalEstimatedHours?: number;
  difficulty?: SprintDifficulty;
}

const COMPLETED_STATUSES = new Set<SprintStatus>([SprintStatus.reviewed, SprintStatus.submitted]);

const ACTIVE_STATUS_PRIORITY: SprintStatus[] = [
  SprintStatus.in_progress,
  SprintStatus.planned,
  SprintStatus.submitted,
  SprintStatus.reviewed
];

export function serializeObjective(
  objective: ObjectiveWithRelations,
  options: { userId: string; limits: ObjectiveSprintLimitPayload }
): ObjectiveUiPayload {
  const sprints = [...(objective.sprints ?? [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const sprintPayloads = sprints.map((sprint) =>
    serializeSprint(sprint, options.userId, objective)
  );

  const currentSprintEntity = findCurrentSprint(sprints);
  const currentSprintPayload = currentSprintEntity
    ? sprintPayloads.find((payload) => payload.id === currentSprintEntity.id) ?? null
    : null;
  const currentSprintId = currentSprintPayload?.id ?? null;

  const pastSprints = sprintPayloads.filter((payload) => payload.id !== currentSprintId);

  const sprintsDone = sprints.filter((sprint) => COMPLETED_STATUSES.has(sprint.status)).length;
  const sprintsPlanned = sprints.length;
  const percent = sprintsPlanned === 0 ? 0 : Math.round((sprintsDone / sprintsPlanned) * 100);

  const contextHistory = serializeObjectiveContexts(objective.contexts ?? []);
  const latestContext = contextHistory[0] ?? null;

  return {
    id: objective.id,
    title: objective.title,
    description: objective.description ?? null,
    passionTags: objective.profileSnapshot?.passionTags ?? [],
    priority: objective.priority,
    status: objective.status,
    estimatedTotalWeeks: {
      min: objective.estimatedWeeksMin ?? null,
      max: objective.estimatedWeeksMax ?? null
    },
    estimatedTotalDays: objective.estimatedTotalDays ?? null,
    estimatedDailyHours: objective.estimatedDailyHours ?? null,
    currentDay: objective.currentDay ?? 1,
    completedDays: objective.completedDays ?? 0,
    progressPercentage: objective.progressPercentage ?? 0,
    successCriteria: objective.successCriteria ?? [],
    requiredSkills: objective.requiredSkills ?? [],
    currentSprintId,
    currentSprint: currentSprintPayload ?? null,
    pastSprints,
    progress: {
      sprintsDone,
      sprintsPlanned,
      percent
    },
    totalSprints: sprintsPlanned,
    createdAt: objective.createdAt.toISOString(),
    updatedAt: objective.updatedAt.toISOString(),
    limits: options.limits,
    latestContext,
    contextHistory
  };
}

export function serializeSprint(
  sprint: Sprint & { progresses?: Progress[]; artifacts?: SprintArtifact[] },
  userId: string,
  objective?: Objective | null,
  planOverride?: SprintPlanOverride
): SprintUiPayload {
  const planDetailsFromOutput = extractSprintPlanDetails(sprint.plannerOutput);
  const planDetails = mergePlanDetails(planDetailsFromOutput, planOverride);

  const title = planDetails.title ?? buildFallbackTitle(objective);
  const description = planDetails.description ?? objective?.description ?? '';

  const projects = Array.isArray(planDetails.projects) ? planDetails.projects : [];
  const microTasks = Array.isArray(planDetails.microTasks) ? planDetails.microTasks : [];
  const portfolioCards = Array.isArray(planDetails.portfolioCards) ? planDetails.portfolioCards : [];

  const progressRecord = sprint.progresses?.find((progress) => progress.userId === userId) ?? null;
  const completedTasksFromProgress = countCompletedTasks(progressRecord?.completedTasks);
  const progressEstimate = planDetails.progress ?? {};

  const completedTasks =
    completedTasksFromProgress > 0
      ? completedTasksFromProgress
      : toNumber(progressEstimate.completedTasks, 0);
  const completedDays = toNumber(
    progressEstimate.completedDays,
    calculateCompletedDays(sprint.startedAt ?? null, sprint.completedAt ?? null)
  );
  const scoreEstimate =
    typeof progressEstimate.scoreEstimate === 'number'
      ? progressEstimate.scoreEstimate
      : sprint.score ?? null;

  const artifacts = Array.isArray(sprint.artifacts) ? sprint.artifacts : [];
  const artifactPayloads = artifacts.map(mapSprintArtifact);
  const selfEvaluation = buildSelfEvaluationPayload(sprint);
  const review = buildReviewPayload(sprint, planDetails.metadata);

  return {
    id: sprint.id,
    objectiveId: sprint.objectiveId,
    title,
    description,
    lengthDays: planOverride?.lengthDays ?? sprint.lengthDays,
    totalEstimatedHours: planOverride?.totalEstimatedHours ?? sprint.totalEstimatedHours,
    difficulty: planOverride?.difficulty ?? sprint.difficulty,
    status: sprint.status,
    projects,
    microTasks,
    portfolioCards,
    adaptationNotes: planDetails.adaptationNotes ?? null,
    progress: {
      completedTasks,
      completedDays,
      scoreEstimate
    },
    startedAt: sprint.startedAt ? sprint.startedAt.toISOString() : null,
    completedAt: sprint.completedAt ? sprint.completedAt.toISOString() : null,
    score: sprint.score ?? null,
    metadata: cloneMetadata(planDetails.metadata),
    adaptiveMetadata: extractAdaptiveMetadata(sprint, planDetails),
    evidence: {
      artifacts: artifactPayloads,
      selfEvaluation
    },
    review
  };
}

function extractAdaptiveMetadata(
  sprint: Sprint,
  planDetails: SprintPlanDetails
): Record<string, unknown> | null {
  const fromSprint = resolveAdaptiveRecord(sprint.adaptiveMetadata);
  if (fromSprint) {
    return fromSprint;
  }

  const fromPlan = resolveAdaptiveRecord(planDetails.adaptiveMetadata);
  if (fromPlan) {
    return fromPlan;
  }

  const fromMetadata = resolveAdaptiveRecord(planDetails.metadata);
  if (fromMetadata) {
    const nested = (planDetails.metadata as Record<string, unknown>).adaptiveMetadata;
    return resolveAdaptiveRecord(nested) ?? fromMetadata;
  }

  return null;
}

function resolveAdaptiveRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return cloneMetadata(value as Record<string, unknown>);
  }
  return null;
}

function findCurrentSprint(sprints: Sprint[]): Sprint | null {
  for (const status of ACTIVE_STATUS_PRIORITY) {
    const match = sprints.find((sprint) => sprint.status === status);
    if (match) {
      return match;
    }
  }
  return sprints[0] ?? null;
}

export function extractSprintPlanDetails(plannerOutput: JsonValue | null | undefined): SprintPlanDetails {

  if (!plannerOutput || typeof plannerOutput !== 'object') {
    return {};
  }

  const raw = plannerOutput as Record<string, unknown>;
  const plan = selectPlanPayload(raw);

  const metadata = extractMetadata(raw, plan);
  const adaptiveMetadata = extractPlanAdaptiveMetadata(raw, plan);

  return {
    title: typeof plan.title === 'string' ? plan.title : undefined,
    description: typeof plan.description === 'string' ? plan.description : undefined,
    projects: Array.isArray(plan.projects) ? plan.projects : undefined,
    microTasks: Array.isArray(plan.microTasks) ? plan.microTasks : undefined,
    portfolioCards: Array.isArray(plan.portfolioCards) ? plan.portfolioCards : undefined,
    adaptationNotes: typeof plan.adaptationNotes === 'string' ? plan.adaptationNotes : undefined,
    progress: isRecord(plan.progress) ? (plan.progress as SprintPlanDetails['progress']) : undefined,
    metadata,
    adaptiveMetadata
  };
}

function mergePlanDetails(
  details: SprintPlanDetails,
  override?: SprintPlanOverride
): SprintPlanDetails & SprintPlanOverride {
  if (!override) {
    return details;
  }

  return {
    title: override.title ?? details.title,
    description: override.description ?? details.description,
    projects: override.projects ?? details.projects,
    microTasks: override.microTasks ?? details.microTasks,
    portfolioCards: override.portfolioCards ?? details.portfolioCards,
    adaptationNotes: override.adaptationNotes ?? details.adaptationNotes,
    progress: override.progress ?? details.progress,
    metadata: override.metadata ?? details.metadata,
    adaptiveMetadata: override.adaptiveMetadata ?? details.adaptiveMetadata,
    lengthDays: override.lengthDays,
    totalEstimatedHours: override.totalEstimatedHours,
    difficulty: override.difficulty
  };
}

function selectPlanPayload(raw: Record<string, unknown>): Record<string, unknown> {
  const candidate = raw.plan;
  if (candidate && typeof candidate === 'object') {
    return candidate as Record<string, unknown>;
  }
  return raw;
}

function extractMetadata(
  raw: Record<string, unknown>,
  plan: Record<string, unknown>
): Record<string, unknown> | null {
  const metadataSource = raw.metadata ?? plan.metadata;
  if (!metadataSource || typeof metadataSource !== 'object') {
    return null;
  }
  return cloneMetadata(metadataSource as Record<string, unknown>);
}

function extractPlanAdaptiveMetadata(
  raw: Record<string, unknown>,
  plan: Record<string, unknown>
): Record<string, unknown> | null {
  const candidates = [raw.adaptiveMetadata, plan.adaptiveMetadata];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
      return cloneMetadata(candidate as Record<string, unknown>);
    }
  }

  const metadata = raw.metadata ?? plan.metadata;
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    const nested = (metadata as Record<string, unknown>).adaptiveMetadata;
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      return cloneMetadata(nested as Record<string, unknown>);
    }
  }

  return null;
}

function cloneMetadata(metadata?: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!metadata) {
    return null;
  }
  try {
    return JSON.parse(JSON.stringify(metadata));
  } catch (error) {
    console.warn('[objectiveSerializer] Failed to clone metadata payload', error);
    return { ...metadata };
  }
}

function countCompletedTasks(tasks: JsonValue | undefined): number {
  if (!tasks) {
    return 0;
  }
  if (Array.isArray(tasks)) {
    return tasks.length;
  }
  if (typeof tasks === 'object' && tasks !== null) {
    const record = tasks as Record<string, unknown>;
    if (Array.isArray(record.tasks)) {
      return record.tasks.length;
    }
  }
  return 0;
}

function calculateCompletedDays(startedAt: Date | null, completedAt: Date | null): number {
  if (!startedAt || !completedAt) {
    return 0;
  }
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const diff = completedAt.getTime() - startedAt.getTime();
  if (diff <= 0) {
    return 0;
  }
  return Math.max(1, Math.round(diff / millisecondsPerDay));
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function buildFallbackTitle(objective?: Objective | null): string {
  if (!objective) {
    return 'Sprint';
  }
  return `${objective.title} — Sprint`;
}

function mapSprintArtifact(artifact: SprintArtifact): SprintArtifactPayload {
  return {
    artifactId: artifact.artifactId,
    projectId: artifact.projectId,
    type: artifact.type,
    status: artifact.status,
    title: artifact.title ?? null,
    url: artifact.url ?? null,
    notes: artifact.notes ?? null,
    updatedAt: artifact.updatedAt.toISOString()
  };
}

function buildSelfEvaluationPayload(
  sprint: Sprint
): { confidence?: number | null; reflection?: string | null } | null {
  const payload: { confidence?: number | null; reflection?: string | null } = {};

  if (typeof sprint.selfEvaluationConfidence === 'number' && !Number.isNaN(sprint.selfEvaluationConfidence)) {
    payload.confidence = sprint.selfEvaluationConfidence;
  }

  if (typeof sprint.selfEvaluationReflection === 'string' && sprint.selfEvaluationReflection.trim().length > 0) {
    payload.reflection = sprint.selfEvaluationReflection;
  }

  return Object.keys(payload).length > 0 ? payload : null;
}

function buildReviewPayload(
  sprint: Sprint,
  plannerMetadata: Record<string, unknown> | null | undefined
): SprintReviewPayload {
  const parsed = normalizeReviewerSummary(sprint.reviewerSummary);

  if (!parsed) {
    const status = sprint.status === SprintStatus.submitted ? 'pending' : 'not_requested';
    return {
      status,
      reviewedAt: null,
      score: sprint.score ?? null,
      summary: null,
      projectSummaries: [],
      metadata: plannerMetadata ? cloneMetadata(plannerMetadata) : null
    };
  }

  return {
    status: 'completed',
    reviewedAt: parsed.reviewedAt ?? sprint.completedAt?.toISOString() ?? null,
    score: parsed.overall?.score ?? sprint.score ?? null,
    summary: parsed.overall ?? null,
    projectSummaries: parsed.projects,
    metadata: parsed.metadata
  };
}

interface NormalizedReviewerSummary {
  reviewedAt: string | null;
  overall: SprintReviewSummaryPayload | null;
  projects: SprintReviewProjectPayload[];
  metadata: Record<string, unknown> | null;
}

function normalizeReviewerSummary(value: JsonValue | null | undefined): NormalizedReviewerSummary | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Record<string, unknown>;
  const reviewedAt = typeof record.reviewedAt === 'string' ? record.reviewedAt : null;
  const metadata = isRecord(record.metadata) ? cloneMetadata(record.metadata as Record<string, unknown>) : null;

  const overall = isRecord(record.overall) ? toReviewSummary(record.overall as Record<string, unknown>) : null;

  const projectsRaw = Array.isArray(record.projects) ? (record.projects as Record<string, unknown>[]) : [];
  const projects = projectsRaw
    .map((item) => toReviewProject(item))
    .filter((item): item is SprintReviewProjectPayload => Boolean(item));

  return {
    reviewedAt,
    overall,
    projects,
    metadata
  };
}

function toReviewProject(value: Record<string, unknown>): SprintReviewProjectPayload | null {
  if (typeof value.projectId !== 'string' || !isRecord(value.review)) {
    return null;
  }

  const review = toReviewSummary(value.review as Record<string, unknown>);
  if (!review) {
    return null;
  }

  const projectTitle = typeof value.projectTitle === 'string' ? value.projectTitle : undefined;

  return {
    projectId: value.projectId,
    projectTitle,
    review
  };
}

function toReviewSummary(value: Record<string, unknown>): SprintReviewSummaryPayload | null {
  const score = typeof value.score === 'number' && !Number.isNaN(value.score) ? clamp(value.score, 0, 1) : null;
  const pass = typeof value.pass === 'boolean' ? value.pass : null;
  const achieved = Array.isArray(value.achieved) ? value.achieved.filter((item) => typeof item === 'string') : [];
  const missing = Array.isArray(value.missing) ? value.missing.filter((item) => typeof item === 'string') : [];
  const nextRecommendations = Array.isArray(value.nextRecommendations)
    ? value.nextRecommendations.filter((item) => typeof item === 'string')
    : [];

  if (score === null || pass === null) {
    return null;
  }

  return {
    score,
    pass,
    achieved,
    missing,
    nextRecommendations
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

