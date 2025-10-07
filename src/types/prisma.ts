import { Prisma } from '@prisma/client';

// Define enums to match Prisma schema
export enum RoadmapType {
  seven_day = 'seven_day',
  thirty_day = 'thirty_day'
}

export enum ObjectiveStatus {
  draft = 'draft',
  active = 'active',
  paused = 'paused',
  completed = 'completed',
  todo = 'todo',
  doing = 'doing',
  done = 'done'
}

export enum SprintStatus {
  planned = 'planned',
  in_progress = 'in_progress',
  submitted = 'submitted',
  reviewed = 'reviewed'
}

export enum SprintDifficulty {
  beginner = 'beginner',
  intermediate = 'intermediate',
  advanced = 'advanced'
}

export enum ArtifactType {
  repository = 'repository',
  deployment = 'deployment',
  video = 'video',
  screenshot = 'screenshot'
}

export enum ArtifactStatus {
  ok = 'ok',
  broken = 'broken',
  missing = 'missing',
  unknown = 'unknown'
}

export enum LearnerProfileSource {
  quiz = 'quiz',
  manual = 'manual',
  review = 'review'
}

// Define interfaces for Prisma models
export interface LearnerProfile {
  id: string;
  userId: string;
  source: LearnerProfileSource;
  hoursPerWeek?: number | null;
  strengths: string[];
  gaps: string[];
  passionTags: string[];
  availability?: Prisma.JsonValue | null;
  blockers: string[];
  goals: string[];
  lastRefreshedAt: Date;
  rawSnapshot: Prisma.JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

export interface Roadmap {
  id: string;
  userId: string;
  roadmap_type: RoadmapType;
  profileSnapshot: Prisma.JsonValue;
  jsonRoadmap: Prisma.JsonValue;
  objectiveId?: string | null;
  createdAt: Date;
  updatedAt: Date;
  objective?: Objective | null;
}

export interface Objective {
  id: string;
  roadmapId?: string | null;
  profileSnapshotId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  priority: number;
  status: ObjectiveStatus;
  estimatedWeeksMin?: number | null;
  estimatedWeeksMax?: number | null;
  successCriteria: string[];
  requiredSkills: string[];
  createdAt: Date;
  updatedAt: Date;
  roadmap?: Roadmap | null;
  profileSnapshot?: LearnerProfile | null;
}

export interface Sprint {
  id: string;
  objectiveId: string;
  profileSnapshotId?: string | null;
  plannerInput: Prisma.JsonValue;
  plannerOutput: Prisma.JsonValue;
  lengthDays: number;
  totalEstimatedHours: number;
  difficulty: SprintDifficulty;
  status: SprintStatus;
  startedAt?: Date | null;
  completedAt?: Date | null;
  score?: number | null;
  reviewerSummary?: Prisma.JsonValue | null;
  selfEvaluationConfidence?: number | null;
  selfEvaluationReflection?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SprintArtifact {
  id: string;
  sprintId: string;
  projectId: string;
  artifactId: string;
  title?: string | null;
  type: ArtifactType;
  url?: string | null;
  status: ArtifactStatus;
  notes?: string | null;
  metadata?: Prisma.JsonValue | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Progress {
  id: string;
  userId: string;
  roadmapId?: string | null;
  sprintId?: string | null;
  completedTasks: Prisma.JsonValue;
  completedObjectives: number;
  streak: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuizResult {
  id: string;
  userId: string;
  version: number;
  answers: any;
  computedProfile: any;
  createdAt: Date;
  user?: any;
}
