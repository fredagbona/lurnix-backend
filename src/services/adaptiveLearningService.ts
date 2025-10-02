import Groq from 'groq-sdk';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { config } from '../config/environment.js';
import skillTrackingService from './skillTrackingService.js';

const prisma = new PrismaClient();
const groq = new Groq({ apiKey: config.groqApiKey });

// ============================================
// INTERFACES
// ============================================

export interface AdaptationDecision {
  shouldAdjust: boolean;
  adjustmentType: 'increase' | 'decrease' | 'maintain';
  newDifficulty: number; // 0-100
  newVelocity: number; // Multiplier
  reasoning: string;
  recommendations: string[];
  estimatedDaysChange?: number; // +/- days
}

export interface PerformanceAnalysis {
  averageScore: number;
  trend: 'improving' | 'stable' | 'declining';
  consistentlyHigh: boolean; // 3+ sprints > 90%
  consistentlyLow: boolean; // 3+ sprints < 70%
  strugglingSkills: string[];
  masteredSkills: string[];
  recommendedAction: 'speed_up' | 'slow_down' | 'maintain' | 'review';
}

export interface DifficultyAdjustment {
  adjustedSprint: any;
  adjustmentsMade: string[];
  difficultyChange: number;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const AdaptationDecisionSchema = z.object({
  shouldAdjust: z.boolean(),
  adjustmentType: z.enum(['increase', 'decrease', 'maintain']),
  newDifficulty: z.number().min(0).max(100),
  newVelocity: z.number().min(0.5).max(2.0),
  reasoning: z.string().min(20),
  recommendations: z.array(z.string()).min(1).max(5),
  estimatedDaysChange: z.number().optional(),
});

// ============================================
// AI PROMPTS
// ============================================

const ADAPTATION_SYSTEM_PROMPT = `You are an adaptive learning AI that adjusts difficulty and pacing based on learner performance.

Your goal is to optimize learning speed while maintaining comprehension and preventing burnout.

ADAPTATION RULES:
1. If average score > 90% for 3+ sprints → Increase difficulty by 15-20 points, speed up by 20-30%
2. If average score < 70% for 2+ sprints → Decrease difficulty by 15-20 points, slow down by 20-30%
3. If scores are 70-90% → Maintain current difficulty and pace
4. Consider trend: improving = be cautious with increases, declining = act quickly to decrease
5. Factor in struggling skills: more struggling = more decrease needed
6. Factor in mastered skills: more mastered = can increase faster

OUTPUT: Valid JSON matching the schema exactly.`;

// ============================================
// ADAPTIVE LEARNING SERVICE
// ============================================

class AdaptiveLearningService {
  /**
   * Analyze performance and decide if adaptation is needed
   */
  async analyzePerformance(params: {
    objectiveId: string;
    userId: string;
    recentSprintCount?: number; // Default: last 5 sprints
  }): Promise<PerformanceAnalysis> {
    const { objectiveId, userId, recentSprintCount = 5 } = params;

    // Get recent completed sprints
    const recentSprints = await prisma.sprint.findMany({
      where: {
        objectiveId,
        status: 'reviewed',
        score: { not: null },
      },
      orderBy: { completedAt: 'desc' },
      take: recentSprintCount,
    });

    if (recentSprints.length === 0) {
      return {
        averageScore: 0,
        trend: 'stable',
        consistentlyHigh: false,
        consistentlyLow: false,
        strugglingSkills: [],
        masteredSkills: [],
        recommendedAction: 'maintain',
      };
    }

    // Calculate average score
    const scores = recentSprints.map((s) => s.score!);
    const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

    // Determine trend
    const trend = this.determineTrend(scores);

    // Check consistency
    const consistentlyHigh = scores.filter((s) => s >= 90).length >= Math.min(3, scores.length);
    const consistentlyLow = scores.filter((s) => s < 70).length >= Math.min(2, scores.length);

    // Get struggling and mastered skills
    const skillMap = await skillTrackingService.getUserSkillMap(userId, objectiveId);
    const strugglingSkills = skillMap.strugglingAreas;
    const masteredSkills = skillMap.masteredSkills;

    // Determine recommended action
    let recommendedAction: 'speed_up' | 'slow_down' | 'maintain' | 'review';
    if (consistentlyHigh && strugglingSkills.length === 0) {
      recommendedAction = 'speed_up';
    } else if (consistentlyLow || strugglingSkills.length >= 3) {
      recommendedAction = 'slow_down';
    } else if (strugglingSkills.length > 0) {
      recommendedAction = 'review';
    } else {
      recommendedAction = 'maintain';
    }

    return {
      averageScore,
      trend,
      consistentlyHigh,
      consistentlyLow,
      strugglingSkills,
      masteredSkills,
      recommendedAction,
    };
  }

