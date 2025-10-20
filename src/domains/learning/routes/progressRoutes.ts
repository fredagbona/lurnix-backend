import { Router } from 'express';
import { progressController } from '../controllers/progressController.js';
import { authenticate } from '../../../middlewares/authMiddleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/objectives/{objectiveId}/progress:
 *   get:
 *     summary: Get comprehensive progress for an objective
 *     description: Returns progress metrics including current day, completed days, streaks, milestones, and performance analytics
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Progress retrieved successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Objective not found
 */
router.get('/objectives/:objectiveId/progress', progressController.getObjectiveProgress);

/**
 * @swagger
 * /api/objectives/{objectiveId}/analytics:
 *   get:
 *     summary: Get detailed analytics for an objective
 *     description: Returns progress, timeline, and charts for visualization
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 */
router.get('/objectives/:objectiveId/analytics', progressController.getObjectiveAnalytics);

/**
 * @swagger
 * /api/objectives/{objectiveId}/timeline:
 *   get:
 *     summary: Get timeline of events for an objective
 *     description: Returns chronological list of events (sprint completed, milestone reached, etc.)
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Timeline retrieved successfully
 */
router.get('/objectives/:objectiveId/timeline', progressController.getObjectiveTimeline);

/**
 * @swagger
 * /api/objectives/{objectiveId}/sprints/generation-status:
 *   get:
 *     summary: Check if next sprint can be generated
 *     description: Returns whether auto-generation is enabled, if at end of journey, and buffer status
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Generation status retrieved successfully
 */
router.get('/objectives/:objectiveId/sprints/generation-status', progressController.getGenerationStatus);

/**
 * @swagger
 * /api/objectives/{objectiveId}/export:
 *   get:
 *     summary: Export progress data
 *     description: Download progress data in JSON or CSV format
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [json, csv]
 *           default: json
 *     responses:
 *       200:
 *         description: Progress data exported successfully
 */
router.get('/objectives/:objectiveId/export', progressController.exportProgress);

/**
 * @swagger
 * /api/users/{userId}/learning-stats:
 *   get:
 *     summary: Get user-level learning statistics
 *     description: Returns aggregate stats across all objectives for a user
 *     tags: [Progress]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Learning stats retrieved successfully
 */
router.get('/users/:userId/learning-stats', progressController.getUserLearningStats);

export default router;
