import { Router } from 'express';
import { authenticate } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validation';
import { technicalAssessmentController } from '../controllers/technicalAssessmentController.js';
import { technicalAssessmentSubmissionSchema } from '../validation/technicalAssessmentSchemas.js';

const router = Router();

/**
 * @swagger
 * /api/assessments/technical/questions:
 *   get:
 *     summary: Fetch technical assessment questions
 *     description: Retrieve the current pool of technical assessment questions.
 *     tags: [Technical Assessment]
 *     responses:
 *       200:
 *         description: Questions retrieved successfully
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
 *                     questions:
 *                       type: array
 *                       items:
 *                         type: object
 *       500:
 *         description: Failed to fetch questions
 */
router.get('/technical/questions', technicalAssessmentController.getQuestions);

/**
 * @swagger
 * /api/assessments/technical/submit:
 *   post:
 *     summary: Submit technical assessment responses
 *     description: Submit completed technical assessment answers for automated evaluation and profile updates.
 *     tags: [Technical Assessment]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TechnicalAssessmentSubmission'
 *     responses:
 *       200:
 *         description: Assessment submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       500:
 *         description: Assessment submission failed
 */
router.post(
  '/technical/submit',
  authenticate,
  validateRequest(technicalAssessmentSubmissionSchema),
  technicalAssessmentController.submitAssessment
);

export default router;
