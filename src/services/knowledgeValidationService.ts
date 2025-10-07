import { PrismaClient, QuizType, SkillDifficulty } from '@prisma/client';
import quizGenerationService from './quizGenerationService.js';
import skillTrackingService from './skillTrackingService.js';

const prisma = new PrismaClient();

// ============================================
// INTERFACES
// ============================================

export interface QuizResult {
  attemptId: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  skillScores: Record<string, number>;
  weakAreas: string[];
  recommendations: string[];
}

export interface ReadinessCheck {
  canStart: boolean;
  reason?: string;
  requiredQuiz?: any;
  prerequisiteSkills?: string[];
}

export interface ProgressionCheck {
  canProgress: boolean;
  reason?: string;
  quizScore?: number;
  requiredScore: number;
  attemptsRemaining?: number;
}

// ============================================
// KNOWLEDGE VALIDATION SERVICE
// ============================================

class KnowledgeValidationService {
  /**
   * Generate quiz for sprint/skills
   */
  async generateQuiz(params: {
    sprintId?: string;
    objectiveId?: string;
    skillIds: string[];
    type: QuizType;
    difficulty: SkillDifficulty;
    questionCount: number;
    passingScore?: number;
    language?: string;
  }) {
    const { sprintId, objectiveId, skillIds, type, difficulty, questionCount, passingScore = 80, language = 'en' } = params;

    // Get skill details
    const skills = await prisma.skill.findMany({
      where: { id: { in: skillIds } },
    });

    if (skills.length === 0) {
      throw new Error('No skills found for quiz generation');
    }

    // Generate questions
    const questions = await quizGenerationService.generateQuestions({
      skills: skills.map((s) => ({ id: s.id, name: s.name, difficulty: s.difficulty })),
      difficulty,
      questionCount,
      type,
      language,
    });

    // Create quiz title based on type
    const title = this.generateQuizTitle(type, skills);
    const description = this.generateQuizDescription(type, skills);

    // Create quiz in database
    const quiz = await quizGenerationService.createQuiz({
      sprintId,
      objectiveId,
      skillIds,
      type,
      title,
      description,
      questions,
      passingScore,
    });

    return quiz;
  }

