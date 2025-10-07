import { Router } from 'express';
import { sprintController } from '../controllers/sprintController.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

// All routes require authentication
router.use(authenticate);

/**
 * @swagger
 * /api/sprints/{sprintId}/complete:
 *   post:
 *     summary: Mark sprint as complete
 *     description: Completes a sprint, updates progress, and auto-generates next sprint if conditions are met
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tasksCompleted
 *               - totalTasks
 *               - hoursSpent
 *             properties:
 *               tasksCompleted:
 *                 type: number
 *                 example: 8
 *               totalTasks:
 *                 type: number
 *                 example: 10
 *               hoursSpent:
 *                 type: number
 *                 example: 2.5
 *               evidenceSubmitted:
 *                 type: boolean
 *                 example: true
 *               reflection:
 *                 type: string
 *                 example: "Learned Java syntax basics. Feeling confident!"
 *     responses:
 *       200:
 *         description: Sprint completed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sprint not found
 */
router.post('/sprints/:sprintId/complete', sprintController.completeSprint);

/**
 * @swagger
 * /api/sprints/{sprintId}/completion-status:
 *   get:
 *     summary: Get completion status for a sprint
 *     description: Returns whether sprint is completed and completion details
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Completion status retrieved successfully
 */
router.get('/sprints/:sprintId/completion-status', sprintController.getCompletionStatus);

/**
 * @swagger
 * /api/sprints/{sprintId}/progress:
 *   put:
 *     summary: Update partial completion progress
 *     description: Update sprint progress without marking it as complete (for tracking during work)
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - completionPercentage
 *             properties:
 *               completionPercentage:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 100
 *                 example: 60
 *               hoursSpent:
 *                 type: number
 *                 example: 1.5
 *     responses:
 *       200:
 *         description: Progress updated successfully
 */
router.put('/sprints/:sprintId/progress', sprintController.updateProgress);

/**
 * @swagger
 * /api/objectives/{objectiveId}/sprints/generate-next:
 *   post:
 *     summary: Manually generate next sprint
 *     description: Generate the next sequential sprint for an objective
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               force:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Sprint generated successfully
 */
router.post('/objectives/:objectiveId/sprints/generate-next', sprintController.generateNextSprint);

/**
 * @swagger
 * /api/objectives/{objectiveId}/sprints/generate-batch:
 *   post:
 *     summary: Generate multiple sprints ahead
 *     description: Pre-generate multiple sprints to maintain buffer
 *     tags: [Sprints]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               count:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *                 default: 3
 *                 example: 3
 *               startDay:
 *                 type: number
 *                 example: 5
 *     responses:
 *       200:
 *         description: Sprints generated successfully
 */
router.post('/objectives/:objectiveId/sprints/generate-batch', sprintController.generateSprintBatch);

/**
 * @swagger
 * /api/objectives/{objectiveId}/sprints/generation-status:
 *   get:
 *     summary: Get sprint generation status
 *     description: Check if more sprints can be generated and why/why not
 *     tags: [Sprints]
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
router.get('/objectives/:objectiveId/sprints/generation-status', sprintController.getGenerationStatus);

export default router;
