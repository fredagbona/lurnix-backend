// AI Service Types

// Quiz Answer Types
export interface QuizAnswer {
  questionId: string;
  selectedOptionIds: string[];
}

export interface QuizSubmission {
  userId: string;
  answers: QuizAnswer[];
}

// Profile Types
export enum LearnerProfileType {
  VISUAL_LEARNER = 'visual_learner',
  PRACTICAL_BUILDER = 'practical_builder',
  ANALYTICAL_THINKER = 'analytical_thinker',
  SOCIAL_COLLABORATOR = 'social_collaborator',
  CREATIVE_EXPLORER = 'creative_explorer',
  STRUCTURED_PLANNER = 'structured_planner',
  INDEPENDENT_RESEARCHER = 'independent_researcher',
  GOAL_ORIENTED_ACHIEVER = 'goal_oriented_achiever'
}

export interface LearnerProfile {
  profileType: LearnerProfileType;
  strengths: string[];
  challenges: string[];
  recommendedApproaches: string[];
  description: string;
}

// Roadmap Types
export interface RoadmapStep {
  id: string;
  title: string;
  description: string;
  resources: RoadmapResource[];
  estimatedHours: number;
  order: number;
}

export interface RoadmapResource {
  title: string;
  url?: string;
  type: 'article' | 'video' | 'course' | 'book' | 'tool' | 'exercise';
  description: string;
}

export interface RoadmapMilestone {
  id: string;
  title: string;
  description: string;
  steps: RoadmapStep[];
  order: number;
}

export interface Roadmap {
  id?: string;
  userId: string;
  title: string;
  description: string;
  learningGoal: string;
  targetStack?: string;
  milestones: RoadmapMilestone[];
  estimatedTotalHours: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// AI Service Request/Response Types
export interface GenerateProfileRequest {
  quizSubmission: QuizSubmission;
}

export interface GenerateProfileResponse {
  profile: LearnerProfile;
}

export interface GenerateRoadmapRequest {
  userId: string;
  learningGoal: string;
  targetStack?: string;
  profileType: LearnerProfileType;
  timeCommitmentHoursPerWeek?: number;
  priorExperience?: string;
}

export interface GenerateRoadmapResponse {
  roadmap: Roadmap;
}
