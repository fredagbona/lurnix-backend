import { Prisma } from '@prisma/client';
import { createHash } from 'crypto';
import { db } from '../prisma/prismaWrapper';
import { AppError } from '../errors/AppError';
import {
  LearnerProfile,
  LearnerProfileSource,
  SprintDifficulty,
  SprintStatus
} from '../types/prisma';
import {
  learnerProfileService,
  RecordLearnerProfileInput
} from './learnerProfileService.js';
import {
  emitProfileContextBuilt,
  emitProfileRefreshRequested,
  inferTriggerFromSource
} from '../events/profileEvents.js';

export interface ProfileContextBuildParams {
  userId: string;
  learnerProfileId?: string;
  objectiveId?: string;
  includeQuizResult?: boolean;
  includeProgress?: boolean;
}

export interface ProfileQuizContext {
  id: string;
  version: number;
  submittedAt: string;
  personaKey?: string | null;
  summaryKey?: string | null;
  computedProfile: Record<string, unknown>;
}

export interface ProfileProgressContext {
  source: 'sprint' | 'roadmap';
  referenceId: string;
  streak: number;
  completedObjectives: number;
  completedTasks: number;
  lastActivityAt?: string;
  activeSprint?: {
    id: string;
    status: SprintStatus;
    difficulty: SprintDifficulty;
    lengthDays: number;
    totalEstimatedHours: number;
    score?: number | null;
    startedAt?: string | null;
    completedAt?: string | null;
  };
}

export interface SerializableLearnerProfile {
  id: string;
  userId: string;
  source: LearnerProfileSource;
  hoursPerWeek?: number | null;
  strengths: string[];
  gaps: string[];
  passionTags: string[];
  availability?: Record<string, unknown> | null;
  blockers: string[];
  goals: string[];
  lastRefreshedAt: string;
  rawSnapshot: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  profileHash: string;
}

export interface ProfileContext {
  learnerProfile: SerializableLearnerProfile;
  quizResult?: ProfileQuizContext;
  progress?: ProfileProgressContext;
}

interface SnapshotDerivatives {
  hoursPerWeek?: number | null;
  strengths: string[];
  gaps: string[];
  passionTags: string[];
  availability?: Prisma.JsonValue | null;
  blockers: string[];
  goals: string[];
}

class ProfileContextBuilder {
  async build(params: ProfileContextBuildParams): Promise<ProfileContext> {
    const learnerProfileRecord = await this.resolveLearnerProfile(params.userId, params.learnerProfileId);

    if (!learnerProfileRecord) {
      throw new AppError('objectives.errors.profileNotFound', 404, 'LEARNER_PROFILE_NOT_FOUND');
    }

    const [quizResult, progress] = await Promise.all([
      params.includeQuizResult === false ? Promise.resolve(undefined) : this.getLatestQuizResult(params.userId),
      params.includeProgress === false
        ? Promise.resolve(undefined)
        : this.getProgressSignals(params.userId, params.objectiveId)
    ]);

    const context: ProfileContext = {
      learnerProfile: this.serializeLearnerProfile(learnerProfileRecord),
      quizResult,
      progress
    };

    const trigger = inferTriggerFromSource(learnerProfileRecord.source);
    const metadata = {
      includeQuizResult: params.includeQuizResult !== false,
      includeProgress: params.includeProgress !== false
    };

    await emitProfileContextBuilt({
      learnerProfileId: learnerProfileRecord.id,
      userId: learnerProfileRecord.userId,
      trigger,
      context,
      objectiveId: params.objectiveId ?? null,
      metadata
    });

    await emitProfileRefreshRequested({
      learnerProfileId: learnerProfileRecord.id,
      userId: learnerProfileRecord.userId,
      source: learnerProfileRecord.source,
      trigger,
      reason: 'context-built',
      objectiveId: params.objectiveId ?? null,
      metadata
    });

    return context;
  }

