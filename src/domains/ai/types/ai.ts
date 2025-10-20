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
export interface LearnerProfile {
  strengths: string[];
  challenges: string[];
  recommendedApproaches: string[];
  description: string;
}

// AI Service Request/Response Types
export interface GenerateProfileRequest {
  quizSubmission: QuizSubmission;
}

export interface GenerateProfileResponse {
  profile: LearnerProfile;
}
