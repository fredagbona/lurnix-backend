import { Prisma } from '@prisma/client';
import { prisma } from '../../../prisma/client.js';
import type {
  CreateFeatureRequestInput,
  CreateModNoteInput,
  DuplicateCheckCandidate,
  FeatureListFilters,
  FeatureListSort,
  FeatureModNoteWithAuthor,
  FeatureRequestRecord,
  FeatureStatusChangeRecord,
  FeatureStatusChangeWithActor,
  FeatureVoteRecord,
  MergeFeatureRequestsInput,
  RecordStatusChangeInput,
  ToggleVoteResult,
  UpdateFeatureRequestInput,
} from '../types/featureRequests.js';
import type { FeatureStatus } from '../../../prisma/prismaTypes.js';

export class FeatureRequestRepositoryError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'FeatureRequestRepositoryError';
  }
}

export class FeatureRequestNotFoundError extends FeatureRequestRepositoryError {
  constructor(featureId: bigint) {
    super(`Feature request ${featureId.toString()} not found`);
    this.name = 'FeatureRequestNotFoundError';
  }
}

export class DuplicateFeatureRequestTitleError extends FeatureRequestRepositoryError {
  constructor(title: string) {
    super(`Feature request with title "${title}" already exists`);
    this.name = 'DuplicateFeatureRequestTitleError';
  }
}

export class FeatureVoteConflictError extends FeatureRequestRepositoryError {}

interface ToggleVoteInput {
  featureId: bigint;
  userId: string;
}

interface VoteLookup {
  hasVoted: boolean;
  votesCount: number;
}

export interface FeatureListResult {
  items: FeatureRequestRecord[];
  nextCursor?: bigint;
}