  /**
   * Recalibrate learning path based on performance
   */
  async recalibrateLearningPath(params: {
    objectiveId: string;
    userId: string;
    performanceAnalysis: PerformanceAnalysis;
  }): Promise<AdaptationDecision> {
    const { objectiveId, userId, performanceAnalysis } = params;

    // Get current objective state
    const objective = await prisma.objective.findUnique({
      where: { id: objectiveId },
      select: {
        currentDifficulty: true,
        learningVelocity: true,
        estimatedTotalDays: true,
        completedDays: true,
      },
    });

    if (!objective) {
      throw new Error(`Objective ${objectiveId} not found`);
    }

    // Build AI prompt
    const userPrompt = `CURRENT STATE:
- Current Difficulty: ${objective.currentDifficulty}/100
- Learning Velocity: ${objective.learningVelocity}x
- Days Completed: ${objective.completedDays}
- Estimated Total Days: ${objective.estimatedTotalDays}

PERFORMANCE ANALYSIS:
- Average Score: ${performanceAnalysis.averageScore.toFixed(1)}%
- Trend: ${performanceAnalysis.trend}
- Consistently High (>90%): ${performanceAnalysis.consistentlyHigh}
- Consistently Low (<70%): ${performanceAnalysis.consistentlyLow}
- Struggling Skills: ${performanceAnalysis.strugglingSkills.join(', ') || 'None'}
- Mastered Skills: ${performanceAnalysis.masteredSkills.join(', ') || 'None'}
- Recommended Action: ${performanceAnalysis.recommendedAction}

Decide if and how to adapt the learning path.`;

    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: ADAPTATION_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 1000,
        response_format: { type: 'json_object' },
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new Error('No response from AI');
      }

      const parsed = JSON.parse(responseContent);
      const decision = AdaptationDecisionSchema.parse(parsed);

      // Apply adaptation if needed
      if (decision.shouldAdjust) {
        await this.applyAdaptation(objectiveId, decision);
      }