  async recordSnapshotFromComputedProfile(params: {
    userId: string;
    computedProfile: Record<string, unknown>;
    quizResultId?: string;
    source?: LearnerProfileSource;
  }): Promise<LearnerProfile> {
    const derivatives = this.deriveSnapshotDerivatives(params.computedProfile);

    const payload = learnerProfileService.buildSnapshotPayload({
      userId: params.userId,
      source: params.source ?? LearnerProfileSource.quiz,
      hoursPerWeek: derivatives.hoursPerWeek,
      strengths: derivatives.strengths,
      gaps: derivatives.gaps,
      passionTags: derivatives.passionTags,
      availability: derivatives.availability ?? null,
      blockers: derivatives.blockers,
      goals: derivatives.goals,
      rawSnapshot: params.computedProfile as Prisma.JsonValue,
      lastRefreshedAt: new Date()
    });

    const trigger = inferTriggerFromSource(params.source ?? LearnerProfileSource.quiz);

    return learnerProfileService.recordSnapshot(payload as RecordLearnerProfileInput, {
      trigger,
      metadata: {
        quizResultId: params.quizResultId ?? null
      }
    });
  }

  serializeLearnerProfile(profile: LearnerProfile): SerializableLearnerProfile {
    const rawSnapshot = this.normalizeJson(profile.rawSnapshot);
    return {
      id: profile.id,
      userId: profile.userId,
      source: profile.source,
      hoursPerWeek: profile.hoursPerWeek ?? null,
      strengths: Array.isArray(profile.strengths) ? profile.strengths : [],
      gaps: Array.isArray(profile.gaps) ? profile.gaps : [],
      passionTags: Array.isArray(profile.passionTags) ? profile.passionTags : [],
      availability: this.normalizeJson(profile.availability),
      blockers: Array.isArray(profile.blockers) ? profile.blockers : [],
      goals: Array.isArray(profile.goals) ? profile.goals : [],
      lastRefreshedAt: profile.lastRefreshedAt?.toISOString?.() ?? new Date().toISOString(),
      rawSnapshot,
      createdAt: profile.createdAt.toISOString(),
      updatedAt: profile.updatedAt.toISOString(),
      profileHash: this.computeProfileHash(profile)
    };
  }

  private async resolveLearnerProfile(userId: string, learnerProfileId?: string): Promise<LearnerProfile | null> {
    if (learnerProfileId) {
      const profile = await learnerProfileService.getProfileById(learnerProfileId);
      if (profile && profile.userId !== userId) {
        throw new AppError('objectives.errors.profileNotFound', 404, 'LEARNER_PROFILE_NOT_FOUND');
      }
      return profile;
    }

    return learnerProfileService.getLatestProfileForUser(userId);
  }

  private async getLatestQuizResult(userId: string): Promise<ProfileQuizContext | undefined> {
    const result = await db.quizResult.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!result) {
      return undefined;
    }

