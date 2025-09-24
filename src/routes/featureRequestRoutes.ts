import { Router } from 'express';
import { featureRequestController } from '../controllers/featureRequestController';
import { authenticate, optionalAuthenticate } from '../middlewares/authMiddleware';
import { validateQuery, validateRequest, validateParams } from '../middlewares/validation';
import {
  featureListQuerySchema,
  featureCreateSchema,
  featureIdParamSchema,
} from '../validation/featureRequestSchemas';

const router = Router();

/**
 * @swagger
 * /api/features/categories:
 *   get:
 *     summary: List available feature request categories
 *     tags: [Features]
 *     responses:
 *       200:
 *         description: Categories returned successfully
 */
router.get('/categories', featureRequestController.categories);

/**
 * @swagger
 * /api/features:
 *   get:
 *     summary: List feature requests
 *     tags: [Features]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, under_review, in_progress, released, declined]
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [top, new, trending]
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feature requests returned successfully
 */
router.get('/', optionalAuthenticate, validateQuery(featureListQuerySchema), featureRequestController.list);

/**
 * @swagger
 * /api/features:
 *   post:
 *     summary: Submit a new feature request
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description, category]
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Feature request created
 *       409:
 *         description: Duplicate title detected
 *       429:
 *         description: User reached submission limit
 */
router.post('/', authenticate, validateRequest(featureCreateSchema), featureRequestController.create);

/**
 * @swagger
 * /api/features/{id}:
 *   get:
 *     summary: Get a single feature request
 *     tags: [Features]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Feature request found
 *       404:
 *         description: Feature request not found
 */
router.get('/:id', optionalAuthenticate, validateParams(featureIdParamSchema), featureRequestController.getById);

/**
 * @swagger
 * /api/features/{id}/votes:
 *   post:
 *     summary: Toggle a vote on a feature request
 *     tags: [Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vote toggled
 *       401:
 *         description: Authentication required
 *       404:
 *         description: Feature request not found
 */
router.post('/:id/votes', authenticate, validateParams(featureIdParamSchema), featureRequestController.toggleVote);

export default router;
