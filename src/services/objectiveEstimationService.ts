import Groq from 'groq-sdk';
import { z } from 'zod';
import { config } from '../config/environment.js';
import type { LearnerProfile, Prisma } from '@prisma/client';

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

function extractTechnicalLevelSummary(technicalLevel: Prisma.JsonValue | null | undefined): {
  overall?: string;
  score?: number;
  flags: string[];
} | null {
  if (!technicalLevel || typeof technicalLevel !== 'object') {
    return null;
  }

  try {
    const raw = technicalLevel as Record<string, unknown>;
    const overall = typeof raw.overall === 'string' ? raw.overall : undefined;
    const score = typeof raw.score === 'number' ? raw.score : undefined;
    const flagsRaw = raw.flags;
    const flags: string[] = Array.isArray(flagsRaw)
      ? flagsRaw.filter((value): value is string => typeof value === 'string')
      : [];

    return {
      overall,
      score,
      flags
    };
  } catch (error) {
    console.warn('[objectiveEstimation] Failed to parse technical level summary', error);
    return null;
  }
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

export interface ObjectiveContextInput {
  priorKnowledge?: string[];
  relatedSkills?: string[];
  focusAreas?: string[];
  urgency?: string;
  depthPreference?: string;
  deadline?: string;
  domainExperience?: string;
  timeCommitmentHours?: number;
  notes?: string;
}

export interface EstimateObjectiveParams {
  objectiveTitle: string;
  objectiveDescription?: string;
  successCriteria: string[];
  requiredSkills: string[];
  learnerProfile?: LearnerProfile | null;
  userLanguage?: string;
  context?: ObjectiveContextInput;
  technicalLevel?: Prisma.JsonValue | null;
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
    userLanguage = 'en',
    context,
    technicalLevel
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

  if (context) {
    sections.push('\n=== LEARNER CONTEXT ===');
    if (context.priorKnowledge?.length) {
      sections.push(`Existing knowledge: ${context.priorKnowledge.join(', ')}`);
    }
    if (context.relatedSkills?.length) {
      sections.push(`Related skills: ${context.relatedSkills.join(', ')}`);
    }
    if (context.focusAreas?.length) {
      sections.push(`Focus areas: ${context.focusAreas.join(', ')}`);
    }
    if (context.domainExperience) {
      sections.push(`Domain experience: ${context.domainExperience}`);
    }
    if (context.timeCommitmentHours) {
      sections.push(`Time commitment: ${context.timeCommitmentHours} hours per week`);
    }
    if (context.urgency) {
      sections.push(`Urgency: ${context.urgency}`);
    }
    if (context.depthPreference) {
      sections.push(`Depth preference: ${context.depthPreference}`);
    }
    if (context.deadline) {
      const deadline = new Date(context.deadline);
      if (!Number.isNaN(deadline.getTime())) {
        sections.push(`Target deadline: ${deadline.toISOString()}`);
      }
    }
    if (context.notes) {
      sections.push(`Additional notes: ${context.notes}`);
    }
  }

  const technicalSummary = extractTechnicalLevelSummary(technicalLevel);
  if (technicalSummary) {
    sections.push('\n=== TECHNICAL ASSESSMENT ===');
    if (technicalSummary.overall) {
      sections.push(`Assessed level: ${technicalSummary.overall}`);
    }
    if (typeof technicalSummary.score === 'number') {
      sections.push(`Proficiency score: ${technicalSummary.score}`);
    }
    if (technicalSummary.flags.length > 0) {
      sections.push(`Flags: ${technicalSummary.flags.join(', ')}`);
    }
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

      // Parse and transform AI response to expected format
      const rawEstimate = JSON.parse(content);
      console.log('[objectiveEstimation] Raw AI response:', JSON.stringify(rawEstimate, null, 2));
      
      // Transform AI response to match our schema
      const transformed = this.transformAIResponse(rawEstimate);
      const validated = ObjectiveDurationEstimateSchema.parse(transformed);

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

      const availabilityHours = params.learnerProfile?.hoursPerWeek ?? null;
      if (availabilityHours) {
        const hoursPerDay = availabilityHours / 7;
        const maxDailyHours = Math.min(Math.max(hoursPerDay, 1), 4);
        if (validated.estimatedDailyHours > maxDailyHours) {
          validated.estimatedDailyHours = Number(maxDailyHours.toFixed(1));
        }
      }

      const MAX_TOTAL_DAYS = 120;
      if (validated.estimatedTotalDays > MAX_TOTAL_DAYS) {
        const ratio = MAX_TOTAL_DAYS / validated.estimatedTotalDays;
        validated.estimatedTotalDays = MAX_TOTAL_DAYS;
        validated.breakdown = {
          fundamentals: Math.round(validated.breakdown.fundamentals * ratio),
          intermediate: Math.round(validated.breakdown.intermediate * ratio),
          advanced: Math.round(validated.breakdown.advanced * ratio),
          projects: Math.round(validated.breakdown.projects * ratio),
          review: Math.round(validated.breakdown.review * ratio)
        };
        validated.milestones = validated.milestones.map((milestone) => ({
          ...milestone,
          targetDay: Math.min(Math.round(milestone.targetDay * ratio), MAX_TOTAL_DAYS)
        }));
      }

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
   * Transform AI response to match our expected schema using smart pattern matching
   */
  private transformAIResponse(raw: any): any {
    // Smart field finder - matches fields by pattern
    const findField = (patterns: string[]): any => {
      for (const key of Object.keys(raw)) {
        const lowerKey = key.toLowerCase();
        if (patterns.some(pattern => lowerKey.includes(pattern))) {
          return raw[key];
        }
      }
      return null;
    };

    // Find total days (matches: total_days, total_days_needed, totalDays, etc.)
    const totalDays = findField(['total', 'days']) || 30;
    
    // Find daily hours (matches: daily_hours, daily_hours_required, dailyHours, hours_per_day, etc.)
    const dailyHours = findField(['daily', 'hours']) || findField(['hours', 'day']) || 2;
    
    // Find difficulty (matches: difficulty_level, difficulty, difficultyLevel, etc.)
    const difficultyRaw = findField(['difficulty']) || 'medium';
    const difficulty = difficultyRaw === 'high' ? 'advanced' : 
                      difficultyRaw === 'medium' ? 'intermediate' : 'beginner';
    
    // Find reasoning (matches: detailed_reasoning, reasoning, rationale, etc.)
    const reasoning = findField(['reasoning', 'rationale']) || 'AI-generated estimation';
    
    // Find confidence (matches: confidence_level, confidence, confidenceLevel, etc.)
    const confidence = findField(['confidence']) || 'medium';
    
    // Find breakdown (matches: breakdown_by_phase, breakdown_by_learning_phase, breakdown, phases, etc.)
    const breakdownRaw = findField(['breakdown']) || findField(['phase']) || [];
    
    // Handle both array and object formats
    let breakdown: any;
    if (Array.isArray(breakdownRaw)) {
      // Array format: [{phase: "...", days: 30}, ...]
      breakdown = {
        fundamentals: breakdownRaw[0]?.days || 0,
        intermediate: breakdownRaw[1]?.days || 0,
        advanced: breakdownRaw[2]?.days || 0,
        projects: breakdownRaw[3]?.days || 0,
        review: breakdownRaw[4]?.days || 0
      };
    } else if (typeof breakdownRaw === 'object' && breakdownRaw !== null) {
      // Object format: {phase1: {days: 30}, phase2: {days: 20}, ...}
      const phases = Object.values(breakdownRaw);
      breakdown = {
        fundamentals: (phases[0] as any)?.days || 0,
        intermediate: (phases[1] as any)?.days || 0,
        advanced: (phases[2] as any)?.days || 0,
        projects: (phases[3] as any)?.days || 0,
        review: (phases[4] as any)?.days || 0
      };
    } else {
      // Fallback
      breakdown = {
        fundamentals: 0,
        intermediate: 0,
        advanced: 0,
        projects: 0,
        review: 0
      };
    }

    // Transform milestones with smart field matching
    const milestones = (raw.milestones || []).map((m: any, index: number) => {
      // Find deliverable field (matches: deliverables, deliverable, output, etc.)
      const deliverableRaw = m.deliverables || m.deliverable || m.output || `Milestone ${index + 1} deliverable`;
      const deliverableArray = typeof deliverableRaw === 'string' ? [deliverableRaw] : deliverableRaw;
      
      // Find target day (matches: target_days, targetDay, day, target, etc.)
      const targetDay = m.target_days || m.targetDay || m.day || m.target || 0;
      
      // Ensure description is at least 10 characters
      const description = typeof deliverableRaw === 'string' && deliverableRaw.length >= 10 
        ? deliverableRaw 
        : `Complete milestone ${index + 1}: ${deliverableRaw}`;
      
      return {
        title: `Milestone ${index + 1}`,
        description,
        targetDay,
        estimatedHours: Math.max(0.5, dailyHours * 7), // Ensure minimum 0.5 hours
        deliverables: deliverableArray
      };
    });

    return {
      estimatedTotalDays: Math.max(1, Number(totalDays) || 30), // Ensure minimum 1 day
      estimatedDailyHours: Math.max(0.5, Number(dailyHours) || 2), // Ensure minimum 0.5 hours
      difficulty,
      reasoning,
      confidence,
      breakdown,
      milestones
    };
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

    const safeTotalDays = Math.max(originalEstimate.estimatedTotalDays, 1);
    const expectedProgress = safeTotalDays > 0 ? completedDays / safeTotalDays : 0;
    const normalizedActual = Math.max(0, actualPerformance);
    const rawVelocity = expectedProgress > 0 ? normalizedActual / expectedProgress : normalizedActual;
    const velocity = Math.min(Math.max(Number.isFinite(rawVelocity) && rawVelocity > 0 ? rawVelocity : 0.2, 0.2), 3);

    const remainingDays = Math.max(safeTotalDays - completedDays, 0);
    const adjustedRemainingDays = Math.round(remainingDays / velocity);
    const newTotalDays = Math.max(completedDays + adjustedRemainingDays, completedDays);

    const baselineDailyHours = originalEstimate.estimatedDailyHours;
    const recalibratedDailyHours = Math.max(0.5, Math.min(8, baselineDailyHours * velocity));

    // Adjust confidence based on performance
    let newConfidence: 'low' | 'medium' | 'high' = originalEstimate.confidence;
    const velocityDeviation = Math.abs(velocity - 1);
    if (velocityDeviation > 0.35) {
      newConfidence = 'low'; // Significant deviation
    } else if (velocityDeviation > 0.2) {
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
      estimatedDailyHours: Number(recalibratedDailyHours.toFixed(1)),
      confidence: newConfidence,
      reasoning: `${originalEstimate.reasoning}\n\nRECALIBRATED: Based on ${completedDays} days completed with ${(normalizedActual * 100).toFixed(1)}% task completion rate (velocity: ${velocity.toFixed(2)}x). ${strugglingAreas.length > 0 ? `Struggling with: ${strugglingAreas.join(', ')}.` : ''}`,
      milestones: adjustedMilestones
    };
  }

  /**
   * Generate a fallback estimate when AI is unavailable
   */
  generateFallbackEstimate(params: EstimateObjectiveParams): ObjectiveDurationEstimate {
    const { objectiveTitle, requiredSkills, learnerProfile, context, technicalLevel } = params;

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

    if (context?.timeCommitmentHours && context.timeCommitmentHours < 10) {
      multiplier *= 1.15;
    }

    if (context?.urgency) {
      const urgency = context.urgency.toLowerCase();
      if (urgency.includes('urgent') || urgency.includes('rush') || urgency.includes('deadline')) {
        multiplier *= 0.85; // speed up under urgency
      }
    }

    const technicalSummary = extractTechnicalLevelSummary(technicalLevel ?? null);
    if (technicalSummary?.overall === 'absolute_beginner') {
      multiplier *= 1.3;
    } else if (technicalSummary?.overall === 'advanced') {
      multiplier *= 0.85;
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
      reasoning: `Fallback estimate based on ${requiredSkills.length} required skills, learner profile, and captured context. This is a conservative estimate adjusted for time commitment and urgency when provided.`,
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
