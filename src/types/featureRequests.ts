import type {
  FeatureRequest as PrismaFeatureRequest,
  FeatureVote as PrismaFeatureVote,
  FeatureStatusChange as PrismaFeatureStatusChange,
  FeatureModNote as PrismaFeatureModNote,
} from '@prisma/client';
import type { FeatureCategory, FeatureStatus, Language } from '../prisma/prismaTypes.js';

export type FeatureRequestRecord = PrismaFeatureRequest;
export type FeatureVoteRecord = PrismaFeatureVote;
export type FeatureStatusChangeRecord = PrismaFeatureStatusChange;
export type FeatureModNoteRecord = PrismaFeatureModNote;

export type FeatureListSort = 'top' | 'new' | 'trending';

export interface FeatureListFilters {
  status?: FeatureStatus;
  category?: FeatureCategory;
  searchQuery?: string;
  cursor?: bigint;
  limit?: number;
  tags?: string[];
  authorId?: string;
}

export interface DuplicateCheckCandidate {
  id: bigint;
  title: string;
  similarity: number;
  status: FeatureStatus;
  votesCount: number;
  createdAt: Date;
}

export interface CreateFeatureRequestInput {
  authorId: string;
  title: string;
  description: string;
  category: FeatureCategory;
  tags?: string[];
  locale?: Language;
}

export interface UpdateFeatureRequestInput {
  title?: string;
  description?: string;
  category?: FeatureCategory;
  status?: FeatureStatus;
  tags?: string[];
  mergedIntoId?: bigint | null;
}

export interface ToggleVoteResult {
  voted: boolean;
  votesCount: number;
}

export interface RecordStatusChangeInput {
  featureId: bigint;
  oldStatus: FeatureStatus | null;
  newStatus: FeatureStatus;
  changedById: string;
  note?: string;
}

export interface CreateModNoteInput {
  featureId: bigint;
  authorId: string;
  note: string;
}

export interface MergeFeatureRequestsInput {
  sourceId: bigint;
  targetId: bigint;
  mergedById: string;
  closeWithStatus?: FeatureStatus;
}
