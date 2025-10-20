import { Prisma } from '@prisma/client';
import { db } from '../../../prisma/prismaWrapper';
import { LearnerProfile, LearnerProfileSource } from '@prisma/client';

export interface LearnerProfileCreateInput {
  userId: string;
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
  technicalLevel?: Prisma.JsonValue | null;
  assessmentVersion?: string | null;
  assessmentCompletedAt?: Date | null;
}

export interface LearnerProfileUpdateInput {
  hoursPerWeek?: number | null;
  strengths?: string[];
  gaps?: string[];
  passionTags?: string[];
  availability?: Prisma.JsonValue | null;
  blockers?: string[];
  goals?: string[];
  rawSnapshot?: Prisma.JsonValue;
  lastRefreshedAt?: Date;
  technicalLevel?: Prisma.JsonValue | null;
  assessmentVersion?: string | null;
  assessmentCompletedAt?: Date | null;
}

export class LearnerProfileRepository {
  async createSnapshot(input: LearnerProfileCreateInput): Promise<LearnerProfile> {
    const {
      userId,
      source = LearnerProfileSource.quiz,
      hoursPerWeek = null,
      strengths = [],
      gaps = [],
      passionTags = [],
      availability = null,
      blockers = [],
      goals = [],
      rawSnapshot,
      lastRefreshedAt = new Date(),
      technicalLevel = null,
      assessmentVersion = null,
      assessmentCompletedAt = null
    } = input;

    const profile = await db.learnerProfile.create({
      data: {
        userId,
        source,
        hoursPerWeek,
        strengths,
        gaps,
        passionTags,
        availability,
        blockers,
        goals,
        rawSnapshot,
        lastRefreshedAt,
        technicalLevel,
        assessmentVersion,
        assessmentCompletedAt
      }
    });

    return profile as LearnerProfile;
  }

  async updateProfile(profileId: string, updates: LearnerProfileUpdateInput): Promise<LearnerProfile> {
    const profile = await db.learnerProfile.update({
      where: { id: profileId },
      data: {
        ...updates,
        lastRefreshedAt: updates.lastRefreshedAt ?? new Date()
      }
    });

    return profile as LearnerProfile;
  }

  async getById(profileId: string): Promise<LearnerProfile | null> {
    const profile = await db.learnerProfile.findUnique({ where: { id: profileId } });
    return (profile ?? null) as LearnerProfile | null;
  }

  async getLatestForUser(userId: string): Promise<LearnerProfile | null> {
    const profile = await db.learnerProfile.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    return (profile ?? null) as LearnerProfile | null;
  }

  async listForUser(userId: string, limit = 10): Promise<LearnerProfile[]> {
    const profiles = await db.learnerProfile.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return profiles as LearnerProfile[];
  }
}

export const learnerProfileRepository = new LearnerProfileRepository();
