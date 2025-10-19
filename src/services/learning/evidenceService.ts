import { Prisma } from '@prisma/client';
import { sprintArtifactRepository, SprintArtifactUpsertInput } from '../../repositories/sprintArtifactRepository.js';
import { ArtifactStatus, ArtifactType, SprintArtifact } from '../../types/prisma';

export interface SubmittedArtifactInput {
  artifactId: string;
  projectId: string;
  type: ArtifactType;
  title?: string | null;
  url?: string | null;
  status?: ArtifactStatus | null;
  notes?: string | null;
  metadata?: Prisma.JsonValue | null;
}

class EvidenceService {
  async upsertArtifacts(sprintId: string, artifacts: SubmittedArtifactInput[]): Promise<SprintArtifact[]> {
    const sanitized = artifacts.map((artifact) => this.normalizeArtifactInput(sprintId, artifact));

    const results: SprintArtifact[] = [];
    for (const entry of sanitized) {
      const record = await sprintArtifactRepository.upsert(entry);
      results.push(record);
    }

    return results;
  }

  async listArtifacts(sprintId: string): Promise<SprintArtifact[]> {
    return sprintArtifactRepository.listForSprint(sprintId);
  }

  private normalizeArtifactInput(
    sprintId: string,
    artifact: SubmittedArtifactInput
  ): SprintArtifactUpsertInput {
    const status = this.resolveStatus(artifact.status, artifact.url);

    return {
      sprintId,
      artifactId: artifact.artifactId,
      projectId: artifact.projectId,
      type: artifact.type,
      title: artifact.title ?? null,
      url: artifact.url ?? null,
      status,
      notes: artifact.notes ?? null,
      metadata: artifact.metadata ?? null
    };
  }

  private resolveStatus(status: ArtifactStatus | null | undefined, url?: string | null): ArtifactStatus {
    if (status && Object.values(ArtifactStatus).includes(status)) {
      return status;
    }

    if (url && url.trim().length > 0) {
      return ArtifactStatus.ok;
    }

    return ArtifactStatus.missing;
  }
}

export const evidenceService = new EvidenceService();
