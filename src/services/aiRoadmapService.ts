import {
  GenerateSevenDayRoadmapRequest,
  GenerateThirtyDayRoadmapRequest,
  GenerateRoadmapResponse
} from '../types/roadmap.js';
import { AppError } from '../errors/AppError.js';

class AIRoadmapService {
  private raiseUnavailable(): never {
    throw new AppError(
      'AI roadmap generation is temporarily disabled while we deploy the new objectives/sprints planner.',
      503,
      'AI_ROADMAP_UNAVAILABLE'
    );
  }

  async generateSevenDayRoadmap(_: GenerateSevenDayRoadmapRequest): Promise<GenerateRoadmapResponse> {
    this.raiseUnavailable();
  }

  async generateThirtyDayRoadmap(_: GenerateThirtyDayRoadmapRequest): Promise<GenerateRoadmapResponse> {
    this.raiseUnavailable();
  }
}

export const aiRoadmapService = new AIRoadmapService();
