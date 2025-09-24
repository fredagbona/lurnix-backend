import {
  GenerateProfileRequest,
  GenerateProfileResponse,
  GenerateRoadmapRequest,
  GenerateRoadmapResponse
} from '../types/ai.js';
import { AppError } from '../errors/AppError.js';

class AIService {
  private raiseUnavailable(feature: 'roadmap' | 'profile'): never {
    const featureLabel = feature === 'roadmap' ? 'roadmap planning' : 'profile generation';
    throw new AppError(
      `AI-powered ${featureLabel} is temporarily disabled while we ship the new planner stack.`,
      503,
      feature === 'roadmap' ? 'AI_ROADMAP_UNAVAILABLE' : 'AI_PROFILE_UNAVAILABLE'
    );
  }

  async generateRoadmap(request: GenerateRoadmapRequest): Promise<GenerateRoadmapResponse> {
    const { userId, learningGoal, profileType } = request;

    if (!userId || !learningGoal || !profileType) {
      throw new AppError('Missing required fields for roadmap generation', 400);
    }

    this.raiseUnavailable('roadmap');
  }

  async generateProfile(request: GenerateProfileRequest): Promise<GenerateProfileResponse> {
    const { quizSubmission } = request;

    if (!quizSubmission || !quizSubmission.answers || quizSubmission.answers.length === 0) {
      throw new AppError('Quiz submission is required for profile generation', 400);
    }

    this.raiseUnavailable('profile');
  }
}

export const aiService = new AIService();
