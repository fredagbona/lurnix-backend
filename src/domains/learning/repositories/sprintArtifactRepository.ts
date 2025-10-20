import { Prisma } from '@prisma/client';
import { db } from '../../../prisma/prismaWrapper';
import { ArtifactStatus, ArtifactType, SprintArtifact } from '@prisma/client';

export interface SprintArtifactUpsertInput {
  sprintId: string;
  projectId: string;
  artifactId: string;
  type: ArtifactType;
  title?: string | null;
  url?: string | null;
  status?: ArtifactStatus;
  notes?: string | null;
  metadata?: Prisma.JsonValue | null;
}

export class SprintArtifactRepository {
  async upsert(input: SprintArtifactUpsertInput): Promise<SprintArtifact> {
    const record = await db.sprintArtifact.upsert({
      where: {
        sprintId_artifactId: {
          sprintId: input.sprintId,
          artifactId: input.artifactId
        }
      },
      update: {
        projectId: input.projectId,
        type: input.type,
        title: input.title ?? null,
        url: input.url ?? null,
        status: input.status ?? ArtifactStatus.unknown,
        notes: input.notes ?? null,
        metadata: input.metadata ?? Prisma.JsonNull
      },
      create: {
        sprintId: input.sprintId,
        projectId: input.projectId,
        artifactId: input.artifactId,
        type: input.type,
        title: input.title ?? null,
        url: input.url ?? null,
        status: input.status ?? ArtifactStatus.unknown,
        notes: input.notes ?? null,
        metadata: input.metadata ?? Prisma.JsonNull
      }
    });

    return record as SprintArtifact;
  }

  async listForSprint(sprintId: string): Promise<SprintArtifact[]> {
    const records = await db.sprintArtifact.findMany({
      where: { sprintId },
      orderBy: { createdAt: 'asc' }
    });

    return records as SprintArtifact[];
  }

  async listForSprintProjects(sprintId: string, projectIds: string[]): Promise<SprintArtifact[]> {
    if (projectIds.length === 0) {
      return [];
    }

    const records = await db.sprintArtifact.findMany({
      where: {
        sprintId,
        projectId: { in: projectIds }
      },
      orderBy: { createdAt: 'asc' }
    });

    return records as SprintArtifact[];
  }
}

export const sprintArtifactRepository = new SprintArtifactRepository();
