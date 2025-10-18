import { Router } from 'express';
import { adaptiveQuizController } from '../controllers/adaptiveQuizController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { validateRequest } from '../middlewares/validation.js';
import { 
  submitQuizAnswersSchema, 
  quizIdParamSchema, 
  sprintIdParamSchema 
} from '../schemas/adaptiveQuizSchemas.js';

const router = Router();

/**
 * @swagger
 * /api/quizzes:
 *   get:
 *     summary: List adaptive quizzes
 *     description: Retrieve adaptive quizzes filtered by type, objective, or sprint. Responses honour the Accept-Language header (supported en, fr).
 *     tags: [Adaptive Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Optional quiz type filter (e.g. profile, pre_sprint)
 *       - in: query
 *         name: objectiveId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by objective ID
 *       - in: query
 *         name: sprintId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter by sprint ID
 *       - in: query
 *         name: includeQuestions
 *         schema:
 *           type: boolean
 *         description: When true, include localized question summaries and options
 *       - in: header
 *         name: Accept-Language
 *         schema:
 *           type: string
 *           example: fr
 *         description: Request locale for quiz metadata (defaults to en)
 *     responses:
 *       200:
 *         description: Quizzes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     quizzes:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                           type:
 *                             type: string
 *                           title:
 *                             type: string
 *                             description: Localized quiz title
 *                           description:
 *                             type: string
 *                             description: Localized quiz description
 *                           passingScore:
 *                             type: number
 *                           timeLimit:
 *                             type: number
 *                             nullable: true
 *                           attemptsAllowed:
 *                             type: number
 *                           blocksProgression:
 *                             type: boolean
 *                           isRequired:
 *                             type: boolean
 *                           objectiveId:
 *                             type: string
 *                             nullable: true
 *                           sprintId:
 *                             type: string
 *                             nullable: true
 *                           questions:
 *                             type: array
 *                             nullable: true
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 type:
 *                                   type: string
 *                                 question:
 *                                   type: string
 *                                   description: Localized question prompt
 *                                 options:
 *                                   type: array
 *                                   items:
 *                                     type: object
 *                                     properties:
 *                                       id:
 *                                         type: string
 *                                       text:
 *                                         type: string
 *                                         description: Localized option text
 */
router.get(
  '/',
  authenticate,
  adaptiveQuizController.listQuizzes
);

/**
 * @swagger
 * /api/quizzes/{quizId}:
 *   get:
 *     summary: Get quiz by ID with questions
 *     description: Retrieve a quiz with all its questions for the user to take. Response content is localized per Accept-Language header (supported en, fr).
 *     tags: [Adaptive Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *       - in: header
 *         name: Accept-Language
 *         schema:
 *           type: string
 *           example: fr
 *         description: Request locale for quiz metadata (fallback en)
 *     responses:
 *       200:
 *         description: Quiz retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     quiz:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         description:
 *                           type: string
 *                           description: Localized quiz description
 *                         passingScore:
 *                           type: number
 *                         timeLimit:
 *                           type: number
 *                         attemptsAllowed:
 *                           type: number
 *                         questions:
 *                           type: array
 *                           items:
 *                             type: object
 *       404:
 *         description: Quiz not found
 */
router.get(
  '/:quizId',
  authenticate,
  adaptiveQuizController.getQuiz
);

/**
 * @swagger
 * /api/quizzes/{quizId}/submit:
 *   post:
 *     summary: Submit quiz answers
 *     description: Submit answers for a quiz and get results with skill-level performance
 *     tags: [Adaptive Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - answers
 *             properties:
 *               answers:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     questionId:
 *                       type: string
 *                       format: uuid
 *                     answer:
 *                       oneOf:
 *                         - type: string
 *                         - type: array
 *                           items:
 *                             type: string
 *                         - type: boolean
 *               timeSpent:
 *                 type: number
 *                 description: Time spent in seconds
 *           example:
 *             answers:
 *               - questionId: "q1-uuid"
 *                 answer: "b"
 *               - questionId: "q2-uuid"
 *                 answer: "Hello World"
 *             timeSpent: 180
 *     responses:
 *       200:
 *         description: Quiz submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     result:
 *                       type: object
 *                       properties:
 *                         attemptId:
 *                           type: string
 *                         score:
 *                           type: number
 *                         passed:
 *                           type: boolean
 *                         totalQuestions:
 *                           type: number
 *                         correctAnswers:
 *                           type: number
 *                         timeSpent:
 *                           type: number
 *                         skillScores:
 *                           type: object
 *                         weakAreas:
 *                           type: array
 *                           items:
 *                             type: string
 *                         recommendations:
 *                           type: array
 *                           items:
 *                             type: string
 *                         attemptsRemaining:
 *                           type: number
 *       400:
 *         description: Quiz submission failed
 */
router.post(
  '/:quizId/submit',
  authenticate,
  validateRequest(submitQuizAnswersSchema),
  adaptiveQuizController.submitQuiz
);

/**
 * @swagger
 * /api/quizzes/{quizId}/attempts:
 *   get:
 *     summary: Get user's quiz attempts
 *     description: Get all attempts for a specific quiz by the authenticated user
 *     tags: [Adaptive Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Quiz ID
 *     responses:
 *       200:
 *         description: Quiz attempts retrieved successfully
 */
router.get(
  '/:quizId/attempts',
  authenticate,
  adaptiveQuizController.getUserQuizAttempts
);

/**
 * @swagger
 * /api/quizzes/attempts/{attemptId}:
 *   get:
 *     summary: Get quiz attempt details
 *     description: Get detailed results of a specific quiz attempt
 *     tags: [Adaptive Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: attemptId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Attempt ID
 *     responses:
 *       200:
 *         description: Quiz attempt retrieved successfully
 *       404:
 *         description: Quiz attempt not found
 *       403:
 *         description: Forbidden - attempt belongs to another user
 */
router.get(
  '/attempts/:attemptId',
  authenticate,
  adaptiveQuizController.getQuizAttempt
);

/**
 * @swagger
 * /api/sprints/{sprintId}/readiness:
 *   get:
 *     summary: Check sprint readiness
 *     description: Check if user can start a sprint (pre-sprint quiz validation)
 *     tags: [Adaptive Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Sprint ID
 *     responses:
 *       200:
 *         description: Readiness check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     canStart:
 *                       type: boolean
 *                     reason:
 *                       type: string
 *                     requiredQuiz:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         passingScore:
 *                           type: number
 *                         attemptsAllowed:
 *                           type: number
 *                         attemptsUsed:
 *                           type: number
 */
router.get(
  '/sprints/:sprintId/readiness',
  authenticate,
  adaptiveQuizController.checkSprintReadiness
);

/**
 * @swagger
 * /api/sprints/{sprintId}/validation:
 *   get:
 *     summary: Check sprint validation
 *     description: Check if user can progress after completing sprint (post-sprint quiz validation)
 *     tags: [Adaptive Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Sprint ID
 *     responses:
 *       200:
 *         description: Validation check completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     canProgress:
 *                       type: boolean
 *                     reason:
 *                       type: string
 *                     quizScore:
 *                       type: number
 *                     requiredScore:
 *                       type: number
 *                     attemptsRemaining:
 *                       type: number
 */
router.get(
  '/sprints/:sprintId/validation',
  authenticate,
  adaptiveQuizController.checkSprintValidation
);

export default router;
