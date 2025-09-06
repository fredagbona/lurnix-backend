import { Prisma } from '@prisma/client';

// Define enums to match Prisma schema
export enum RoadmapType {
  seven_day = 'seven_day',
  thirty_day = 'thirty_day'
}

export enum ObjectiveStatus {
  todo = 'todo',
  doing = 'doing',
  done = 'done'
}

// Define interfaces for Prisma models
export interface Roadmap {
  id: string;
  userId: string;
  roadmap_type: RoadmapType;
  profileSnapshot: any;
  jsonRoadmap: any;
  createdAt: Date;
  updatedAt: Date;
  objectives?: Objective[];
  progresses?: Progress[];
}

export interface Objective {
  id: string;
  roadmapId?: string | null;
  title: string;
  description?: string | null;
  dueDate?: Date | null;
  status: ObjectiveStatus;
  createdAt: Date;
  updatedAt: Date;
  roadmap?: Roadmap | null;
}

export interface Progress {
  id: string;
  userId: string;
  roadmapId: string;
  completedTasks: string[];
  completedObjectives: number;
  streak: number;
  lastActivityAt: Date;
  createdAt: Date;
  updatedAt: Date;
  user?: any;
  roadmap?: Roadmap;
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
