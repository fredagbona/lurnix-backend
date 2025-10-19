import { PrismaClient } from '@prisma/client';
import skillExtractionService from '../skillExtractionService.js';
import skillTrackingService from '../skillTrackingService.js';
import { adaptiveLearningService, knowledgeValidationService, quizGenerationService } from '../assessment';
import spacedRepetitionService from '../spacedRepetitionService.js';
import { translateKey } from '../../utils/translationUtils.js';

const prisma = new PrismaClient();

// ============================================
// INTERFACES
// ============================================

export interface BrainAdaptiveCompletionResult {
  skillsUpdated: Array<{
    skillId: string;
    skillName: string;
    previousLevel: number;
    newLevel: number;
    statusChanged: boolean;
    newStatus: string;
    masteredNow: boolean;
  }>;
  performanceAnalysis: {
    averageScore: number;
    trend: string;
    recommendedAction: string;
  };
  adaptationApplied: boolean;
  adaptationDetails?: {
    newDifficulty: number;
    newVelocity: number;
    reasoning: string;
  };
  nextSprintAdjusted: boolean;
  reviewSprintNeeded: boolean;
  reviewSkills?: string[];
  notifications: Array<{
    type: string;
    title: string;
    message: string;
  }>;
}

// ============================================
// BRAIN-ADAPTIVE INTEGRATION SERVICE
// ============================================