  /**
   * Check if user can start sprint (pre-sprint quiz)
   */
  async validatePreSprintReadiness(params: {
    userId: string;
    sprintId: string;
  }): Promise<ReadinessCheck> {
    const { userId, sprintId } = params;

    // Get sprint with skills
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        skills: {
          include: { skill: true },
        },
        quizzes: {
          where: { type: 'pre_sprint' },
          include: {
            attempts: {
              where: { userId },
              orderBy: { attemptNumber: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found`);
    }

    // Check if pre-sprint quiz exists
    const preSprintQuiz = sprint.quizzes.find((q) => q.type === 'pre_sprint');

    if (!preSprintQuiz) {
      // No pre-sprint quiz required, can start
      return {
        canStart: true,
      };
    }

    // Check if user has passed the quiz
    const latestAttempt = preSprintQuiz.attempts[0];

    if (!latestAttempt) {
      // User hasn't taken the quiz yet
      return {
        canStart: false,
        reason: 'You must complete the readiness quiz before starting this sprint.',
        requiredQuiz: preSprintQuiz,
      };
    }

    if (!latestAttempt.passed) {
      // User failed the quiz
      const attemptsRemaining = preSprintQuiz.attemptsAllowed - latestAttempt.attemptNumber;

      if (attemptsRemaining > 0) {
        return {
          canStart: false,
          reason: `You need to pass the readiness quiz (score: ${latestAttempt.score}%, required: ${preSprintQuiz.passingScore}%). ${attemptsRemaining} attempts remaining.`,
          requiredQuiz: preSprintQuiz,
        };
      } else {
        return {
          canStart: false,
          reason: 'You have used all quiz attempts. Please review the prerequisite skills and try again later.',
          prerequisiteSkills: sprint.skills.map((ss) => ss.skill.name),
        };
      }
    }

    // User passed the quiz
    return {
      canStart: true,
    };
  }

  /**
   * Submit quiz attempt
   */
  async submitQuizAttempt(params: {
    userId: string;
    quizId: string;
    answers: Array<{
      questionId: string;
      answer: any;
    }>;
    timeSpent: number;
  }): Promise<QuizResult> {
    const { userId, quizId, answers, timeSpent } = params;

    // Get quiz with questions
    const quiz = await prisma.knowledgeQuiz.findUnique({
      where: { id: quizId },
      include: {
        questions: true,
        attempts: {
          where: { userId },
          orderBy: { attemptNumber: 'desc' },
          take: 1,
        },
      },
    });

    if (!quiz) {
      throw new Error(`Quiz ${quizId} not found`);
    }

    // Check attempts remaining
    const latestAttempt = quiz.attempts[0];
    const attemptNumber = latestAttempt ? latestAttempt.attemptNumber + 1 : 1;

    if (attemptNumber > quiz.attemptsAllowed) {
      throw new Error('No attempts remaining for this quiz');
    }

    // Grade the quiz
    const gradeResult = await this.gradeQuiz({
      quiz,
      answers,
    });

    // Create attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        quizId,
        userId,
        attemptNumber,
        score: gradeResult.score,
        passed: gradeResult.passed,
        timeSpent,
        startedAt: new Date(Date.now() - timeSpent * 1000),
        completedAt: new Date(),
        skillScores: gradeResult.skillScores,
        answers: {
          create: gradeResult.answers.map((a) => ({
            questionId: a.questionId,
            answer: a.answer,
            isCorrect: a.isCorrect,
            pointsEarned: a.pointsEarned,
          })),
        },
      },
    });

    return {
      attemptId: attempt.id,
      score: gradeResult.score,
      passed: gradeResult.passed,
      totalQuestions: gradeResult.totalQuestions,
      correctAnswers: gradeResult.correctAnswers,
      timeSpent,
      skillScores: gradeResult.skillScores,
      weakAreas: gradeResult.weakAreas,
      recommendations: gradeResult.recommendations,
    };
  }

  /**
   * Grade quiz
   */
  private async gradeQuiz(params: {
    quiz: any;
    answers: Array<{ questionId: string; answer: any }>;
  }) {
    const { quiz, answers } = params;

    let totalPoints = 0;
    let earnedPoints = 0;
    let correctAnswers = 0;
    const skillScores: Record<string, { correct: number; total: number }> = {};
    const gradedAnswers: Array<{
      questionId: string;
      answer: any;
      isCorrect: boolean;
      pointsEarned: number;
    }> = [];

    for (const question of quiz.questions) {
      totalPoints += question.points;

      const userAnswer = answers.find((a) => a.questionId === question.id);
      if (!userAnswer) {
        // No answer provided
        gradedAnswers.push({
          questionId: question.id,
          answer: null,
          isCorrect: false,
          pointsEarned: 0,
        });
        continue;
      }

      // Grade based on question type
      const isCorrect = this.gradeAnswer(question, userAnswer.answer);
      const pointsEarned = isCorrect ? question.points : 0;

      if (isCorrect) {
        correctAnswers++;
        earnedPoints += pointsEarned;
      }

      gradedAnswers.push({
        questionId: question.id,
        answer: userAnswer.answer,
        isCorrect,
        pointsEarned,
      });

      // Track skill scores
      for (const skillId of question.skillIds) {
        if (!skillScores[skillId]) {
          skillScores[skillId] = { correct: 0, total: 0 };
        }
        skillScores[skillId].total++;
        if (isCorrect) {
          skillScores[skillId].correct++;
        }
      }
    }

    const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const passed = score >= quiz.passingScore;

    // Calculate skill scores as percentages
    const skillScorePercentages: Record<string, number> = {};
    for (const [skillId, scores] of Object.entries(skillScores)) {
      skillScorePercentages[skillId] = (scores.correct / scores.total) * 100;
    }

    // Identify weak areas (skills with < 70% score)
    const weakAreas = Object.entries(skillScorePercentages)
      .filter(([, score]) => score < 70)
      .map(([skillId]) => skillId);

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      score,
      passed,
      weakAreas,
      skillScores: skillScorePercentages,
    });

    return {
      score,
      passed,
      totalQuestions: quiz.questions.length,
      correctAnswers,
      skillScores: skillScorePercentages,
      weakAreas,
      recommendations,
      answers: gradedAnswers,
    };
  }

  /**
   * Grade individual answer
   */
  private gradeAnswer(question: any, userAnswer: any): boolean {
    switch (question.type) {
      case 'multiple_choice':
        return this.gradeMultipleChoice(question, userAnswer);
      case 'multiple_select':
        return this.gradeMultipleSelect(question, userAnswer);
      case 'true_false':
        return this.gradeTrueFalse(question, userAnswer);
      case 'code_output':
        return this.gradeCodeOutput(question, userAnswer);
      case 'code_completion':
      case 'short_answer':
        // These require manual grading or more sophisticated checking
        return false; // Default to incorrect, will need manual review
      default:
        return false;
    }
  }

  /**
   * Grade multiple choice question
   */
  private gradeMultipleChoice(question: any, userAnswer: any): boolean {
    if (!question.options || !userAnswer) return false;

    const correctOption = question.options.find((opt: any) => opt.isCorrect);
    return correctOption && userAnswer === correctOption.id;
  }

  /**
   * Grade multiple select question
   */
  private gradeMultipleSelect(question: any, userAnswer: any): boolean {
    if (!question.options || !Array.isArray(userAnswer)) return false;

    const correctIds = question.options
      .filter((opt: any) => opt.isCorrect)
      .map((opt: any) => opt.id)
      .sort();

    const userIds = [...userAnswer].sort();

    return JSON.stringify(correctIds) === JSON.stringify(userIds);
  }

  /**
   * Grade true/false question
   */
  private gradeTrueFalse(question: any, userAnswer: any): boolean {
    if (!question.options) return false;

    const correctOption = question.options.find((opt: any) => opt.isCorrect);
    return correctOption && userAnswer === correctOption.id;
  }

  /**
   * Grade code output question
   */
  private gradeCodeOutput(question: any, userAnswer: any): boolean {
    if (!question.expectedOutput || !userAnswer) return false;

    // Normalize whitespace and compare
    const expected = question.expectedOutput.trim().replace(/\s+/g, ' ');
    const actual = String(userAnswer).trim().replace(/\s+/g, ' ');

    return expected === actual;
  }

  /**
   * Check if user can progress (post-sprint quiz)
   */
  async validateSprintCompletion(params: {
    userId: string;
    sprintId: string;
  }): Promise<ProgressionCheck> {
    const { userId, sprintId } = params;

    // Get sprint with post-sprint quiz
    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: {
        quizzes: {
          where: { type: 'post_sprint' },
          include: {
            attempts: {
              where: { userId },
              orderBy: { attemptNumber: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!sprint) {
      throw new Error(`Sprint ${sprintId} not found`);
    }

    const postSprintQuiz = sprint.quizzes.find((q) => q.type === 'post_sprint');

    if (!postSprintQuiz) {
      // No post-sprint quiz required
      return {
        canProgress: true,
        requiredScore: 0,
      };
    }

    const latestAttempt = postSprintQuiz.attempts[0];

    if (!latestAttempt) {
      return {
        canProgress: false,
        reason: 'You must complete the validation quiz before progressing.',
        requiredScore: postSprintQuiz.passingScore,
      };
    }

    if (!latestAttempt.passed) {
      const attemptsRemaining = postSprintQuiz.attemptsAllowed - latestAttempt.attemptNumber;

      return {
        canProgress: false,
        reason: `Quiz score (${latestAttempt.score}%) is below passing score (${postSprintQuiz.passingScore}%).`,
        quizScore: latestAttempt.score,
        requiredScore: postSprintQuiz.passingScore,
        attemptsRemaining,
      };
    }

    return {
      canProgress: true,
      quizScore: latestAttempt.score,
      requiredScore: postSprintQuiz.passingScore,
    };
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Generate quiz title
   */
  private generateQuizTitle(type: QuizType, skills: any[]): string {
    const skillNames = skills.slice(0, 2).map((s) => s.name).join(' & ');
    const more = skills.length > 2 ? ` +${skills.length - 2} more` : '';

    const titles: Record<QuizType, string> = {
      pre_sprint: `Readiness Check: ${skillNames}${more}`,
      post_sprint: `Validation Quiz: ${skillNames}${more}`,
      skill_check: `Skill Assessment: ${skillNames}${more}`,
      review: `Review Quiz: ${skillNames}${more}`,
      milestone: `Milestone Assessment: ${skillNames}${more}`,
    };

    return titles[type];
  }

  /**
   * Generate quiz description
   */
  private generateQuizDescription(type: QuizType, skills: any[]): string {
    const descriptions: Record<QuizType, string> = {
      pre_sprint: 'Test your prerequisite knowledge before starting this sprint.',
      post_sprint: 'Validate your understanding of the concepts covered in this sprint.',
      skill_check: 'Assess your current proficiency in these skills.',
      review: 'Review previously learned skills to ensure retention.',
      milestone: 'Comprehensive assessment of all skills learned up to this point.',
    };

    return descriptions[type];
  }

  /**
   * Generate recommendations based on quiz results
   */
  private generateRecommendations(params: {
    score: number;
    passed: boolean;
    weakAreas: string[];
    skillScores: Record<string, number>;
  }): string[] {
    const { score, passed, weakAreas } = params;
    const recommendations: string[] = [];

    if (passed) {
      if (score >= 95) {
        recommendations.push('Excellent work! You have mastered these concepts.');
      } else if (score >= 85) {
        recommendations.push('Great job! You have a solid understanding.');
      } else {
        recommendations.push('Good work! You passed, but there is room for improvement.');
      }
    } else {
      recommendations.push('Review the material and try again.');
    }

    if (weakAreas.length > 0) {
      recommendations.push(`Focus on improving: ${weakAreas.slice(0, 3).join(', ')}`);
      recommendations.push('Practice more exercises in these areas.');
    }

    return recommendations;
  }
}

export default new KnowledgeValidationService();
