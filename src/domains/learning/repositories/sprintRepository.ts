import { Prisma } from '@prisma/client';
import { db } from '../../../prisma/prismaWrapper';
import { Sprint, SprintDifficulty, SprintStatus } from '@prisma/client';

export interface SprintCreateInput {
  objectiveId: string;
  profileSnapshotId?: string | null;
  plannerInput: Prisma.JsonValue;
  plannerOutput: Prisma.JsonValue;
  adaptiveMetadata?: Prisma.JsonValue | null;
  lengthDays: number;
  totalEstimatedHours: number;
  difficulty?: SprintDifficulty;
  status?: SprintStatus;
  dayNumber?: number;
  startedAt?: Date | null;
  completedAt?: Date | null;
  score?: number | null;
  reviewerSummary?: Prisma.JsonValue | null;
  selfEvaluationConfidence?: number | null;
  selfEvaluationReflection?: string | null;
}

export interface SprintUpdateInput {
  plannerInput?: Prisma.JsonValue;
  plannerOutput?: Prisma.JsonValue;
  adaptiveMetadata?: Prisma.JsonValue | null;
  status?: SprintStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  score?: number | null;
  reviewerSummary?: Prisma.JsonValue | null;
  totalEstimatedHours?: number;
  lengthDays?: number;
  difficulty?: SprintDifficulty;
  selfEvaluationConfidence?: number | null;
  selfEvaluationReflection?: string | null;
  dayNumber?: number;
  completionPercentage?: number;
}

export class SprintRepository {
  async create(input: SprintCreateInput): Promise<Sprint> {
    const sprint = await db.sprint.create({
      data: {
        objectiveId: input.objectiveId,
        profileSnapshotId: input.profileSnapshotId ?? null,
        plannerInput: input.plannerInput,
        plannerOutput: input.plannerOutput,
        adaptiveMetadata: input.adaptiveMetadata ?? null,
        lengthDays: input.lengthDays,
        totalEstimatedHours: input.totalEstimatedHours,
        difficulty: input.difficulty ?? SprintDifficulty.beginner,
        status: input.status ?? SprintStatus.planned,
        dayNumber: input.dayNumber ?? 1,
        startedAt: input.startedAt ?? null,
        completedAt: input.completedAt ?? null,
        score: input.score ?? null,
        reviewerSummary: input.reviewerSummary ?? null,
        selfEvaluationConfidence: input.selfEvaluationConfidence ?? null,
        selfEvaluationReflection: input.selfEvaluationReflection ?? null
      }
    });

    return sprint as Sprint;
  }

  async update(sprintId: string, updates: SprintUpdateInput): Promise<Sprint> {
    const sprint = await db.sprint.update({
      where: { id: sprintId },
      data: updates
    });

    return sprint as Sprint;
  }

  async getById(sprintId: string): Promise<Sprint | null> {
    const sprint = await db.sprint.findUnique({ where: { id: sprintId } });
    return (sprint ?? null) as Sprint | null;
  }

  async getLatestForObjective(objectiveId: string): Promise<Sprint | null> {
    const sprint = await db.sprint.findFirst({
      where: { objectiveId },
      orderBy: { createdAt: 'desc' }
    });
    return (sprint ?? null) as Sprint | null;
  }

  async listForObjective(objectiveId: string): Promise<Sprint[]> {
    const sprints = await db.sprint.findMany({
      where: { objectiveId },
      orderBy: { createdAt: 'desc' }
    });
    return sprints as Sprint[];
  }
}

export const sprintRepository = new SprintRepository();
