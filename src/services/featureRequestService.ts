import { FeatureCategory, FeatureStatus } from '@prisma/client';
import { config } from '../config/environment.js';
import {
  featureRequestRepository,
  FeatureRequestNotFoundError,
  DuplicateFeatureRequestTitleError,
  FeatureRequestRepositoryError,
} from '../repositories/featureRequestRepository.js';
import type {
  FeatureRequestRecord,
  FeatureStatusChangeWithActor,
  FeatureModNoteWithAuthor,
  FeatureListFilters,
  FeatureListSort,
  DuplicateCheckCandidate,
  CreateFeatureRequestInput,
  UpdateFeatureRequestInput,
  MergeFeatureRequestsInput,
  CreateModNoteInput,
} from '../types/featureRequests.js';

export interface FeatureCardDto {
  id: string;
  title: string;
  excerpt: string;
  category: FeatureCategory;
  status: FeatureStatus;
  votesCount: number;
  userVoted: boolean;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  mergedIntoId: string | null;
}

export interface FeatureDetailDto extends FeatureCardDto {
  description: string;
  author: {
    id: string;
    username: string;
    fullname: string;
  };
  locale: string;
  statusHistory: FeatureStatusEntryDto[];
}

export interface FeatureAdminDetailDto extends FeatureDetailDto {
  modNotes: FeatureModNoteDto[];
}

export interface FeatureStatusActorDto {
  type: 'user' | 'admin';
  id: string;
  name: string | null;
  username?: string | null;
  email?: string | null;
}

export interface FeatureStatusEntryDto {
  id: string;
  oldStatus: FeatureStatus | null;
  newStatus: FeatureStatus;
  note: string | null;
  changedAt: string;
  changedBy: FeatureStatusActorDto | null;
}

export interface FeatureModNoteDto {
  id: string;
  note: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
}

export interface DuplicateSuggestionDto {
  id: string;
  title: string;
  similarity: number;
  status: FeatureStatus;
  votesCount: number;
  createdAt: string;
}

export interface FeatureListResponse {
  items: FeatureCardDto[];
  nextCursor?: string;
}

export interface CreateFeatureRequestResult {
  feature: FeatureDetailDto;
  duplicates: DuplicateSuggestionDto[];
}

export interface FeatureCategoryDto {
  value: FeatureCategory;
  translationKey: string;
}

export class FeatureRequestRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeatureRequestRateLimitError';
  }
}

export class FeatureRequestService {
  private readonly maxPerWindow = Number.isFinite(config.FEATURE_REQUESTS_MAX_PER_DAY)
    ? Math.max(1, config.FEATURE_REQUESTS_MAX_PER_DAY)
    : 1;

  private readonly windowMs = Number.isFinite(config.FEATURE_REQUESTS_WINDOW_HOURS)
    ? Math.max(1, config.FEATURE_REQUESTS_WINDOW_HOURS) * 60 * 60 * 1000
    : 24 * 60 * 60 * 1000;

  private readonly duplicateThreshold = Number.isFinite(config.FEATURE_REQUEST_DUPLICATE_THRESHOLD)
    ? Math.max(0, Math.min(1, config.FEATURE_REQUEST_DUPLICATE_THRESHOLD))
    : 0.55;

  getCategories(): FeatureCategoryDto[] {
    return Object.values(FeatureCategory).map(value => ({
      value,
      translationKey: `features.categories.${value}`,
    }));
  }

  async listFeatures(
    filters: FeatureListFilters,
    sort: FeatureListSort,
    limit: number,
    currentUserId?: string
  ): Promise<FeatureListResponse> {
    const { items, nextCursor } = await featureRequestRepository.list(filters, sort, limit);

    let userVotes = new Set<string>();
    if (currentUserId) {
      const votes = await featureRequestRepository.findUserVotesForFeatures(
        currentUserId,
        items.map(item => item.id)
      );
      userVotes = new Set(votes.map(vote => vote.featureId.toString()));
    }

    return {
      items: items.map(item => this.toFeatureCard(item, userVotes.has(item.id.toString()))),
      ...(nextCursor ? { nextCursor: nextCursor.toString() } : {}),
    };
  }

  async createFeatureRequest(input: CreateFeatureRequestInput): Promise<CreateFeatureRequestResult> {
    const windowStart = new Date(Date.now() - this.windowMs);
    const recentCount = await featureRequestRepository.countUserRequestsSince(input.authorId, windowStart);

    if (recentCount >= this.maxPerWindow) {
      throw new FeatureRequestRateLimitError('Feature request limit reached for the current window');
    }

    const duplicates = await featureRequestRepository.findDuplicateCandidates(
      input.title,
      this.duplicateThreshold
    );

    const created = await featureRequestRepository.create(input);
    const detailed = await featureRequestRepository.findWithDetails(created.id);

    if (!detailed) {
      throw new FeatureRequestRepositoryError('Failed to load feature request after creation');
    }

    return {
      feature: this.toFeatureDetail(detailed, false),
      duplicates: this.toDuplicateDtos(duplicates),
    };
  }

  async getFeatureRequest(id: bigint, currentUserId?: string): Promise<FeatureDetailDto> {
    const feature = await featureRequestRepository.findWithDetails(id);
    if (!feature) {
      throw new FeatureRequestNotFoundError(id);
    }

    const userVoted = currentUserId
      ? await featureRequestRepository.hasUserVoted(feature.id, currentUserId)
      : false;

    return this.toFeatureDetail(feature, userVoted, 3);
  }