class BrainAdaptiveIntegrationService {
  /**
   * Process sprint completion with all brain-adaptive features
   * This is called AFTER basic sprint completion
   */
  async processSprintCompletion(params: {
    sprintId: string;
    userId: string;
    score: number;
    completionData: any;
    userLanguage?: string;
  }): Promise<BrainAdaptiveCompletionResult> {
    const { sprintId, userId, score, userLanguage = 'en' } = params;

    console.log(`🧠 [Brain-Adaptive] Processing sprint completion for sprint ${sprintId}`);

    // Get sprint details
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        objective: true,
        skills: { include: { skill: true } },
      },
    });

    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found`);
    }

    const notifications: Array<{ type: string; title: string; message: string }> = [];

    // ============================================
    // STEP 1: EXTRACT SKILLS (if not already done)
    // ============================================
    let skillIds: string[] = [];

    if (sprint.skills.length === 0) {
      console.log('📚 [Brain-Adaptive] Extracting skills from sprint content...');

      try {
        const extraction = await skillExtractionService.extractAndMapSkills({
          sprintTitle: (sprint.plannerOutput as any).title || 'Sprint',
          sprintDescription: (sprint.plannerOutput as any).description,
          sprintTasks: (sprint.plannerOutput as any).microTasks || [],
          objectiveContext: sprint.objective.title,
          dayNumber: (sprint as any).dayNumber,
          language: userLanguage,
        });

        // Link extracted skills to sprint
        for (const mapped of extraction.mappedSkills) {
          await prisma.sprintSkill.create({
            data: {
              sprintId: sprint.id,
              skillId: mapped.skillId,
              targetLevel: mapped.targetLevel,
              practiceType: mapped.practiceType,
              preSprintLevel: 0,
            },
          });
        }

        skillIds = extraction.mappedSkills.map((m) => m.skillId);
        console.log(`✅ [Brain-Adaptive] Extracted ${extraction.extractedSkills.length} skills`);
      } catch (error) {
        console.error('❌ [Brain-Adaptive] Skill extraction failed:', error);
        // Continue without skill extraction
      }
    } else {
      skillIds = sprint.skills.map((ss) => ss.skillId);
    }

    // ============================================
    // STEP 2: UPDATE SKILL LEVELS
    // ============================================
    console.log('📊 [Brain-Adaptive] Updating skill levels...');

    const skillScores = skillIds.map((skillId) => ({
      skillId,
      score,
    }));

    const skillUpdates = await skillTrackingService.updateSkillsFromSprint({
      userId,
      sprintId: sprint.id,
      skillScores,
    });

    console.log(`✅ [Brain-Adaptive] Updated ${skillUpdates.length} skills`);

    // Add notifications for mastered skills
    for (const update of skillUpdates) {
      if (update.masteredNow) {
        const title = translateKey('brainAdaptive.notifications.skillMastered', { language: userLanguage });
        const message = translateKey('brainAdaptive.notifications.skillMasteredMessage', {
          language: userLanguage,
          interpolation: { skillName: update.skillName },
        });
        
        notifications.push({
          type: 'skill_mastered',
          title: title.message,
          message: message.message,
        });
      }
    }

    // ============================================
    // STEP 3: ANALYZE PERFORMANCE
    // ============================================
    console.log('🔍 [Brain-Adaptive] Analyzing performance...');

    const performanceAnalysis = await adaptiveLearningService.analyzePerformance({
      objectiveId: sprint.objectiveId,
      userId,
      recentSprintCount: 5,
    });

    console.log(`📈 [Brain-Adaptive] Performance: ${performanceAnalysis.averageScore.toFixed(1)}% (${performanceAnalysis.trend})`);

    // ============================================
    // STEP 4: RECALIBRATE IF NEEDED
    // ============================================
    let adaptationApplied = false;
    let adaptationDetails;

    if (performanceAnalysis.recommendedAction !== 'maintain') {
      console.log('⚙️ [Brain-Adaptive] Recalibrating learning path...');

      try {
        const adaptationDecision = await adaptiveLearningService.recalibrateLearningPath({
          objectiveId: sprint.objectiveId,
          userId,
          performanceAnalysis,
        });

        if (adaptationDecision.shouldAdjust) {
          adaptationApplied = true;
          adaptationDetails = {
            newDifficulty: adaptationDecision.newDifficulty,
            newVelocity: adaptationDecision.newVelocity,
            reasoning: adaptationDecision.reasoning,
          };

          console.log(`🎯 [Brain-Adaptive] Adaptation applied: ${adaptationDecision.adjustmentType}`);

          // Add notification
          if (adaptationDecision.adjustmentType === 'increase') {
            const title = translateKey('brainAdaptive.notifications.difficultyIncreased', { language: userLanguage });
            const message = translateKey('brainAdaptive.notifications.difficultyIncreasedMessage', { language: userLanguage });
            
            notifications.push({
              type: 'difficulty_increased',
              title: title.message,
              message: message.message,
            });
          } else if (adaptationDecision.adjustmentType === 'decrease') {
            const title = translateKey('brainAdaptive.notifications.difficultyDecreased', { language: userLanguage });
            const message = translateKey('brainAdaptive.notifications.difficultyDecreasedMessage', { language: userLanguage });
            
            notifications.push({
              type: 'difficulty_decreased',
              title: title.message,
              message: message.message,
            });
          }
        }
      } catch (error) {
        console.error('❌ [Brain-Adaptive] Recalibration failed:', error);
      }
    }

    // ============================================
    // STEP 5: ADJUST NEXT SPRINT
    // ============================================
    let nextSprintAdjusted = false;

    const nextSprint = await prisma.sprint.findFirst({
      where: {
        objectiveId: sprint.objectiveId,
        dayNumber: (sprint as any).dayNumber + 1,
      },
    });

    if (nextSprint) {
      console.log('🔧 [Brain-Adaptive] Adjusting next sprint difficulty...');

      try {
        await adaptiveLearningService.adjustNextSprintDifficulty({
          objectiveId: sprint.objectiveId,
          userId,
          nextSprintId: nextSprint.id,
          currentPerformance: performanceAnalysis,
        });

        nextSprintAdjusted = true;
        console.log('✅ [Brain-Adaptive] Next sprint adjusted');
      } catch (error) {
        console.error('❌ [Brain-Adaptive] Next sprint adjustment failed:', error);
      }
    }

    // ============================================
    // STEP 6: CHECK FOR REVIEW SPRINT INSERTION
    // ============================================
    console.log('🔄 [Brain-Adaptive] Checking for review sprint needs...');

    const reviewCheck = await spacedRepetitionService.shouldInsertReviewSprint({
      objectiveId: sprint.objectiveId,
      userId,
      currentDay: (sprint as any).dayNumber,
    });

    let reviewSprintNeeded = reviewCheck.shouldInsert;
    let reviewSkills: string[] | undefined;

    if (reviewCheck.shouldInsert && reviewCheck.skillsToReview) {
      console.log(`⚠️ [Brain-Adaptive] ${reviewCheck.reason}`);
      reviewSkills = reviewCheck.skillsToReview;

      const title = translateKey('brainAdaptive.notifications.reviewNeeded', { language: userLanguage });
      const message = translateKey('brainAdaptive.notifications.reviewNeededMessage', {
        language: userLanguage,
        interpolation: { count: reviewCheck.skillsToReview.length },
      });

      notifications.push({
        type: 'review_needed',
        title: title.message,
        message: message.message,
      });
    } else {
      console.log('✅ [Brain-Adaptive] No review sprint needed yet');
    }

    // ============================================
    // STEP 7: UPDATE REVIEW SCHEDULES
    // ============================================
    console.log('📅 [Brain-Adaptive] Updating review schedules...');

    for (const skillId of skillIds) {
      try {
        // Check if schedule exists
        const existingSchedule = await prisma.reviewSchedule.findUnique({
          where: {
            userId_skillId: { userId, skillId },
          },
        });

        if (!existingSchedule) {
          // Create new schedule
          const userSkill = await prisma.userSkill.findUnique({
            where: {
              userId_skillId: { userId, skillId },
            },
          });

          if (userSkill) {
            await spacedRepetitionService.scheduleSkillReview({
              userId,
              skillId,
              initialMasteryLevel: userSkill.level,
            });
          }
        } else {
          // Update existing schedule
          await spacedRepetitionService.updateReviewSchedule({
            userId,
            skillId,
            reviewScore: score,
          });
        }
      } catch (error) {
        console.error(`❌ [Brain-Adaptive] Failed to update review schedule for skill ${skillId}:`, error);
      }
    }

    console.log('✅ [Brain-Adaptive] Review schedules updated');

    // ============================================
    // RETURN COMPREHENSIVE RESULT
    // ============================================
    return {
      skillsUpdated: skillUpdates,
      performanceAnalysis: {
        averageScore: performanceAnalysis.averageScore,
        trend: performanceAnalysis.trend,
        recommendedAction: performanceAnalysis.recommendedAction,
      },
      adaptationApplied,
      adaptationDetails,
      nextSprintAdjusted,
      reviewSprintNeeded,
      reviewSkills,
      notifications,
    };
  }

  /**
   * Generate post-sprint quiz
   */
  async generatePostSprintQuiz(params: {
    sprintId: string;
    skillIds: string[];
  }) {
    const { sprintId, skillIds } = params;

    console.log(`📝 [Brain-Adaptive] Generating post-sprint quiz for sprint ${sprintId}`);

    try {
      const quiz = await knowledgeValidationService.generateQuiz({
        sprintId,
        skillIds,
        type: 'post_sprint',
        difficulty: 'intermediate',
        questionCount: Math.min(5, skillIds.length * 2),
        passingScore: 80,
      });

      console.log(`✅ [Brain-Adaptive] Post-sprint quiz generated with ${quiz.questions.length} questions`);
      return quiz;
    } catch (error) {
      console.error('❌ [Brain-Adaptive] Post-sprint quiz generation failed:', error);
      return null;
    }
  }

  /**
   * Generate pre-sprint quiz
   */
  async generatePreSprintQuiz(params: {
    sprintId: string;
    skillIds: string[];
  }) {
    const { sprintId, skillIds } = params;

    console.log(`📝 [Brain-Adaptive] Generating pre-sprint quiz for sprint ${sprintId}`);

    try {
      const quiz = await knowledgeValidationService.generateQuiz({
        sprintId,
        skillIds,
        type: 'pre_sprint',
        difficulty: 'beginner',
        questionCount: Math.min(3, skillIds.length),
        passingScore: 70,
      });

      console.log(`✅ [Brain-Adaptive] Pre-sprint quiz generated with ${quiz.questions.length} questions`);
      return quiz;
    } catch (error) {
      console.error('❌ [Brain-Adaptive] Pre-sprint quiz generation failed:', error);
      return null;
    }
  }

  /**
   * Insert review sprint if needed
   */
  async insertReviewSprintIfNeeded(params: {
    objectiveId: string;
    userId: string;
    currentDay: number;
  }) {
    const { objectiveId, userId, currentDay } = params;

    const reviewCheck = await spacedRepetitionService.shouldInsertReviewSprint({
      objectiveId,
      userId,
      currentDay,
    });

    if (reviewCheck.shouldInsert && reviewCheck.skillsToReview) {
      console.log(`🔄 [Brain-Adaptive] Inserting review sprint: ${reviewCheck.reason}`);

      try {
        const reviewSprint = await spacedRepetitionService.generateReviewSprint({
          objectiveId,
          userId,
          skillIds: reviewCheck.skillsToReview,
          type: 'spaced_repetition',
          insertAfterDay: currentDay,
        });

        console.log(`✅ [Brain-Adaptive] Review sprint inserted at day ${currentDay + 1}`);
        return reviewSprint;
      } catch (error) {
        console.error('❌ [Brain-Adaptive] Review sprint insertion failed:', error);
        return null;
      }
    }

    return null;
  }
}

export default new BrainAdaptiveIntegrationService();
