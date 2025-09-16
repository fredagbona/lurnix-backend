import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { config } from '../config/environment.js';
import { 
  GenerateProfileRequest, 
  GenerateProfileResponse, 
  GenerateRoadmapRequest, 
  GenerateRoadmapResponse,
  LearnerProfile,
  LearnerProfileType,
  Roadmap
} from '../types/ai.js';
import { AppError } from '../errors/AppError.js';
import { v4 as uuidv4 } from 'uuid';

// Define Zod schemas for structured output
const roadmapSchema = z.object({
  title: z.string(),
  description: z.string(),
  milestones: z.array(z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    order: z.number(),
    steps: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      estimatedHours: z.number(),
      order: z.number(),
      resources: z.array(z.object({
        title: z.string(),
        url: z.string().optional(),
        type: z.enum(['article', 'video', 'course', 'book', 'tool', 'exercise']),
        description: z.string(),
      }))
    }))
  })),
  estimatedTotalHours: z.number()
});

const profileSchema = z.object({
  profileType: z.string(),
  strengths: z.array(z.string()),
  challenges: z.array(z.string()),
  recommendedApproaches: z.array(z.string()),
  description: z.string()
});

class AIService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = config.OPENAI_API_KEY;
    this.model = config.OPENAI_MODEL;
    
    if (!this.apiKey) {
      console.error('OpenAI API key is not configured');
    }

    console.log('AI Service initialized with model:', this.model);
    console.log('API Key present:', !!this.apiKey);
  }

  /**
   * Generate a personalized learning roadmap based on user profile and preferences
   */
  async generateRoadmap(request: GenerateRoadmapRequest): Promise<GenerateRoadmapResponse> {
    try {
      const { userId, learningGoal, targetStack, profileType, timeCommitmentHoursPerWeek, priorExperience } = request;
      
      // Validate required fields
      if (!userId || !learningGoal || !profileType) {
        throw new AppError('Missing required fields for roadmap generation', 400);
      }

      // Define the expected response type explicitly to avoid deep type instantiation
      type RoadmapResponse = {
        object: {
          title: string;
          description: string;
          milestones: Array<{
            id: string;
            title: string;
            description: string;
            order: number;
            steps: Array<{
              id: string;
              title: string;
              description: string;
              estimatedHours: number;
              order: number;
              resources: Array<{
                title: string;
                url?: string;
                type: 'article' | 'video' | 'course' | 'book' | 'tool' | 'exercise';
                description: string;
              }>
            }>
          }>;
          estimatedTotalHours: number;
        }
      };

      // Use generateObject (cast to any) to avoid deep type instantiation issues in TS
      const result = await (generateObject as any)({
        model: openai(this.model), 
        schema: roadmapSchema as any,
        system: 'You are an expert learning path creator for software development and technology skills.',
        prompt: `Generate a personalized learning roadmap for a user with the following details:
        
        Learning Goal: ${learningGoal}
        ${targetStack ? `Target Technology Stack: ${targetStack}` : ''}
        Learner Profile Type: ${profileType}
        ${timeCommitmentHoursPerWeek ? `Time Commitment: ${timeCommitmentHoursPerWeek} hours per week` : ''}
        ${priorExperience ? `Prior Experience: ${priorExperience}` : ''}
        
        The roadmap should include:
        1. A descriptive title
        2. An overall description of the learning journey
        3. 3-5 milestones, each with:
           - A clear title
           - A description
           - 2-4 steps to complete the milestone
        4. For each step:
           - A clear title
           - A description
           - Estimated hours to complete
           - 1-3 learning resources (articles, videos, courses, etc.)
        
        Make sure all IDs are unique strings, and all orders are sequential numbers starting from 1.
        Ensure the roadmap is tailored to the user's profile type (${profileType}) and learning preferences.
        The total estimated hours should be the sum of all step hours.`,
        temperature: 0.7,
        maxTokens: 4000
      }) as unknown as RoadmapResponse;

      const roadmapData = result.object;

      // Create the roadmap object
      const roadmap: Roadmap = {
        id: uuidv4(),
        userId,
        title: roadmapData.title,
        description: roadmapData.description,
        learningGoal,
        targetStack,
        milestones: roadmapData.milestones,
        estimatedTotalHours: roadmapData.estimatedTotalHours,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      return { roadmap };
    } catch (error) {
      console.error('Error generating roadmap:', error);
      
      // Log more details for debugging
      if (error instanceof Error && error.message?.includes('quota')) {
        console.error('Quota exceeded. Check your OpenAI billing and usage.');
      }
      
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to generate roadmap', 500);
    }
  }

  /**
   * Generate a learner profile based on quiz answers
   */
  async generateProfile(request: GenerateProfileRequest): Promise<GenerateProfileResponse> {
    try {
      const { quizSubmission } = request;
      
      if (!quizSubmission || !quizSubmission.answers || quizSubmission.answers.length === 0) {
        throw new AppError('Quiz submission is required for profile generation', 400);
      }

      // Define the expected response type explicitly to avoid deep type instantiation
      type ProfileResponse = {
        object: {
          profileType: string;
          strengths: string[];
          challenges: string[];
          recommendedApproaches: string[];
          description: string;
        }
      };

      // Use generateObject (cast to any) for structured output while avoiding TS deep type instantiation
      const result = await (generateObject as any)({
        model: openai(this.model),
        schema: profileSchema as any,
        system: 'You are an expert learning profile creator for software development and technology skills.',
        prompt: `Based on the following quiz answers, determine the most suitable learner profile type for this user.
        
        Quiz Answers:
        ${JSON.stringify(quizSubmission.answers, null, 2)}
        
        Analyze these answers and determine which of the following learner profile types best matches this user:
        
        1. VISUAL_LEARNER: Learns best through images, diagrams, and visual representations
        2. PRACTICAL_BUILDER: Learns by doing and building projects
        3. ANALYTICAL_THINKER: Learns through logical analysis and systematic approaches
        4. SOCIAL_COLLABORATOR: Learns best through discussion and collaboration
        5. CREATIVE_EXPLORER: Learns through experimentation and creative approaches
        6. STRUCTURED_PLANNER: Learns through organized, step-by-step processes
        7. INDEPENDENT_RESEARCHER: Learns through self-directed research and exploration
        8. GOAL_ORIENTED_ACHIEVER: Learns by focusing on clear objectives and outcomes
        
        Provide the profileType as one of the exact strings above, along with strengths, challenges, recommended approaches, and a description.`,
        temperature: 0.7,
        maxTokens: 2000
      }) as unknown as ProfileResponse;

      const profileData = result.object;

      // Validate the profile type
      if (!Object.values(LearnerProfileType).includes(profileData.profileType as LearnerProfileType)) {
        console.warn(`Invalid profile type returned: ${profileData.profileType}`);
        // Default to a reasonable profile type if invalid
        profileData.profileType = LearnerProfileType.ANALYTICAL_THINKER;
      }

      // Create the profile object
      const profile: LearnerProfile = {
        profileType: profileData.profileType as LearnerProfileType,
        strengths: profileData.strengths || [],
        challenges: profileData.challenges || [],
        recommendedApproaches: profileData.recommendedApproaches || [],
        description: profileData.description || 'No description available'
      };

      return { profile };
    } catch (error) {
      console.error('Error generating profile:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to generate profile', 500);
    }
  }
}

// Export singleton instance
export const aiService = new AIService();