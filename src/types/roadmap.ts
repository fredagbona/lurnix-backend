// Roadmap Types

export type TaskType = "read" | "watch" | "code" | "quiz" | "reflect" | "project";
export type Difficulty = "intro" | "core" | "stretch" | "beginner" | "intermediate" | "advanced";
export type RoadmapType = "seven_day" | "thirty_day";

export interface RoadmapResource {
  label: string;
  url: string;
}

export interface RoadmapTask {
  id: string;
  type: TaskType;
  title: string;
  estMins: number;
  difficulty: Difficulty;
  acceptance: string[];
  resources: RoadmapResource[];
}

export interface RoadmapDay {
  day: number;
  focus: string;
  tasks: RoadmapTask[];
  checkpoints?: string[];
}

export interface Roadmap {
  version: number;
  title: string;
  stack: string[];
  roadmapType: RoadmapType;
  estDailyMins: number;
  principles: string[];
  days: RoadmapDay[];
  userId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SevenDayRoadmapSummary {
  title: string;
  focus: string[];
  estDailyMins: number;
}

export interface ThirtyDayRoadmapSummary {
  title: string;
  projects: string[];
  milestones: string[];
}

export interface RoadmapSummary {
  sevenDay: SevenDayRoadmapSummary;
  thirtyDay: ThirtyDayRoadmapSummary;
}

// Request/Response Types
export interface GenerateSevenDayRoadmapRequest {
  userId: string;
  learningStyle: {
    primary: string;
    secondary: string;
  };
  objectives: {
    topGoal: string;
    priorityRank: string[];
    timeHorizon?: string;
  };
  passions: {
    ranked: string[];
    notes?: string;
  };
  problemSolving: {
    debugStyle: string;
    collaboration: string;
  };
  timeCommitmentMinsPerDay?: number;
  priorExperience?: string;
}

export interface GenerateThirtyDayRoadmapRequest {
  userId: string;
  learningStyle: {
    primary: string;
    secondary: string;
  };
  objectives: {
    topGoal: string;
    priorityRank: string[];
    timeHorizon?: string;
  };
  passions: {
    ranked: string[];
    notes?: string;
  };
  problemSolving: {
    debugStyle: string;
    collaboration: string;
  };
  timeCommitmentMinsPerDay?: number;
  priorExperience?: string;
  projectThemes?: string[];
}

export interface GenerateRoadmapResponse {
  roadmap: Roadmap;
}
