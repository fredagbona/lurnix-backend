import Groq from 'groq-sdk';
import { z } from 'zod';
import { config } from '../config/environment.js';
import type { LearnerProfile } from '@prisma/client';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface MilestoneEstimate {
  title: string;
  description: string;
  targetDay: number;
  estimatedHours: number;
  deliverables: string[];
}

export interface ObjectiveDurationEstimate {
  estimatedTotalDays: number;
  estimatedDailyHours: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  reasoning: string;
  confidence: 'low' | 'medium' | 'high';
  breakdown: {
    fundamentals: number;
    intermediate: number;
    advanced: number;
    projects: number;
    review: number;
  };
  milestones: MilestoneEstimate[];
}

export interface EstimateObjectiveParams {
  objectiveTitle: string;
  objectiveDescription?: string;
  successCriteria: string[];
  requiredSkills: string[];
  learnerProfile?: LearnerProfile | null;
  userLanguage?: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const MilestoneEstimateSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  targetDay: z.number().int().min(1),
  estimatedHours: z.number().min(0.5),
  deliverables: z.array(z.string()).min(1).max(5)
});

const ObjectiveDurationEstimateSchema = z.object({
  estimatedTotalDays: z.number().int().min(1).max(365),
  estimatedDailyHours: z.number().min(0.5).max(8),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  reasoning: z.string().min(50),
  confidence: z.enum(['low', 'medium', 'high']),
  breakdown: z.object({
    fundamentals: z.number().int().min(0),
    intermediate: z.number().int().min(0),
    advanced: z.number().int().min(0),
    projects: z.number().int().min(0),
    review: z.number().int().min(0)
  }),
  milestones: z.array(MilestoneEstimateSchema).min(3).max(10)
});

// ============================================
// PROMPTS
// ============================================

const ESTIMATION_SYSTEM_PROMPT = `You are an expert learning path estimator for technical skills and knowledge acquisition.

Your role is to analyze learning objectives and provide realistic, achievable timelines based on:
1. Learner's current skill level (strengths and gaps)
2. Available hours per week
3. Objective complexity and scope
4. Industry-standard learning curves
5. Portfolio project requirements
6. Spaced repetition and review time
7. Realistic daily progress (avoid burnout)

IMPORTANT PRINCIPLES:
- Be conservative - better to underestimate than overwhelm
- Account for learning plateaus and review time
- Consider prerequisite knowledge gaps
- Include time for hands-on practice and projects
- Factor in real-world constraints (work, life balance)
- Provide confidence level based on information available

OUTPUT: Valid JSON matching the exact schema provided.`;

function buildEstimationPrompt(params: EstimateObjectiveParams): string {
  const {
    objectiveTitle,
    objectiveDescription,
    successCriteria,
    requiredSkills,
    learnerProfile,
    userLanguage = 'en'
  } = params;

  const languageMap: Record<string, string> = {
    en: 'English',
    fr: 'French'
  };
  const languageName = languageMap[userLanguage] || 'English';

  const sections: string[] = [
    '=== OBJECTIVE ===',
    `Title: ${objectiveTitle}`,
  ];

  if (objectiveDescription) {
    sections.push(`Description: ${objectiveDescription}`);
  }

  if (successCriteria.length > 0) {
    sections.push(`\nSuccess Criteria:`);
    successCriteria.forEach((criteria, i) => {
      sections.push(`${i + 1}. ${criteria}`);
    });
  }

  if (requiredSkills.length > 0) {
    sections.push(`\nRequired Skills: ${requiredSkills.join(', ')}`);
  }

  if (learnerProfile) {
    sections.push('\n=== LEARNER PROFILE ===');
    sections.push(`Hours per week: ${learnerProfile.hoursPerWeek || 'Not specified'}`);
    
    if (learnerProfile.strengths.length > 0) {
      sections.push(`Strengths: ${learnerProfile.strengths.join(', ')}`);
    }
    
    if (learnerProfile.gaps.length > 0) {
      sections.push(`Knowledge gaps: ${learnerProfile.gaps.join(', ')}`);
    }
    
    if (learnerProfile.blockers.length > 0) {
      sections.push(`Blockers: ${learnerProfile.blockers.join(', ')}`);
    }
    
    if (learnerProfile.goals.length > 0) {
      sections.push(`Goals: ${learnerProfile.goals.join(', ')}`);
    }
  }

  sections.push('\n=== TASK ===');
  sections.push(`Estimate a realistic timeline for completing this objective.`);
  sections.push(`Generate all content (titles, descriptions, reasoning) in ${languageName}.`);
  sections.push(`Keep JSON keys in English.`);
  sections.push('\nProvide:');
  sections.push('1. Total days needed (realistic, achievable)');
  sections.push('2. Daily hours required');
  sections.push('3. Difficulty level');
  sections.push('4. Detailed reasoning for the estimate');
  sections.push('5. Confidence level (low/medium/high)');
  sections.push('6. Breakdown by learning phase');
  sections.push('7. 3-10 milestones with target days and deliverables');
  sections.push('\nReturn ONLY valid JSON matching the schema.');

  return sections.join('\n');
}

