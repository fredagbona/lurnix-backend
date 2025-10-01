import express from 'express';
import { aiProfileController } from '../controllers/aiProfileController.js';
import { authenticate as authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/ai/profile:
 *   get:
 *     summary: Get authenticated user's learner profile
 *     description: Retrieves the latest learner profile for the authenticated user
 *     tags: [AI, Profile]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Learner profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     source:
 *                       type: string
 *                       example: "quiz"
 *                     hoursPerWeek:
 *                       type: number
 *                       example: 10
 *                     strengths:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["JavaScript", "Problem Solving"]
 *                     gaps:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Backend Development", "Databases"]
 *                     passionTags:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Web Development", "AI"]
 *                     blockers:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Time constraints"]
 *                     goals:
 *                       type: array
 *                       items:
 *                         type: string
 *                       example: ["Get a job as a frontend developer"]
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
 *       404:
 *         description: No learner profile found for user
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Server error
 *   post:
 *     summary: Generate a learner profile
 *     description: Generates a personalized learner profile using AI based on user information
 *     tags: [AI, Profile]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               background:
 *                 type: string
 *                 description: User's educational or professional background
 *                 example: "Computer Science student with basic programming knowledge"
 *               interests:
 *                 type: string
 *                 description: User's interests in technology or programming
 *                 example: "Web development, AI, and data visualization"
 *               goals:
 *                 type: string
 *                 description: User's learning goals
 *                 example: "Get a job as a frontend developer within 6 months"
 *               timeAvailable:
 *                 type: number
 *                 description: Minutes per day available for learning
 *                 example: 60
 *               priorExperience:
 *                 type: string
 *                 description: User's prior experience with programming
 *                 example: "Basic HTML and CSS knowledge"
 *               learningPreferences:
 *                 type: string
 *                 description: User's preferred learning methods
 *                 example: "Hands-on projects and visual tutorials"
 *     responses:
 *       200:
 *         description: Learner profile generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userId:
 *                       type: string
 *                     version:
 *                       type: number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     computedProfile:
 *                       type: object
 *                       properties:
 *                         style:
 *                           type: string
 *                           example: "visual"
 *                         visual:
 *                           type: number
 *                           example: 0.7
 *                         reading:
 *                           type: number
 *                           example: 0.3
 *                         handsOn:
 *                           type: number
 *                           example: 0.8
 *                         level:
 *                           type: string
 *                           example: "beginner"
 *                         timePerDay:
 *                           type: number
 *                           example: 60
 *                         goal:
 *                           type: string
 *                           example: "job_ready"
 *                         preferredStack:
 *                           type: array
 *                           items:
 *                             type: string
 *                           example: ["javascript", "react"]
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid request parameters
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Server error
 */
router.get('/', authMiddleware, aiProfileController.getProfile.bind(aiProfileController));
router.post('/', authMiddleware, aiProfileController.generateProfile.bind(aiProfileController));

export default router;
