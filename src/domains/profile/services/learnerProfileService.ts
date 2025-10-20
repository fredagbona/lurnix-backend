import { Prisma } from '@prisma/client';
import {
  learnerProfileRepository,
  LearnerProfileCreateInput,
  LearnerProfileUpdateInput
} from '../repositories/learnerProfileRepository.js';
import { LearnerProfile, LearnerProfileSource } from '@prisma/client';
import {
  computeSnapshotHash,
  emitProfileRefreshRequested,
  emitProfileSnapshotRecorded,
  emitProfileSnapshotUpdated,
  inferTriggerFromSource,
  normalizeSnapshot,
  ProfileEventTrigger
} from '../../../events/profileEvents.js';

export interface RecordLearnerProfileInput extends LearnerProfileCreateInput {}

export interface RecordSnapshotOptions {
  trigger?: ProfileEventTrigger;
  metadata?: Record<string, unknown>;
}

export interface UpdateSnapshotOptions {
  trigger?: ProfileEventTrigger;
  metadata?: Record<string, unknown>;
}

export class LearnerProfileService {
  async recordSnapshot(
    input: RecordLearnerProfileInput,
    options: RecordSnapshotOptions = {}
  ): Promise<LearnerProfile> {
    const snapshot = await learnerProfileRepository.createSnapshot(input);

    const trigger = options.trigger ?? inferTriggerFromSource(snapshot.source);

    await emitProfileSnapshotRecorded({
      learnerProfileId: snapshot.id,
      userId: snapshot.userId,
      source: snapshot.source,
      recordedAt: snapshot.createdAt.toISOString(),
      snapshotHash: computeSnapshotHash(snapshot.rawSnapshot),
      rawSnapshot: normalizeSnapshot(snapshot.rawSnapshot),
      trigger,
      metadata: options.metadata
    });

    await emitProfileRefreshRequested({
      learnerProfileId: snapshot.id,
      userId: snapshot.userId,
      source: snapshot.source,
      trigger,
      reason: 'snapshot-recorded',
      metadata: options.metadata
    });

    return snapshot;
  }

  async updateSnapshot(
    profileId: string,
    updates: LearnerProfileUpdateInput,
    options: UpdateSnapshotOptions = {}
  ): Promise<LearnerProfile> {
    const snapshot = await learnerProfileRepository.updateProfile(profileId, updates);

    const trigger = options.trigger ?? inferTriggerFromSource(snapshot.source);

    await emitProfileSnapshotUpdated({
      learnerProfileId: snapshot.id,
      userId: snapshot.userId,
      source: snapshot.source,
      updatedAt: snapshot.updatedAt.toISOString(),
      snapshotHash: computeSnapshotHash(snapshot.rawSnapshot),
      rawSnapshot: normalizeSnapshot(snapshot.rawSnapshot),
      trigger,
      metadata: options.metadata
    });

    await emitProfileRefreshRequested({
      learnerProfileId: snapshot.id,
      userId: snapshot.userId,
      source: snapshot.source,
      trigger,
      reason: 'snapshot-updated',
      metadata: options.metadata
    });

    return snapshot;
  }

  async getProfileById(profileId: string): Promise<LearnerProfile | null> {
    return learnerProfileRepository.getById(profileId);
  }

  async getLatestProfileForUser(userId: string): Promise<LearnerProfile | null> {
    return learnerProfileRepository.getLatestForUser(userId);
  }

  async listProfilesForUser(userId: string, limit = 10): Promise<LearnerProfile[]> {
    return learnerProfileRepository.listForUser(userId, limit);
  }

  buildSnapshotPayload(params: {
    userId: string;
    quizResultId?: string;
    source?: LearnerProfileSource;
    hoursPerWeek?: number | null;
    strengths?: string[];
    gaps?: string[];
    passionTags?: string[];
    availability?: Prisma.JsonValue | null;
    blockers?: string[];
    goals?: string[];
    rawSnapshot: Prisma.JsonValue;
    lastRefreshedAt?: Date;
  }): LearnerProfileCreateInput {
    return {
      userId: params.userId,
      source: params.source,
      hoursPerWeek: params.hoursPerWeek,
      strengths: params.strengths,
      gaps: params.gaps,
      passionTags: params.passionTags,
      availability: params.availability,
      blockers: params.blockers,
      goals: params.goals,
      rawSnapshot: params.rawSnapshot,
      lastRefreshedAt: params.lastRefreshedAt
    };
  }
}

export const learnerProfileService = new LearnerProfileService();
