import express from 'express';
import { aiController } from '../controllers/aiController.js';
import { authenticate as authMiddleware } from '../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * @swagger
 * /api/ai/roadmap:
 *   post:
 *     summary: Generate a personalized learning roadmap
 *     description: Generates a personalized learning roadmap based on user profile and preferences
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - learningGoal
 *               - profileType
 *             properties:
 *               learningGoal:
 *                 type: string
 *                 description: The user's learning goal
 *                 example: "Learn web development with React and Node.js"
 *               targetStack:
 *                 type: string
 *                 description: The technology stack the user wants to learn
 *                 example: "MERN (MongoDB, Express, React, Node.js)"
 *               profileType:
 *                 type: string
 *                 description: The user's learning profile type
 *                 enum: [visual_learner, practical_builder, analytical_thinker, social_collaborator, creative_explorer, structured_planner, independent_researcher, goal_oriented_achiever]
 *                 example: "practical_builder"
 *               timeCommitmentHoursPerWeek:
 *                 type: number
 *                 description: The number of hours per week the user can commit to learning
 *                 example: 10
 *               priorExperience:
 *                 type: string
 *                 description: The user's prior experience in the field
 *                 example: "Basic HTML and CSS knowledge"
 *     responses:
 *       200:
 *         description: Roadmap generated successfully
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
 *                     title:
 *                       type: string
 *                     description:
 *                       type: string
 *                     learningGoal:
 *                       type: string
 *                     targetStack:
 *                       type: string
 *                     milestones:
 *                       type: array
 *                       items:
 *                         type: object
 *                     estimatedTotalHours:
 *                       type: number
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                     updatedAt:
 *                       type: string
 *                       format: date-time
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
router.post('/roadmap', authMiddleware, aiController.generateRoadmap.bind(aiController));

/**
 * @swagger
 * /api/ai/profile:
 *   post:
 *     summary: Generate a learner profile
 *     description: Generates a learner profile based on quiz answers
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
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
 *                   required:
 *                     - questionId
 *                     - selectedOptionIds
 *                   properties:
 *                     questionId:
 *                       type: string
 *                       description: ID of the quiz question
 *                     selectedOptionIds:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: IDs of the selected options
 *     responses:
 *       200:
 *         description: Profile generated successfully
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
 *                     profileType:
 *                       type: string
 *                       enum: [visual_learner, practical_builder, analytical_thinker, social_collaborator, creative_explorer, structured_planner, independent_researcher, goal_oriented_achiever]
 *                     strengths:
 *                       type: array
 *                       items:
 *                         type: string
 *                     challenges:
 *                       type: array
 *                       items:
 *                         type: string
 *                     recommendedApproaches:
 *                       type: array
 *                       items:
 *                         type: string
 *                     description:
 *                       type: string
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
router.post('/profile', authMiddleware, aiController.generateProfile.bind(aiController));

export default router;