export class FeatureRequestRepository {
  async create(data: CreateFeatureRequestInput): Promise<FeatureRequestRecord> {
    try {
      return await prisma.featureRequest.create({
        data: {
          authorId: data.authorId,
          title: data.title.trim(),
          description: data.description.trim(),
          category: data.category,
          tags: data.tags ?? [],
          locale: data.locale ?? 'en',
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new DuplicateFeatureRequestTitleError(data.title);
      }
      throw new FeatureRequestRepositoryError('Failed to create feature request', error);
    }
  }

  async update(id: bigint, data: UpdateFeatureRequestInput): Promise<FeatureRequestRecord> {
    try {
      return await prisma.featureRequest.update({
        where: { id },
        data: {
          title: data.title?.trim(),
          description: data.description?.trim(),
          category: data.category,
          status: data.status,
          tags: data.tags,
          mergedIntoId: data.mergedIntoId ?? undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new FeatureRequestNotFoundError(id);
        }
        if (error.code === 'P2002' && data.title) {
          throw new DuplicateFeatureRequestTitleError(data.title);
        }
      }
      throw new FeatureRequestRepositoryError('Failed to update feature request', error);
    }
  }

  async softDelete(id: bigint, deletedAt: Date = new Date()): Promise<void> {
    try {
      await prisma.featureRequest.update({
        where: { id },
        data: { deletedAt },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new FeatureRequestNotFoundError(id);
      }
      throw new FeatureRequestRepositoryError('Failed to delete feature request', error);
    }
  }

  async findById(id: bigint): Promise<FeatureRequestRecord | null> {
    return prisma.featureRequest.findUnique({ where: { id } });
  }

  async findWithDetails(id: bigint): Promise<(FeatureRequestRecord & {
    author: { id: string; username: string; fullname: string };
    statusHistory: FeatureStatusChangeWithActor[];
    modNotes: FeatureModNoteWithAuthor[];
  }) | null> {
    return prisma.featureRequest.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true, username: true, fullname: true },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
          include: {
            changedByUser: {
              select: { id: true, username: true, fullname: true },
            },
            changedByAdmin: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        modNotes: {
          orderBy: { createdAt: 'desc' },
          include: {
            authorAdmin: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });
  }

  async list(
    filters: FeatureListFilters = {},
    sort: FeatureListSort = 'top',
    limit = 20
  ): Promise<FeatureListResult> {
    const take = Math.min(Math.max(limit, 1), 100);

    const where: Prisma.FeatureRequestWhereInput = {
      deletedAt: null,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.category) {
      where.category = filters.category;
    }

    if (filters.authorId) {
      where.authorId = filters.authorId;
    }

    if (filters.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    if (filters.searchQuery) {
      const search = filters.searchQuery.trim();
      if (search.length > 2) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }
    }

    const orderBy: Prisma.FeatureRequestOrderByWithRelationInput[] = [];

    if (sort === 'new') {
      orderBy.push({ createdAt: 'desc' });
    } else if (sort === 'trending') {
      orderBy.push({
        votesCount: 'desc',
      });
      orderBy.push({ createdAt: 'desc' });
    } else {
      orderBy.push({ votesCount: 'desc' });
      orderBy.push({ createdAt: 'desc' });
    }

    orderBy.push({ id: 'desc' });

    const items = await prisma.featureRequest.findMany({
      where,
      orderBy,
      take: take + 1,
      ...(filters.cursor
        ? {
            cursor: { id: filters.cursor },
            skip: 1,
          }
        : {}),
    });

    if (items.length === 0) {
      return { items: [] };
    }

    let nextCursor: bigint | undefined;
    if (items.length > take) {
      const nextItem = items.pop();
      nextCursor = nextItem?.id;
    }

    return { items, nextCursor };
  }

  async toggleVote({ featureId, userId }: ToggleVoteInput): Promise<ToggleVoteResult> {
    try {
      return await prisma.$transaction(async tx => {
        const existing = await tx.featureVote.findUnique({
          where: {
            userId_featureId: {
              userId,
              featureId,
            },
          },
        });

        if (existing) {
          await tx.featureVote.delete({
            where: {
              userId_featureId: {
                userId,
                featureId,
              },
            },
          });

          const updated = await this.recalculateVotesCount(tx, featureId);
          return { voted: false, votesCount: updated.votesCount };
        }

        await tx.featureVote.create({
          data: {
            featureId,
            userId,
          },
        });

        const updated = await this.recalculateVotesCount(tx, featureId);
        return { voted: true, votesCount: updated.votesCount };
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new FeatureRequestNotFoundError(featureId);
      }
      throw new FeatureRequestRepositoryError('Failed to toggle vote', error);
    }
  }

  async countUserRequestsSince(authorId: string, since: Date): Promise<number> {
    return prisma.featureRequest.count({
      where: {
        authorId,
        createdAt: {
          gte: since,
        },
        deletedAt: null,
      },
    });
  }

  async findUserVotesForFeatures(userId: string, featureIds: bigint[]): Promise<FeatureVoteRecord[]> {
    if (featureIds.length === 0) {
      return [];
    }

    return prisma.featureVote.findMany({
      where: {
        userId,
        featureId: {
          in: featureIds,
        },
      },
    });
  }

  async hasUserVoted(featureId: bigint, userId: string): Promise<boolean> {
    const vote = await prisma.featureVote.findUnique({
      where: {
        userId_featureId: {
          userId,
          featureId,
        },
      },
      select: { userId: true },
    });

    return !!vote;
  }

  async findVotesByFeature(featureId: bigint): Promise<FeatureVoteRecord[]> {
    return prisma.featureVote.findMany({ where: { featureId } });
  }

  async recordStatusChange(input: RecordStatusChangeInput): Promise<FeatureStatusChangeRecord> {
    if (!input.changedByUserId && !input.changedByAdminId) {
      throw new FeatureRequestRepositoryError('Status change requires an actor');
    }

    try {
      const result = await prisma.$transaction(async tx => {
        const feature = await tx.featureRequest.findUnique({
          where: { id: input.featureId },
          select: { status: true },
        });

        if (!feature) {
          throw new FeatureRequestNotFoundError(input.featureId);
        }

        if (feature.status !== input.newStatus) {
          await tx.featureRequest.update({
            where: { id: input.featureId },
            data: { status: input.newStatus },
          });
        }

        return tx.featureStatusChange.create({
          data: {
            featureId: input.featureId,
            oldStatus: input.oldStatus ?? feature.status,
            newStatus: input.newStatus,
            changedByUserId: input.changedByUserId ?? null,
            changedByAdminId: input.changedByAdminId ?? null,
            note: input.note,
          },
        });
      });

      return result;
    } catch (error) {
      if (error instanceof FeatureRequestNotFoundError) {
        throw error;
      }
      throw new FeatureRequestRepositoryError('Failed to record status change', error);
    }
  }

  async createModNote(data: CreateModNoteInput): Promise<FeatureModNoteWithAuthor> {
    if (!data.authorAdminId) {
      throw new FeatureRequestRepositoryError('Moderator note requires an admin author');
    }

    try {
      return await prisma.featureModNote.create({
        data: {
          featureId: data.featureId,
          authorAdminId: data.authorAdminId,
          note: data.note.trim(),
        },
        include: {
          authorAdmin: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new FeatureRequestNotFoundError(data.featureId);
      }
      throw new FeatureRequestRepositoryError('Failed to create moderator note', error);
    }
  }

  async mergeFeatureRequests(input: MergeFeatureRequestsInput): Promise<void> {
    if (input.sourceId === input.targetId) {
      throw new FeatureRequestRepositoryError('Cannot merge a feature into itself');
    }

    try {
      await prisma.$transaction(async tx => {
        const source = await tx.featureRequest.findUnique({
          where: { id: input.sourceId },
          select: { id: true, status: true },
        });
        const target = await tx.featureRequest.findUnique({
          where: { id: input.targetId },
          select: { id: true },
        });

        if (!source) {
          throw new FeatureRequestNotFoundError(input.sourceId);
        }
        if (!target) {
          throw new FeatureRequestNotFoundError(input.targetId);
        }

        await tx.$executeRaw`
          INSERT INTO "feature_votes" (user_id, feature_id, created_at)
          SELECT user_id, ${input.targetId}, created_at
          FROM "feature_votes"
          WHERE feature_id = ${input.sourceId}
          ON CONFLICT (user_id, feature_id) DO NOTHING
        `;

        await tx.featureVote.deleteMany({ where: { featureId: input.sourceId } });

        const targetVotes = await tx.featureVote.count({ where: { featureId: input.targetId } });

        await tx.featureRequest.update({
          where: { id: input.targetId },
          data: {
            votesCount: targetVotes,
          },
        });

        const closeStatus: FeatureStatus = input.closeWithStatus ?? 'declined';

        await tx.featureRequest.update({
          where: { id: input.sourceId },
          data: {
            votesCount: 0,
            status: closeStatus,
            mergedIntoId: input.targetId,
          },
        });

        if (!input.mergedByUserId && !input.mergedByAdminId) {
          throw new FeatureRequestRepositoryError('Merge requires an actor');
        }

        await tx.featureStatusChange.create({
          data: {
            featureId: input.sourceId,
            oldStatus: source.status,
            newStatus: closeStatus,
            changedByUserId: input.mergedByUserId ?? null,
            changedByAdminId: input.mergedByAdminId ?? null,
            note: `Merged into feature ${input.targetId.toString()}`,
          },
        });
      });
    } catch (error) {
      if (error instanceof FeatureRequestRepositoryError || error instanceof FeatureRequestNotFoundError) {
        throw error;
      }
      throw new FeatureRequestRepositoryError('Failed to merge feature requests', error);
    }
  }

  async findDuplicateCandidates(
    title: string,
    threshold = 0.55,
    limit = 5
  ): Promise<DuplicateCheckCandidate[]> {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      return [];
    }

    const candidates = await prisma.$queryRaw<{
      id: bigint;
      title: string;
      status: FeatureStatus;
      votes_count: number;
      created_at: Date;
      similarity: number;
    }[]>(Prisma.sql`
      SELECT
        fr.id,
        fr.title,
        fr.status,
        fr.votes_count,
        fr.created_at,
        similarity(fr.title, ${normalizedTitle}) AS similarity
      FROM feature_requests fr
      WHERE fr.deleted_at IS NULL
        AND fr.status IN ('open', 'under_review')
        AND similarity(fr.title, ${normalizedTitle}) >= ${threshold}
      ORDER BY similarity DESC, fr.votes_count DESC
      LIMIT ${limit}
    `);

    return candidates.map(candidate => ({
      id: candidate.id,
      title: candidate.title,
      status: candidate.status,
      votesCount: Number(candidate.votes_count),
      createdAt: candidate.created_at,
      similarity: Number(candidate.similarity),
    }));
  }

  private async recalculateVotesCount(
    tx: Prisma.TransactionClient,
    featureId: bigint
  ): Promise<FeatureRequestRecord> {
    const totalVotes = await tx.featureVote.count({ where: { featureId } });

    return tx.featureRequest.update({
      where: { id: featureId },
      data: {
        votesCount: totalVotes,
      },
    });
  }
}

export const featureRequestRepository = new FeatureRequestRepository();
