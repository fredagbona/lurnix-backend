import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { config } from '../config/environment.js';
import { AppError } from '../errors/AppError.js';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../prisma/prismaWrapper.js';
import { 
  GenerateSevenDayRoadmapRequest, 
  GenerateThirtyDayRoadmapRequest,
  GenerateRoadmapResponse,
  Roadmap,
  RoadmapType
} from '../types/roadmap.js';
import { RoadmapType as PrismaRoadmapType } from '../types/prisma.js';
import { 
  baseRoadmapSystemPrompt, 
  sevenDayRoadmapPrompt, 
  thirtyDayRoadmapPrompt 
} from '../prompts/roadmapPrompts.js';
import { 
  RoadmapSchema,
  RoadmapTaskSchema,
  RoadmapDaySchema
} from '../schemas/roadmapSchema.js';

// Define explicit interface for AI response to avoid deep type instantiation issues
interface RoadmapResource {
  title: string;
  url?: string;
  type: string;
  description: string;
}

interface RoadmapTask {
  id: string;
  title: string;
  description: string;
  estMins: number;
  type: string;
  resources?: RoadmapResource[];
}

interface RoadmapDay {
  day: number;
  title: string;
  description: string;
  tasks: RoadmapTask[];
}

interface AIRoadmapResponse {
  title: string;
  description: string;
  estDailyMins: number;
  totalDays: number;
  days: RoadmapDay[];
}

// Define the roadmap structure using Zod
const roadmapResponseSchema = z.object({
  title: z.string(),
  description: z.string(),
  estDailyMins: z.number(),
  totalDays: z.number(),
  days: z.array(z.object({
    day: z.number(),
    title: z.string(),
    description: z.string(),
    tasks: z.array(z.object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      estMins: z.number(),
      type: z.string(),
      resources: z.array(z.object({
        title: z.string(),
        url: z.string().optional(),
        type: z.string(),
        description: z.string()
      })).optional()
    }))
  }))
});

