import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { AppError } from '../errors/AppError.js';
import { openai } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { config } from '../config/environment.js';
import { db } from '../prisma/prismaWrapper.js';
import { z } from 'zod';

export class AIProfileController {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = config.OPENAI_API_KEY;
    this.model = config.OPENAI_MODEL;
    
    if (!this.apiKey) {
      console.error('OpenAI API key is not configured');
    }
  }

  /**
   * Generate a learner profile using AI
   * @route POST /api/ai/profile
   */
  async generateProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        throw new AppError('User authentication required', 401);
      }

      // Extract profile information from request body
      const {
        background,
        interests,
        goals,
        timeAvailable,
        priorExperience,
        learningPreferences
      } = req.body;

      // Prepare the prompt for AI
      const prompt = `
        Generate a personalized learner profile based on the following information:
        
        Background: ${background || 'Not specified'}
        Interests: ${interests || 'Not specified'}
        Goals: ${goals || 'Not specified'}
        Time Available: ${timeAvailable || 'Not specified'} minutes per day
        Prior Experience: ${priorExperience || 'Not specified'}
        Learning Preferences: ${learningPreferences || 'Not specified'}
        
        Generate a structured profile with the following attributes:
        - learning style (visual, auditory, kinesthetic, or balanced)
        - visual score (0-1)
        - reading score (0-1)
        - handsOn score (0-1)
        - experience level (beginner, intermediate, advanced)
        - recommended time per day in minutes
        - primary goal (job_ready, career_switch, build_startup, hobby, automation, general)
        - preferred technology stack (array of technologies)
      `;

      // Define the profile schema using Zod
      const profileSchema = z.object({
        style: z.enum(['visual', 'auditory', 'kinesthetic', 'reflective', 'active', 'sequential', 'global', 'balanced']),
        visual: z.number().min(0).max(1),
        reading: z.number().min(0).max(1),
        handsOn: z.number().min(0).max(1),
        level: z.enum(['beginner', 'intermediate', 'advanced']),
        timePerDay: z.number().min(15).max(240),
        goal: z.enum(['job_ready', 'career_switch', 'build_startup', 'hobby', 'automation', 'general']),
        preferredStack: z.array(z.string())
      });

      // Generate profile using AI (cast to any to avoid deep type instantiation issues)
      const { object: computedProfile } = await (generateObject as any)({
        model: openai(this.model),
        prompt,
        schema: profileSchema as any,
        temperature: 0.5,
      });

      // Store the profile in the database
      const quizResult = await db.quizResult.create({
        data: {
          userId,
          version: 1,
          answers: req.body,
          computedProfile
        }
      });

      res.status(200).json({
        success: true,
        data: {
          id: quizResult.id,
          userId: quizResult.userId,
          version: quizResult.version,
          createdAt: quizResult.createdAt,
          computedProfile
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      next(error);
    }
  }
}

// Export singleton instance
export const aiProfileController = new AIProfileController();
