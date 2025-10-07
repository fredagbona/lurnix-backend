import { createHash } from 'crypto';
import { LearnerProfileSource } from '../types/prisma';
import type { ProfileContext } from '../services/profileContextBuilder';

export type ProfileEventTrigger = 'quiz' | 'manual' | 'review' | 'system';
export type ProfileRefreshReason = 'snapshot-recorded' | 'snapshot-updated' | 'context-built';

export interface ProfileSnapshotRecordedPayload {
  learnerProfileId: string;
  userId: string;
  source: LearnerProfileSource;
  recordedAt: string;
  snapshotHash: string;
  rawSnapshot: Record<string, unknown>;
  trigger: ProfileEventTrigger;
  metadata?: Record<string, unknown>;
}

export interface ProfileSnapshotUpdatedPayload {
  learnerProfileId: string;
  userId: string;
  source: LearnerProfileSource;
  updatedAt: string;
  snapshotHash: string;
  rawSnapshot: Record<string, unknown>;
  trigger: ProfileEventTrigger;
  metadata?: Record<string, unknown>;
}

export interface ProfileRefreshRequestedPayload {
  learnerProfileId: string;
  userId: string;
  source: LearnerProfileSource;
  trigger: ProfileEventTrigger;
  reason: ProfileRefreshReason;
  objectiveId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ProfileContextBuiltPayload {
  learnerProfileId: string;
  userId: string;
  trigger: ProfileEventTrigger;
  context: ProfileContext;
  objectiveId?: string | null;
  metadata?: Record<string, unknown>;
}

type ProfileEventMap = {
  'profile:snapshot-recorded': ProfileSnapshotRecordedPayload;
  'profile:snapshot-updated': ProfileSnapshotUpdatedPayload;
  'profile:refresh-requested': ProfileRefreshRequestedPayload;
  'profile:context-built': ProfileContextBuiltPayload;
};

type Listener<T> = (payload: T) => void | Promise<void>;

class ProfileEvents {
  private listeners = new Map<keyof ProfileEventMap, Listener<any>[]>();

  on<K extends keyof ProfileEventMap>(event: K, listener: Listener<ProfileEventMap[K]>): () => void {
    const registry = this.listeners.get(event) ?? [];
    registry.push(listener as Listener<any>);
    this.listeners.set(event, registry);
    return () => this.off(event, listener);
  }

  off<K extends keyof ProfileEventMap>(event: K, listener: Listener<ProfileEventMap[K]>): void {
    const registry = this.listeners.get(event);
    if (!registry) return;
    this.listeners.set(
      event,
      registry.filter((registered) => registered !== listener)
    );
  }

  async emit<K extends keyof ProfileEventMap>(event: K, payload: ProfileEventMap[K]): Promise<void> {
    const registry = [...(this.listeners.get(event) ?? [])] as Listener<ProfileEventMap[K]>[];
    if (registry.length === 0) {
      return;
    }

    await Promise.all(
      registry.map(async (listener) => {
        try {
          await listener(payload);
        } catch (error) {
          console.error(`[profileEvents] Listener error for ${String(event)}:`, error);
        }
      })
    );
  }
}

export const profileEvents = new ProfileEvents();

export const onProfileSnapshotRecorded = (listener: Listener<ProfileSnapshotRecordedPayload>) =>
  profileEvents.on('profile:snapshot-recorded', listener);

export const onProfileSnapshotUpdated = (listener: Listener<ProfileSnapshotUpdatedPayload>) =>
  profileEvents.on('profile:snapshot-updated', listener);

export const onProfileRefreshRequested = (listener: Listener<ProfileRefreshRequestedPayload>) =>
  profileEvents.on('profile:refresh-requested', listener);

export const onProfileContextBuilt = (listener: Listener<ProfileContextBuiltPayload>) =>
  profileEvents.on('profile:context-built', listener);

export const emitProfileSnapshotRecorded = (payload: ProfileSnapshotRecordedPayload) =>
  profileEvents.emit('profile:snapshot-recorded', payload);

export const emitProfileSnapshotUpdated = (payload: ProfileSnapshotUpdatedPayload) =>
  profileEvents.emit('profile:snapshot-updated', payload);

export const emitProfileRefreshRequested = (payload: ProfileRefreshRequestedPayload) =>
  profileEvents.emit('profile:refresh-requested', payload);

export const emitProfileContextBuilt = (payload: ProfileContextBuiltPayload) =>
  profileEvents.emit('profile:context-built', payload);

export const normalizeSnapshot = (snapshot: unknown): Record<string, unknown> => {
  if (!snapshot || typeof snapshot !== 'object') {
    return {};
  }

  try {
    return JSON.parse(JSON.stringify(snapshot));
  } catch (error) {
    console.warn('[profileEvents] Failed to normalize learner snapshot', error);
    return {};
  }
};

export const computeSnapshotHash = (snapshot: unknown): string => {
  try {
    const serialized = JSON.stringify(snapshot ?? {});
    return createHash('sha256').update(serialized).digest('hex');
  } catch (error) {
    console.warn('[profileEvents] Failed to compute snapshot hash', error);
    return createHash('sha256').update(String(Date.now())).digest('hex');
  }
};

export const inferTriggerFromSource = (source?: LearnerProfileSource | null): ProfileEventTrigger => {
  if (source === LearnerProfileSource.quiz) {
    return 'quiz';
  }
  if (source === LearnerProfileSource.manual) {
    return 'manual';
  }
  if (source === LearnerProfileSource.review) {
    return 'review';
  }
  return 'system';
};