class AIRoadmapService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = config.OPENAI_API_KEY;
    this.model = config.OPENAI_MODEL;
    
    if (!this.apiKey) {
      console.error('OpenAI API key is not configured');
    }

    console.log('AI Roadmap Service initialized with model:', this.model);
    console.log('API Key present:', !!this.apiKey);
  }

  /**
   * Generate a 7-day roadmap for learning basics
   */
  async generateSevenDayRoadmap(request: GenerateSevenDayRoadmapRequest): Promise<GenerateRoadmapResponse> {
    try {
      // Prepare user profile for the prompt
      const userProfile = {
        learningStyle: request.learningStyle,
        objectives: request.objectives,
        passions: request.passions,
        problemSolving: request.problemSolving,
        timeCommitment: request.timeCommitmentMinsPerDay || 60,
        priorExperience: request.priorExperience || 'Beginner'
      };

      console.log('Generating 7-day roadmap with profile:', userProfile);

      // Use generateObject (cast to any) to avoid TS deep type instantiation issues
      const result = await (generateObject as any)({
        model: openai(this.model), // Ensure this is 'gpt-3.5-turbo' or 'gpt-4o'
        schema: roadmapResponseSchema as any,
        system: baseRoadmapSystemPrompt,
        prompt: sevenDayRoadmapPrompt(userProfile),
        temperature: 0.5,
        maxTokens: 4000
      }) as unknown as { object: AIRoadmapResponse };

      const roadmapData = result.object;
      console.log('Successfully generated roadmap data');

      // Enforce daily time budget
      const adjustedRoadmap = this.enforceDailyTimeBudget(roadmapData);

      // Create the roadmap object
      const roadmap: Roadmap = {
        ...adjustedRoadmap,
        userId: request.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store the roadmap in the database
      const storedRoadmap = await db.roadmap.create({
        data: {
          userId: request.userId,
          roadmap_type: PrismaRoadmapType.seven_day,
          profileSnapshot: userProfile,
          jsonRoadmap: roadmap,
          objectives: {
            create: this.generateDefaultObjectives(PrismaRoadmapType.seven_day)
          }
        },
        include: {
          objectives: true
        }
      });
      
      // Initialize progress tracking
      await db.progress.create({
        data: {
          userId: request.userId,
          roadmapId: storedRoadmap.id,
          completedTasks: [],
          completedObjectives: 0,
          streak: 0
        }
      });

      return { roadmap };
    } catch (error) {
      console.error('Error generating 7-day roadmap:', error);
      
      // Handle quota errors specifically
      if (this.isQuotaError(error)) {
        throw new AppError('API quota exceeded. Please try again later.', 429, 'QUOTA_EXCEEDED');
      }
      
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to generate 7-day roadmap', 500);
    }
  }

  /**
   * Generate a 30-day roadmap for specific projects
   */
  async generateThirtyDayRoadmap(request: GenerateThirtyDayRoadmapRequest): Promise<GenerateRoadmapResponse> {
    try {
      const userProfile = {
        learningStyle: request.learningStyle,
        objectives: request.objectives,
        passions: request.passions,
        problemSolving: request.problemSolving,
        timeCommitment: request.timeCommitmentMinsPerDay || 60,
        priorExperience: request.priorExperience || 'Beginner',
        projectThemes: request.projectThemes || []
      };

      console.log('Generating 30-day roadmap with profile:', userProfile);

      // Use generateObject (cast to any) to avoid TS deep type instantiation issues
      const result = await (generateObject as any)({
        model: openai(this.model),
        schema: roadmapResponseSchema as any,
        system: baseRoadmapSystemPrompt,
        prompt: thirtyDayRoadmapPrompt(userProfile),
        temperature: 0.5,
        maxTokens: 4000
      }) as unknown as { object: AIRoadmapResponse };

      const roadmapData = result.object;

      // Enforce daily time budget
      const adjustedRoadmap = this.enforceDailyTimeBudget(roadmapData);

      // Create the roadmap object
      const roadmap: Roadmap = {
        ...adjustedRoadmap,
        userId: request.userId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Store the roadmap in the database
      const storedRoadmap = await db.roadmap.create({
        data: {
          userId: request.userId,
          roadmap_type: PrismaRoadmapType.thirty_day,
          profileSnapshot: userProfile,
          jsonRoadmap: roadmap,
          objectives: {
            create: this.generateDefaultObjectives(PrismaRoadmapType.thirty_day)
          }
        },
        include: {
          objectives: true
        }
      });
      
      // Initialize progress tracking
      await db.progress.create({
        data: {
          userId: request.userId,
          roadmapId: storedRoadmap.id,
          completedTasks: [],
          completedObjectives: 0,
          streak: 0
        }
      });

      return { roadmap };
    } catch (error) {
      console.error('Error generating 30-day roadmap:', error);
      
      // Handle quota errors specifically
      if (this.isQuotaError(error)) {
        throw new AppError('API quota exceeded. Please try again later.', 429, 'QUOTA_EXCEEDED');
      }
      
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to generate 30-day roadmap', 500);
    }
  }

  /**
   * Check if error is related to quota limits
   */
  private isQuotaError(error: any): boolean {
    return error.toString().includes('quota') || 
           error.toString().includes('insufficient_quota') ||
           (error.cause && error.cause.toString().includes('quota')) ||
           (error.message && error.message.includes('quota'));
  }

  /**
   * Enforce daily time budget for tasks
   */
  private enforceDailyTimeBudget(roadmap: any): any {
    const budget = roadmap.estDailyMins;
    
    roadmap.days = roadmap.days.map((day: any) => {
      const totalMins = day.tasks.reduce((sum: number, task: any) => sum + task.estMins, 0);
      
      if (totalMins > budget * 1.15) {
        return {
          ...day,
          tasks: this.trimToBudget(day.tasks, budget)
        };
      }
      
      return day;
    });
    
    return roadmap;
  }

  /**
   * Trim tasks to fit within budget
   */
  private trimToBudget(tasks: any[], budget: number): any[] {
    const sorted = [...tasks].sort((a, b) => b.estMins - a.estMins);
    let sum = tasks.reduce((s, t) => s + t.estMins, 0);
    
    while (sum > budget && sorted.length > 2) {
      const removed = sorted.pop()!;
      sum -= removed.estMins;
    }
    
    return sorted.sort((a, b) => a.id.localeCompare(b.id));
  }

  /**
   * Generate default objectives based on roadmap type
   */
  private generateDefaultObjectives(roadmapType: PrismaRoadmapType): any[] {
    const objectives = [];
    
    if (roadmapType === PrismaRoadmapType.seven_day) {
      objectives.push(
        {
          title: 'Complete Day 1-2 tasks',
          description: 'Finish all tasks for the first two days of your learning journey',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          status: 'todo'
        },
        {
          title: 'Complete Day 3-5 tasks',
          description: 'Finish all tasks for days 3-5 of your learning journey',
          dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          status: 'todo'
        },
        {
          title: 'Complete all 7-day roadmap tasks',
          description: 'Finish your entire 7-day learning journey',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'todo'
        }
      );
    } else {
      objectives.push(
        {
          title: 'Complete Week 1 tasks',
          description: 'Finish all tasks for the first week of your learning journey',
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'todo'
        },
        {
          title: 'Complete Week 2 tasks',
          description: 'Finish all tasks for the second week of your learning journey',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          status: 'todo'
        },
        {
          title: 'Complete Week 3 tasks',
          description: 'Finish all tasks for the third week of your learning journey',
          dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
          status: 'todo'
        },
        {
          title: 'Complete all 30-day roadmap tasks',
          description: 'Finish your entire 30-day learning journey',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          status: 'todo'
        }
      );
    }
    
    return objectives;
  }
}

export const aiRoadmapService = new AIRoadmapService();