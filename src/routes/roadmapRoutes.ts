import { Router } from 'express';
import { roadmapController } from '../controllers/roadmapController';
import { authenticate } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validation';
import { roadmapGenerationSchema, progressUpdateSchema } from '../validation/roadmapSchemas';

const router = Router();

/**
 * @swagger
 * /api/roadmaps:
 *   post:
 *     summary: Generate a new roadmap
 *     tags: [Roadmaps]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RoadmapGeneration'
 *     responses:
 *       201:
 *         description: Roadmap generated successfully
 */
router.post('/', authenticate, validateRequest(roadmapGenerationSchema), roadmapController.generateRoadmap);

/**
 * @swagger
 * /api/roadmaps:
 *   get:
 *     summary: Get all roadmaps for the authenticated user
 *     tags: [Roadmaps]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Roadmaps retrieved successfully
 */
router.get('/', authenticate, roadmapController.getUserRoadmaps);

/**
 * @swagger
 * /api/roadmaps/{id}:
 *   get:
 *     summary: Get a specific roadmap
 *     tags: [Roadmaps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Roadmap ID
 *     responses:
 *       200:
 *         description: Roadmap retrieved successfully
 */
router.get('/:id', authenticate, roadmapController.getRoadmap);

/**
 * @swagger
 * /api/roadmaps/{id}/progress:
 *   patch:
 *     summary: Update progress for a roadmap
 *     tags: [Roadmaps]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Roadmap ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProgressUpdate'
 *     responses:
 *       200:
 *         description: Progress updated successfully
 */
router.patch('/:id/progress', authenticate, validateRequest(progressUpdateSchema), roadmapController.updateProgress);

export default router;
