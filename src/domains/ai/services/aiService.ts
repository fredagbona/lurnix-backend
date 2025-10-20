import { GenerateProfileRequest, GenerateProfileResponse } from '../types/ai.js';
import { AppError } from '../../../errors/AppError.js';

class AIService {
  private raiseUnavailable(): never {
    throw new AppError(
      'AI-powered profile generation is temporarily disabled while we ship the new planner stack.',
      503,
      'AI_PROFILE_UNAVAILABLE'
    );
  }

  async generateProfile(request: GenerateProfileRequest): Promise<GenerateProfileResponse> {
    const { quizSubmission } = request;

    if (!quizSubmission || !quizSubmission.answers || quizSubmission.answers.length === 0) {
      throw new AppError('Quiz submission is required for profile generation', 400);
    }

    this.raiseUnavailable();
  }
}

export const aiService = new AIService();
