import { Prisma } from '@prisma/client';
import { sprintRepository, SprintCreateInput, SprintUpdateInput } from '../repositories/sprintRepository.js';
import { Sprint, SprintDifficulty, SprintStatus } from '@prisma/client';

export class SprintService {
  async createSprint(input: SprintCreateInput): Promise<Sprint> {
    return sprintRepository.create(input);
  }

  async updateSprint(sprintId: string, updates: SprintUpdateInput): Promise<Sprint> {
    return sprintRepository.update(sprintId, updates);
  }

  async markSprintStatus(
    sprintId: string,
    status: SprintStatus,
    options: { completedAt?: Date | null; score?: number | null; reviewerSummary?: Prisma.JsonValue | null } = {}
  ): Promise<Sprint> {
    return sprintRepository.update(sprintId, {
      status,
      completedAt: options.completedAt ?? null,
      score: options.score ?? null,
      reviewerSummary: options.reviewerSummary ?? null
    });
  }

  async getSprintById(sprintId: string): Promise<Sprint | null> {
    return sprintRepository.getById(sprintId);
  }

  async getLatestSprintForObjective(objectiveId: string): Promise<Sprint | null> {
    return sprintRepository.getLatestForObjective(objectiveId);
  }

  async listSprintsForObjective(objectiveId: string): Promise<Sprint[]> {
    return sprintRepository.listForObjective(objectiveId);
  }
}

export const sprintService = new SprintService();
