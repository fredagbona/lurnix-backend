import { Response } from 'express';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { AuthRequest } from '../middlewares/authMiddleware';
import knowledgeValidationService from '../services/knowledgeValidationService.js';
import { Prisma, PrismaClient, QuizType } from '@prisma/client';

const prisma = new PrismaClient();

type QuizTranslationRecord = {
  language: string;
  title?: string | null;
  description?: string | null;
};

type QuestionTranslationRecord = {
  language: string;
  question?: string | null;
  options?: Array<{ id: string; text: string }>;
};

type QuestionOptionRecord = { id: string; text: string; isCorrect?: boolean };

const resolveRequestedLanguage = (req: AuthRequest): string => {
  const rawLanguage =
    (typeof req.language === 'string' && req.language)
    || (typeof (req as any).lng === 'string' && (req as any).lng)
    || 'en';

  return rawLanguage.split('-')[0]?.toLowerCase?.() ?? 'en';
};

const buildLanguagePriorityList = (language: string): string[] =>
  language === 'en' ? ['en'] : [language, 'en'];

const resolveLocalizedTranslation = <T extends { language: string }>(
  translations: T[] | undefined,
  language: string
): T | undefined => {
  if (!translations || translations.length === 0) {
    return undefined;
  }

  return (
    translations.find((translation) => translation.language === language)
    || translations.find((translation) => translation.language === 'en')
  );
};

const localizeQuestion = (question: any, language: string) => {
  const translation = resolveLocalizedTranslation<QuestionTranslationRecord>(question.translations, language);
  const baseOptions: QuestionOptionRecord[] = Array.isArray(question.options)
    ? (question.options as QuestionOptionRecord[])
    : [];

  const localizedOptionText = new Map<string, string>(
    Array.isArray(translation?.options)
      ? translation.options.map((option) => [option.id, option.text])
      : []
  );

  const options = baseOptions.map((option) => ({
    ...option,
    text: localizedOptionText.get(option.id) ?? option.text,
  }));

  return {
    id: question.id,
    type: question.type,
    question: translation?.question ?? question.question,
    options,
    codeTemplate: question.codeTemplate,
    expectedOutput: question.expectedOutput,
    points: question.points,
    sortOrder: question.sortOrder,
  };
};

const localizeQuizRecord = (quiz: any, language: string, includeQuestions: boolean) => {
  const translation = resolveLocalizedTranslation<QuizTranslationRecord>(quiz.translations, language);

  const localizedQuiz: any = {
    id: quiz.id,
    type: quiz.type,
    title: translation?.title ?? quiz.title,
    description: translation?.description ?? quiz.description,
    passingScore: quiz.passingScore,
    timeLimit: quiz.timeLimit,
    attemptsAllowed: quiz.attemptsAllowed,
    blocksProgression: quiz.blocksProgression,
    isRequired: quiz.isRequired,
    objectiveId: quiz.objectiveId,
    sprintId: quiz.sprintId,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
  };

  if (includeQuestions && Array.isArray(quiz.questions)) {
    localizedQuiz.questions = quiz.questions.map((question: any) => localizeQuestion(question, language));
  }

  return localizedQuiz;
};

export class AdaptiveQuizController {
  /**
   * List adaptive quizzes with optional filters
   * GET /api/quizzes
   */
  listQuizzes = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.userId) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    const { type, objectiveId, sprintId, includeQuestions } = req.query;
    const requestedLanguage = resolveRequestedLanguage(req);
    const languagesForLookup = buildLanguagePriorityList(requestedLanguage);
    const includeQuestionsFlag = includeQuestions === 'true';

    const where: Prisma.KnowledgeQuizWhereInput = {};

    if (typeof type === 'string') {
      const normalized = type.toLowerCase();

      const typeAlias: Record<string, QuizType> = {
        profile: QuizType.pre_sprint,
        readiness: QuizType.pre_sprint,
        validation: QuizType.post_sprint,
        review: QuizType.review,
        milestone: QuizType.milestone,
      };

      const matches = Object.values(QuizType).find((value) => value.toLowerCase() === normalized)
        ?? typeAlias[normalized];
      if (!matches) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_QUIZ_TYPE',
            message: `Unsupported quiz type: ${type}`
          },
          timestamp: new Date().toISOString()
        });
        return;
      }
      where.type = matches as QuizType;
    }

    if (typeof objectiveId === 'string') {
      where.objectiveId = objectiveId;
    }

    if (typeof sprintId === 'string') {
      where.sprintId = sprintId;
    }

    const quizInclude: any = {
      translations: {
        where: { language: { in: languagesForLookup } },
      },
    };

    if (includeQuestionsFlag) {
      quizInclude.questions = {
        orderBy: { sortOrder: 'asc' },
        include: {
          translations: {
            where: { language: { in: languagesForLookup } },
          },
        },
      };
    }

    const quizzes = await prisma.knowledgeQuiz.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: quizInclude,
    });

    const localizedQuizzes = quizzes.map((quiz) =>
      localizeQuizRecord(quiz, requestedLanguage, includeQuestionsFlag)
    );

    res.status(200).json({
      success: true,
      data: {
        quizzes: localizedQuizzes
      },
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Get quiz by ID with questions
   * GET /api/quizzes/:quizId
   */
  getQuiz = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
    const { quizId } = req.params;

    const requestedLanguage = resolveRequestedLanguage(req);
    const languagesForLookup = buildLanguagePriorityList(requestedLanguage);

    const quiz = await prisma.knowledgeQuiz.findUnique({
      where: { id: quizId },
      include: {
        translations: {
          where: { language: { in: languagesForLookup } },
        },
        questions: {
          orderBy: { sortOrder: 'asc' },
          include: {
            translations: {
              where: { language: { in: languagesForLookup } },
            },
          },
        },
      } as any,
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

    const localizedQuiz = localizeQuizRecord(quiz, requestedLanguage, true);

    res.status(200).json({
      success: true,
      data: {
        quiz: {
          id: localizedQuiz.id,
          title: localizedQuiz.title,
          description: localizedQuiz.description,
          passingScore: localizedQuiz.passingScore,
          timeLimit: localizedQuiz.timeLimit,
          attemptsAllowed: localizedQuiz.attemptsAllowed,
          questions: localizedQuiz.questions,
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
    const { answers, timeSpent } = req.body;

    const answersAreInvalid = !Array.isArray(answers)
      || answers.some(
        (entry) =>
          typeof entry?.questionId !== 'string'
          || (
            typeof entry?.optionId !== 'string'
            && !Array.isArray(entry?.optionIds)
            && entry?.answer === undefined
          )
      );

    if (answersAreInvalid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Answers must be an array of { questionId, optionId | optionIds | answer } objects'
        },
        timestamp: new Date().toISOString()
      });
      return;
    }

    try {
      const result = await knowledgeValidationService.submitQuizAttempt({
        userId: req.userId,
        quizId,
        answers: answers.map((answer: any) => ({
          questionId: answer.questionId,
          answer: Array.isArray(answer.optionIds)
            ? [...answer.optionIds]
            : answer.optionId ?? answer.answer
        })),
        timeSpent
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