  async getAdminFeatureRequest(id: bigint, currentUserId?: string): Promise<FeatureAdminDetailDto> {
    const feature = await featureRequestRepository.findWithDetails(id);
    if (!feature) {
      throw new FeatureRequestNotFoundError(id);
    }

    const userVoted = currentUserId
      ? await featureRequestRepository.hasUserVoted(feature.id, currentUserId)
      : false;

    return {
      ...this.toFeatureDetail(feature, userVoted),
      modNotes: feature.modNotes.map(note => this.toModNoteDto(note)),
    };
  }

  async toggleVote(featureId: bigint, userId: string) {
    return featureRequestRepository.toggleVote({ featureId, userId });
  }

  async updateFeatureRequest(
    featureId: bigint,
    data: UpdateFeatureRequestInput,
    options: { changedByUserId?: string; changedByAdminId?: string }
  ): Promise<FeatureAdminDetailDto> {
    const existing = await featureRequestRepository.findWithDetails(featureId);
    if (!existing) {
      throw new FeatureRequestNotFoundError(featureId);
    }

    const { status, ...mutableFields } = data;

    const updatePayload: UpdateFeatureRequestInput = {};
    if (typeof mutableFields.title === 'string') {
      updatePayload.title = mutableFields.title;
    }
    if (typeof mutableFields.description === 'string') {
      updatePayload.description = mutableFields.description;
    }
    if (mutableFields.category) {
      updatePayload.category = mutableFields.category;
    }
    if (Array.isArray(mutableFields.tags)) {
      updatePayload.tags = mutableFields.tags;
    }
    if (mutableFields.mergedIntoId !== undefined) {
      updatePayload.mergedIntoId = mutableFields.mergedIntoId;
    }

    if (Object.keys(updatePayload).length > 0) {
      await featureRequestRepository.update(featureId, updatePayload);
    }

    if (status && status !== existing.status) {
      await featureRequestRepository.recordStatusChange({
        featureId,
        oldStatus: existing.status,
        newStatus: status,
        changedByUserId: options.changedByUserId,
        changedByAdminId: options.changedByAdminId,
      });
    }

    const actorId = options.changedByUserId ?? options.changedByAdminId;
    return this.getAdminFeatureRequest(featureId, actorId);
  }

  async mergeFeatureRequests(input: MergeFeatureRequestsInput): Promise<FeatureAdminDetailDto> {
    await featureRequestRepository.mergeFeatureRequests(input);
    const actorId = input.mergedByUserId ?? input.mergedByAdminId;
    return this.getAdminFeatureRequest(input.targetId, actorId);
  }

  async addModeratorNote(input: CreateModNoteInput): Promise<FeatureModNoteDto> {
    const note = await featureRequestRepository.createModNote(input);
    return this.toModNoteDto(note);
  }

  private toFeatureCard(record: FeatureRequestRecord, userVoted: boolean): FeatureCardDto {
    return {
      id: record.id.toString(),
      title: record.title,
      excerpt: this.buildExcerpt(record.description),
      category: record.category,
      status: record.status,
      votesCount: record.votesCount,
      userVoted,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      tags: record.tags ?? [],
      mergedIntoId: record.mergedIntoId ? record.mergedIntoId.toString() : null,
    };
  }

  private toFeatureDetail(
    record: FeatureRequestRecord & {
      author: { id: string; username: string; fullname: string };
      statusHistory: FeatureStatusChangeWithActor[];
      modNotes: FeatureModNoteWithAuthor[];
    },
    userVoted: boolean,
    historyLimit?: number
  ): FeatureDetailDto {
    const history = historyLimit
      ? record.statusHistory.slice(0, historyLimit)
      : record.statusHistory;

    return {
      ...this.toFeatureCard(record, userVoted),
      description: record.description,
      author: record.author,
      locale: record.locale,
      statusHistory: history.map(entry => this.toStatusEntryDto(entry)),
    };
  }

  private toStatusEntryDto(entry: FeatureStatusChangeWithActor): FeatureStatusEntryDto {
    let changedBy: FeatureStatusActorDto | null = null;

    if (entry.changedByUser) {
      changedBy = {
        type: 'user',
        id: entry.changedByUser.id,
        name: entry.changedByUser.fullname,
        username: entry.changedByUser.username,
        email: null,
      };
    } else if (entry.changedByAdmin) {
      changedBy = {
        type: 'admin',
        id: entry.changedByAdmin.id,
        name: entry.changedByAdmin.name,
        email: entry.changedByAdmin.email,
      };
    }

    return {
      id: entry.id.toString(),
      oldStatus: entry.oldStatus ?? null,
      newStatus: entry.newStatus,
      note: entry.note ?? null,
      changedAt: entry.createdAt.toISOString(),
      changedBy,
    };
  }

  private toModNoteDto(note: FeatureModNoteWithAuthor): FeatureModNoteDto {
    return {
      id: note.id.toString(),
      note: note.note,
      author: {
        id: note.authorAdmin.id,
        name: note.authorAdmin.name,
        email: note.authorAdmin.email,
      },
      createdAt: note.createdAt.toISOString(),
    };
  }

  private toDuplicateDtos(candidates: DuplicateCheckCandidate[]): DuplicateSuggestionDto[] {
    return candidates.map(candidate => ({
      id: candidate.id.toString(),
      title: candidate.title,
      similarity: Number(candidate.similarity),
      status: candidate.status,
      votesCount: candidate.votesCount,
      createdAt: candidate.createdAt.toISOString(),
    }));
  }

  private buildExcerpt(description: string, maxLength = 160): string {
    const trimmed = description.trim();
    if (trimmed.length <= maxLength) {
      return trimmed;
    }

    return `${trimmed.slice(0, maxLength - 3).trimEnd()}...`;
  }
}

export const featureRequestService = new FeatureRequestService();
