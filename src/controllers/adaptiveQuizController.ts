import { Response } from 'express';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { AuthRequest } from '../middlewares/authMiddleware';
import knowledgeValidationService from '../services/knowledgeValidationService.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class AdaptiveQuizController {
  /**
   * Get quiz by ID with questions
   * GET /api/quizzes/:quizId
   */
  getQuiz = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { quizId } = req.params;

    const quiz = await prisma.knowledgeQuiz.findUnique({
      where: { id: quizId },
      include: {
        questions: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            type: true,
            question: true,
            options: true,
            codeTemplate: true,
            points: true,
            sortOrder: true,
          },
        },
      },
    });

    if (!quiz) {
      res.status(404).json({
        success: false,
        error: {
          code: 'QUIZ_NOT_FOUND',
          message: 'Quiz not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: quiz.id,
          title: quiz.title,
          description: quiz.description,
          passingScore: quiz.passingScore,
          timeLimit: quiz.timeLimit,
          attemptsAllowed: quiz.attemptsAllowed,
          questions: quiz.questions,
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Submit quiz answers
   * POST /api/quizzes/:quizId/submit
   */
  submitQuiz = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { quizId } = req.params;
    const { answers, timeSpent = 0 } = req.body;

    try {
      const result = await knowledgeValidationService.submitQuizAttempt({
        userId: req.userId,
        quizId,
        answers,
        timeSpent,
      });

      // Get remaining attempts
      const quiz = await prisma.knowledgeQuiz.findUnique({
        where: { id: quizId },
        include: {
          attempts: {
            where: { userId: req.userId },
            orderBy: { attemptNumber: 'desc' },
            take: 1,
          },
        },
      });

      const attemptsUsed = quiz?.attempts[0]?.attemptNumber || 0;
      const attemptsRemaining = (quiz?.attemptsAllowed || 3) - attemptsUsed;

      res.status(200).json({
        success: true,
        data: {
          result: {
            ...result,
            attemptsRemaining,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: {
          code: 'QUIZ_SUBMISSION_FAILED',
          message: error.message || 'Failed to submit quiz',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * Check sprint readiness (pre-sprint quiz check)
   * GET /api/sprints/:sprintId/readiness
   */
  checkSprintReadiness = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { sprintId } = req.params;

    const readinessCheck = await knowledgeValidationService.validatePreSprintReadiness({
      userId: req.userId,
      sprintId,
    });

    // If there's a required quiz, get attempts info
    if (readinessCheck.requiredQuiz) {
      const attempts = await prisma.quizAttempt.findMany({
        where: {
          quizId: readinessCheck.requiredQuiz.id,
          userId: req.userId,
        },
        orderBy: { attemptNumber: 'desc' },
        take: 1,
      });

      const attemptsUsed = attempts[0]?.attemptNumber || 0;
      const attemptsAllowed = readinessCheck.requiredQuiz.attemptsAllowed || 3;

      res.status(200).json({
        success: true,
        data: {
          canStart: readinessCheck.canStart,
          reason: readinessCheck.reason,
          requiredQuiz: readinessCheck.requiredQuiz
            ? {
                id: readinessCheck.requiredQuiz.id,
                title: readinessCheck.requiredQuiz.title,
                passingScore: readinessCheck.requiredQuiz.passingScore,
                attemptsAllowed,
                attemptsUsed,
              }
            : undefined,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(200).json({
        success: true,
        data: readinessCheck,
        timestamp: new Date().toISOString(),
      });
    }
  });

  /**
   * Check sprint validation (post-sprint quiz check)
   * GET /api/sprints/:sprintId/validation
   */
  checkSprintValidation = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { sprintId } = req.params;

    const validationCheck = await knowledgeValidationService.validateSprintCompletion({
      userId: req.userId,
      sprintId,
    });

    res.status(200).json({
      success: true,
      data: validationCheck,
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Get quiz attempt result
   * GET /api/quizzes/attempts/:attemptId
   */
  getQuizAttempt = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { attemptId } = req.params;

    const attempt = await prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: {
          select: {
            id: true,
            title: true,
            passingScore: true,
          },
        },
        answers: {
          include: {
            question: {
              select: {
                id: true,
                question: true,
                type: true,
              },
            },
          },
        },
      },
    });

    if (!attempt) {
      res.status(404).json({
        success: false,
        error: {
          code: 'ATTEMPT_NOT_FOUND',
          message: 'Quiz attempt not found',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Check ownership
    if (attempt.userId !== req.userId) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this quiz attempt',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        attempt: {
          id: attempt.id,
          quizId: attempt.quizId,
          quizTitle: attempt.quiz.title,
          attemptNumber: attempt.attemptNumber,
          score: attempt.score,
          passed: attempt.passed,
          timeSpent: attempt.timeSpent,
          skillScores: attempt.skillScores,
          startedAt: attempt.startedAt,
          completedAt: attempt.completedAt,
          answers: attempt.answers.map((a) => ({
            questionId: a.questionId,
            question: a.question.question,
            questionType: a.question.type,
            answer: a.answer,
            isCorrect: a.isCorrect,
            pointsEarned: a.pointsEarned,
          })),
        },
      },
      timestamp: new Date().toISOString(),
    });
  });

  /**
   * Get user's quiz attempts for a specific quiz
   * GET /api/quizzes/:quizId/attempts
   */
  getUserQuizAttempts = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }

    const { quizId } = req.params;

    const attempts = await prisma.quizAttempt.findMany({
      where: {
        quizId,
        userId: req.userId,
      },
      orderBy: { attemptNumber: 'desc' },
      include: {
        quiz: {
          select: {
            title: true,
            passingScore: true,
          },
        },
      },
    });

    res.status(200).json({
      success: true,
      data: {
        attempts: attempts.map((a) => ({
          id: a.id,
          attemptNumber: a.attemptNumber,
          score: a.score,
          passed: a.passed,
          timeSpent: a.timeSpent,
          completedAt: a.completedAt,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  });
}

export const adaptiveQuizController = new AdaptiveQuizController();
