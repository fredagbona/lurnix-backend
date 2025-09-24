import { Prisma } from '@prisma/client';
import {
  Objective,
  Progress,
  Sprint,
  SprintDifficulty,
  SprintStatus,
  LearnerProfile
} from '../types/prisma';
import type { ObjectiveSprintLimitPayload } from '../types/planLimits.js';

type JsonValue = Prisma.JsonValue;

export interface SprintProgressPayload {
  completedTasks: number;
  completedDays: number;
  scoreEstimate: number | null;
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
}

export interface ObjectiveWithRelations extends Objective {
  sprints: (Sprint & { progresses?: Progress[] })[];
  profileSnapshot?: LearnerProfile | null;
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
    limits: options.limits
  };
}

export function serializeSprint(
  sprint: Sprint & { progresses?: Progress[] },
  userId: string,
  objective?: Objective | null,
  planOverride?: SprintPlanOverride
): SprintUiPayload {
  const planDetailsFromOutput = extractPlanDetails(sprint.plannerOutput);
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
    metadata: cloneMetadata(planDetails.metadata)
  };
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

function extractPlanDetails(plannerOutput: JsonValue | null | undefined): SprintPlanDetails {
  if (!plannerOutput || typeof plannerOutput !== 'object') {
    return {};
  }

  const raw = plannerOutput as Record<string, unknown>;
  const plan = selectPlanPayload(raw);

  const metadata = extractMetadata(raw, plan);

  return {
    title: typeof plan.title === 'string' ? plan.title : undefined,
    description: typeof plan.description === 'string' ? plan.description : undefined,
    projects: Array.isArray(plan.projects) ? plan.projects : undefined,
    microTasks: Array.isArray(plan.microTasks) ? plan.microTasks : undefined,
    portfolioCards: Array.isArray(plan.portfolioCards) ? plan.portfolioCards : undefined,
    adaptationNotes: typeof plan.adaptationNotes === 'string' ? plan.adaptationNotes : undefined,
    progress: isRecord(plan.progress) ? (plan.progress as SprintPlanDetails['progress']) : undefined,
    metadata
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