// ============================================
// GROQ CLIENT
// ============================================

let groqClient: any = null;

function getGroqClient(): any {
  if (!config.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is required for objective estimation');
  }

  if (!groqClient) {
    groqClient = new Groq({ apiKey: config.GROQ_API_KEY });
  }

  return groqClient;
}

// ============================================
// SERVICE CLASS
// ============================================

class ObjectiveEstimationService {
  /**
   * Estimate realistic timeline for objective completion using AI
   */
  async estimateObjectiveDuration(
    params: EstimateObjectiveParams
  ): Promise<ObjectiveDurationEstimate> {
    const client = getGroqClient();
    const userPrompt = buildEstimationPrompt(params);

    try {
      const completion = await client.chat.completions.create({
        model: config.GROQ_MODEL || 'llama-3.3-70b-versatile',
        temperature: 0.3, // Slightly higher for creative milestone generation
        max_tokens: 2048,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: ESTIMATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt }
        ]
      });

      const content = completion?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('Empty response from AI estimation service');
      }

      // Parse and validate
      const rawEstimate = JSON.parse(content);
      const validated = ObjectiveDurationEstimateSchema.parse(rawEstimate);

      // Ensure breakdown sums to total days
      const breakdownSum = Object.values(validated.breakdown).reduce((a, b) => a + b, 0);
      if (Math.abs(breakdownSum - validated.estimatedTotalDays) > 2) {
        console.warn('[objectiveEstimation] Breakdown sum mismatch, adjusting', {
          breakdownSum,
          estimatedTotalDays: validated.estimatedTotalDays
        });
        // Adjust proportionally
        const ratio = validated.estimatedTotalDays / breakdownSum;
        validated.breakdown = {
          fundamentals: Math.round(validated.breakdown.fundamentals * ratio),
          intermediate: Math.round(validated.breakdown.intermediate * ratio),
          advanced: Math.round(validated.breakdown.advanced * ratio),
          projects: Math.round(validated.breakdown.projects * ratio),
          review: Math.round(validated.breakdown.review * ratio)
        };
      }

      // Sort milestones by target day
      validated.milestones.sort((a, b) => a.targetDay - b.targetDay);

      return validated;
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('[objectiveEstimation] Validation error:', error.errors);
        throw new Error(`Invalid estimation response: ${error.errors.map(e => e.message).join(', ')}`);
      }

      if (error instanceof SyntaxError) {
        console.error('[objectiveEstimation] JSON parse error:', error);
        throw new Error('Failed to parse AI estimation response');
      }

      console.error('[objectiveEstimation] Estimation failed:', error);
      throw error;
    }
  }

  /**
   * Re-estimate based on actual progress (for recalibration)
   */
  async recalibrateEstimate(params: {
    originalEstimate: ObjectiveDurationEstimate;
    completedDays: number;
    actualPerformance: number; // 0-1 scale (tasks completed / total tasks)
    strugglingAreas?: string[];
  }): Promise<ObjectiveDurationEstimate> {
    const { originalEstimate, completedDays, actualPerformance, strugglingAreas = [] } = params;

    // Calculate velocity (actual vs expected)
    const expectedProgress = completedDays / originalEstimate.estimatedTotalDays;
    const velocity = actualPerformance / expectedProgress;

    // Adjust remaining days based on velocity
    const remainingDays = originalEstimate.estimatedTotalDays - completedDays;
    const adjustedRemainingDays = Math.round(remainingDays / velocity);
    const newTotalDays = completedDays + adjustedRemainingDays;

    // Adjust confidence based on performance
    let newConfidence: 'low' | 'medium' | 'high' = originalEstimate.confidence;
    if (Math.abs(velocity - 1) > 0.3) {
      newConfidence = 'low'; // Significant deviation
    } else if (Math.abs(velocity - 1) > 0.15) {
      newConfidence = 'medium';
    } else {
      newConfidence = 'high'; // On track
    }

    // Adjust milestones
    const adjustedMilestones = originalEstimate.milestones.map(milestone => {
      if (milestone.targetDay <= completedDays) {
        return milestone; // Already passed
      }
      const daysFromNow = milestone.targetDay - completedDays;
      const adjustedDaysFromNow = Math.round(daysFromNow / velocity);
      return {
        ...milestone,
        targetDay: completedDays + adjustedDaysFromNow
      };
    });

    return {
      ...originalEstimate,
      estimatedTotalDays: newTotalDays,
      confidence: newConfidence,
      reasoning: `${originalEstimate.reasoning}\n\nRECALIBRATED: Based on ${completedDays} days completed with ${(actualPerformance * 100).toFixed(1)}% task completion rate (velocity: ${velocity.toFixed(2)}x). ${strugglingAreas.length > 0 ? `Struggling with: ${strugglingAreas.join(', ')}.` : ''}`,
      milestones: adjustedMilestones
    };
  }

  /**
   * Generate a fallback estimate when AI is unavailable
   */
  generateFallbackEstimate(params: EstimateObjectiveParams): ObjectiveDurationEstimate {
    const { objectiveTitle, requiredSkills, learnerProfile } = params;

    // Simple heuristic: 1 skill = 7-14 days depending on profile
    const baseSkillDays = requiredSkills.length > 0 ? requiredSkills.length * 10 : 30;
    
    // Adjust based on learner profile
    let multiplier = 1.0;
    if (learnerProfile) {
      const hasRelevantStrengths = learnerProfile.strengths.some(strength =>
        requiredSkills.some(skill => 
          skill.toLowerCase().includes(strength.toLowerCase()) ||
          strength.toLowerCase().includes(skill.toLowerCase())
        )
      );
      
      if (hasRelevantStrengths) {
        multiplier *= 0.7; // 30% faster if has relevant strengths
      }
      
      if (learnerProfile.gaps.length > 3) {
        multiplier *= 1.3; // 30% slower if many gaps
      }
      
      if (learnerProfile.hoursPerWeek && learnerProfile.hoursPerWeek < 10) {
        multiplier *= 1.2; // 20% slower if limited time
      }
    }

    const estimatedTotalDays = Math.round(baseSkillDays * multiplier);
    const fundamentalsDays = Math.round(estimatedTotalDays * 0.3);
    const intermediateDays = Math.round(estimatedTotalDays * 0.25);
    const advancedDays = Math.round(estimatedTotalDays * 0.2);
    const projectsDays = Math.round(estimatedTotalDays * 0.15);
    const reviewDays = estimatedTotalDays - (fundamentalsDays + intermediateDays + advancedDays + projectsDays);

    return {
      estimatedTotalDays,
      estimatedDailyHours: learnerProfile?.hoursPerWeek ? learnerProfile.hoursPerWeek / 7 : 2,
      difficulty: estimatedTotalDays > 60 ? 'advanced' : estimatedTotalDays > 30 ? 'intermediate' : 'beginner',
      reasoning: `Fallback estimate based on ${requiredSkills.length} required skills and learner profile. This is a conservative estimate.`,
      confidence: 'low',
      breakdown: {
        fundamentals: fundamentalsDays,
        intermediate: intermediateDays,
        advanced: advancedDays,
        projects: projectsDays,
        review: reviewDays
      },
      milestones: [
        {
          title: `${objectiveTitle} - Fundamentals`,
          description: 'Complete foundational concepts and basic exercises',
          targetDay: fundamentalsDays,
          estimatedHours: fundamentalsDays * 2,
          deliverables: ['Basic exercises completed', 'Core concepts understood']
        },
        {
          title: `${objectiveTitle} - Intermediate Skills`,
          description: 'Build on fundamentals with more complex topics',
          targetDay: fundamentalsDays + intermediateDays,
          estimatedHours: intermediateDays * 2,
          deliverables: ['Intermediate exercises completed', 'Mini-project built']
        },
        {
          title: `${objectiveTitle} - Final Project`,
          description: 'Complete portfolio-ready project demonstrating mastery',
          targetDay: estimatedTotalDays - reviewDays,
          estimatedHours: (advancedDays + projectsDays) * 2,
          deliverables: ['Portfolio project completed', 'Documentation written', 'Code reviewed']
        }
      ]
    };
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const objectiveEstimationService = new ObjectiveEstimationService();
export default objectiveEstimationService;