    const computedProfile = this.normalizeJson(result.computedProfile ?? {}) as Record<string, unknown>;
    return {
      id: result.id,
      version: result.version,
      submittedAt: result.createdAt.toISOString(),
      personaKey: this.resolvePersonaKey(computedProfile),
      summaryKey: this.resolveSummaryKey(computedProfile),
      computedProfile
    };
  }

  private async getProgressSignals(userId: string, objectiveId?: string): Promise<ProfileProgressContext | undefined> {
    let sprintProgress: any = null;
    let latestSprint: any = null;

    if (objectiveId) {
      latestSprint = await db.sprint.findFirst({
        where: { objectiveId },
        orderBy: { createdAt: 'desc' }
      });

      if (latestSprint) {
        sprintProgress = await db.progress.findFirst({
          where: { userId, sprintId: latestSprint.id },
          orderBy: { updatedAt: 'desc' }
        });
      }
    }

    if (sprintProgress && latestSprint) {
      return {
        source: 'sprint',
        referenceId: sprintProgress.id,
        streak: sprintProgress.streak ?? 0,
        completedObjectives: sprintProgress.completedObjectives ?? 0,
        completedTasks: this.countCompletedTasks(sprintProgress.completedTasks),
        lastActivityAt: sprintProgress.lastActivityAt?.toISOString?.(),
        activeSprint: {
          id: latestSprint.id,
          status: latestSprint.status as SprintStatus,
          difficulty: latestSprint.difficulty as SprintDifficulty,
          lengthDays: latestSprint.lengthDays,
          totalEstimatedHours: latestSprint.totalEstimatedHours,
          score: latestSprint.score ?? null,
          startedAt: latestSprint.startedAt?.toISOString?.() ?? null,
          completedAt: latestSprint.completedAt?.toISOString?.() ?? null
        }
      };
    }

    return undefined;
  }

  private deriveSnapshotDerivatives(computedProfile: Record<string, unknown>): SnapshotDerivatives {
    const snapshot = computedProfile as any;
    return {
      hoursPerWeek: this.deriveWeeklyHours(computedProfile),
      strengths: this.ensureStringArray(snapshot?.strengths),
      gaps: this.ensureStringArray(snapshot?.challenges ?? snapshot?.gaps),
      passionTags: this.ensureStringArray(snapshot?.passionTags ?? snapshot?.passions),
      availability: this.normalizeAvailability(
        snapshot?.availability ?? {
          hoursPerWeek: snapshot?.hoursPerWeek ?? this.deriveWeeklyHours(computedProfile),
          timePerDayMinutes: snapshot?.timePerDay,
          weeklyRhythm: snapshot?.weeklyRhythm,
          focusPreference: snapshot?.focusPreference?.dominant ?? snapshot?.focusPreference,
          energyPeak: snapshot?.energyPeak,
          contextSwitch: snapshot?.contextSwitch,
          noteStyle: snapshot?.noteTaking,
          reviewCadence: snapshot?.reviewCadence,
          supportChannels: snapshot?.supportChannels
        }
      ),
      blockers: this.ensureStringArray(snapshot?.blockers),
      goals: this.ensureStringArray(snapshot?.goals ?? (snapshot?.goal ? [snapshot.goal] : undefined))
    };
  }

  private deriveWeeklyHours(profile: Record<string, unknown>): number | null {
    const snapshot = profile as any;
    const rawHours = snapshot?.availability?.hours_per_week ?? snapshot?.hoursPerWeek;

    if (typeof rawHours === 'number') {
      return rawHours;
    }

    if (typeof rawHours === 'string') {
      const parsed = parseFloat(rawHours);
      return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
  }

  private normalizeAvailability(value: unknown): Prisma.JsonValue | null {
    if (!value || typeof value !== 'object') {
      return null;
    }

    try {
      return JSON.parse(JSON.stringify(value));
    } catch (error) {
      console.warn('[profileContextBuilder] Failed to normalize availability snapshot', error);
      return null;
    }
  }

  private ensureStringArray(value: unknown): string[] {
    if (!value) {
      return [];
    }

    if (Array.isArray(value)) {
      return value
        .map((entry) => (typeof entry === 'string' ? entry : typeof entry === 'number' ? String(entry) : null))
        .filter((entry): entry is string => Boolean(entry));
    }

    if (typeof value === 'string') {
      return [value];
    }

    return [];
  }

  private countCompletedTasks(value: Prisma.JsonValue): number {
    if (!value) {
      return 0;
    }

    if (Array.isArray(value)) {
      return value.length;
    }

    if (typeof value === 'object' && value !== null && 'length' in value && typeof value.length === 'number') {
      return value.length;
    }

    return 0;
  }

  private normalizeJson(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    return JSON.parse(JSON.stringify(value));
  }

  private resolvePersonaKey(computedProfile: Record<string, unknown>): string | null {
    const profile = computedProfile as any;
    const possibleKeys = [
      profile?.persona?.key,
      profile?.profile?.key,
      profile?.primaryProfile?.key,
      profile?.profileType
    ];

    return possibleKeys.find((key) => typeof key === 'string') ?? null;
  }

  private resolveSummaryKey(computedProfile: Record<string, unknown>): string | null {
    const profile = computedProfile as any;
    const possibleKeys = [
      profile?.persona?.summaryKey,
      profile?.profile?.summaryKey,
      profile?.primaryProfile?.summaryKey
    ];

    return possibleKeys.find((key) => typeof key === 'string') ?? null;
  }

  private computeProfileHash(profile: LearnerProfile): string {
    const hash = createHash('sha256');
    hash.update(profile.id);
    hash.update(profile.updatedAt?.toISOString?.() ?? '');
    hash.update(String(profile.hoursPerWeek ?? ''));
    return hash.digest('hex');
  }
}

export const profileContextBuilder = new ProfileContextBuilder();