      return decision;
    } catch (error) {
      console.error('Recalibration failed:', error);
      // Fallback to rule-based adaptation
      return this.ruleBasedAdaptation(objective, performanceAnalysis);
    }
  }

  /**
   * Adjust next sprint difficulty
   */
  async adjustNextSprintDifficulty(params: {
    objectiveId: string;
    userId: string;
    nextSprintId: string;
    currentPerformance: PerformanceAnalysis;
  }): Promise<DifficultyAdjustment> {
    const { nextSprintId, currentPerformance } = params;

    const sprint = await prisma.sprint.findUnique({
      where: { id: nextSprintId },
    });

    if (!sprint) {
      throw new Error(`Sprint ${nextSprintId} not found`);
    }

    const currentDifficulty = sprint.difficultyScore;
    let newDifficulty = currentDifficulty;
    let adjustmentType: string;
    const adjustmentsMade: string[] = [];

    // Adjust based on performance
    if (currentPerformance.consistentlyHigh) {
      newDifficulty = Math.min(100, currentDifficulty + 20);
      adjustmentType = 'increased';
      adjustmentsMade.push('Increased complexity due to high performance');
      adjustmentsMade.push('Added advanced concepts');
      adjustmentsMade.push('Reduced basic explanations');
    } else if (currentPerformance.consistentlyLow) {
      newDifficulty = Math.max(0, currentDifficulty - 20);
      adjustmentType = 'decreased';
      adjustmentsMade.push('Decreased complexity due to struggling');
      adjustmentsMade.push('Added more examples and practice');
      adjustmentsMade.push('Broke down complex concepts');
    } else {
      adjustmentType = 'maintained';
      adjustmentsMade.push('Maintained current difficulty level');
    }

    // Update sprint
    const updatedSprint = await prisma.sprint.update({
      where: { id: nextSprintId },
      data: {
        difficultyScore: newDifficulty,
        adaptedFrom: adjustmentType,
        adaptationReason: adjustmentsMade.join('; '),
      },
    });

    // Create adaptation record
    await prisma.sprintAdaptation.create({
      data: {
        sprintId: nextSprintId,
        baseDifficulty: Math.round(currentDifficulty),
        adjustedDifficulty: Math.round(newDifficulty),
        adjustmentReason: adjustmentsMade.join('; '),
        adjustments: {
          type: adjustmentType,
          changes: adjustmentsMade,
        },
      },
    });

    return {
      adjustedSprint: updatedSprint,
      adjustmentsMade,
      difficultyChange: newDifficulty - currentDifficulty,
    };
  }

  /**
   * Adjust total estimated days based on velocity
   */
  async adjustEstimatedDays(params: {
    objectiveId: string;
    currentVelocity: number;
    completedDays: number;
    remainingDays: number;
  }): Promise<{
    newEstimatedTotalDays: number;
    daysAdjustment: number;
    newCompletionDate: Date;
    reasoning: string;
  }> {
    const { objectiveId, currentVelocity, completedDays, remainingDays } = params;

    // Calculate adjusted remaining days based on velocity
    const adjustedRemainingDays = Math.round(remainingDays / currentVelocity);
    const newEstimatedTotalDays = completedDays + adjustedRemainingDays;
    const daysAdjustment = newEstimatedTotalDays - (completedDays + remainingDays);

    // Calculate new completion date
    const newCompletionDate = new Date();
    newCompletionDate.setDate(newCompletionDate.getDate() + adjustedRemainingDays);

    const reasoning =
      currentVelocity > 1.0
        ? `Learning ${Math.round((currentVelocity - 1) * 100)}% faster than expected. Reducing total days by ${Math.abs(daysAdjustment)}.`
        : currentVelocity < 1.0
        ? `Learning ${Math.round((1 - currentVelocity) * 100)}% slower than expected. Adding ${Math.abs(daysAdjustment)} more days.`
        : 'On track with original estimate.';

    // Update objective
    await prisma.objective.update({
      where: { id: objectiveId },
      data: {
        estimatedTotalDays: newEstimatedTotalDays,
      },
    });

    return {
      newEstimatedTotalDays,
      daysAdjustment,
      newCompletionDate,
      reasoning,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Determine performance trend from scores
   */
  private determineTrend(scores: number[]): 'improving' | 'stable' | 'declining' {
    if (scores.length < 2) return 'stable';

    // Calculate simple linear trend
    const firstHalf = scores.slice(0, Math.ceil(scores.length / 2));
    const secondHalf = scores.slice(Math.floor(scores.length / 2));

    const firstAvg = firstHalf.reduce((sum, s) => sum + s, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s, 0) / secondHalf.length;

    const difference = secondAvg - firstAvg;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  /**
   * Apply adaptation decision to objective
   */
  private async applyAdaptation(objectiveId: string, decision: AdaptationDecision) {
    const objective = await prisma.objective.findUnique({
      where: { id: objectiveId },
    });

    if (!objective) return;

    // Create adaptation record
    await prisma.objectiveAdaptation.create({
      data: {
        objectiveId,
        initialEstimatedDays: objective.estimatedTotalDays || 0,
        currentEstimatedDays: objective.estimatedTotalDays! + (decision.estimatedDaysChange || 0),
        adjustmentReason: decision.reasoning,
        averageScore: 0, // Will be calculated from sprints
        completionRate: 0, // Will be calculated from sprints
        velocityMultiplier: decision.newVelocity,
        difficultyLevel: decision.newDifficulty,
        lastAdjustedAt: new Date(),
        adjustmentCount: objective.recalibrationCount + 1,
      },
    });

    // Update objective
    await prisma.objective.update({
      where: { id: objectiveId },
      data: {
        currentDifficulty: decision.newDifficulty,
        learningVelocity: decision.newVelocity,
        lastRecalibrationAt: new Date(),
        recalibrationCount: objective.recalibrationCount + 1,
        estimatedTotalDays: decision.estimatedDaysChange
          ? objective.estimatedTotalDays! + decision.estimatedDaysChange
          : objective.estimatedTotalDays,
      },
    });
  }

  /**
   * Rule-based adaptation fallback
   */
  private ruleBasedAdaptation(
    objective: any,
    performance: PerformanceAnalysis
  ): AdaptationDecision {
    let adjustmentType: 'increase' | 'decrease' | 'maintain' = 'maintain';
    let newDifficulty = objective.currentDifficulty;
    let newVelocity = objective.learningVelocity;
    const recommendations: string[] = [];

    if (performance.consistentlyHigh) {
      adjustmentType = 'increase';
      newDifficulty = Math.min(100, objective.currentDifficulty + 20);
      newVelocity = Math.min(2.0, objective.learningVelocity * 1.3);
      recommendations.push('Increase difficulty and pace');
      recommendations.push('Add more advanced concepts');
      recommendations.push('Skip redundant practice');
    } else if (performance.consistentlyLow) {
      adjustmentType = 'decrease';
      newDifficulty = Math.max(0, objective.currentDifficulty - 20);
      newVelocity = Math.max(0.5, objective.learningVelocity * 0.7);
      recommendations.push('Decrease difficulty and slow down');
      recommendations.push('Add more examples and practice');
      recommendations.push('Review fundamentals');
    } else {
      recommendations.push('Maintain current pace');
    }

    return {
      shouldAdjust: adjustmentType !== 'maintain',
      adjustmentType,
      newDifficulty,
      newVelocity,
      reasoning: `Rule-based adaptation: ${adjustmentType} based on performance`,
      recommendations,
      estimatedDaysChange: adjustmentType === 'increase' ? -10 : adjustmentType === 'decrease' ? 10 : 0,
    };
  }
}

export default new AdaptiveLearningService();
