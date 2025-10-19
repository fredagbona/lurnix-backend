import { Router } from 'express';
import { featureRequestAdminController } from '../controllers/featureRequestAdminController';
import { authenticateAdmin, requireSupport } from '../../../middlewares/adminAuthMiddleware';
import { validateParams, validateRequest } from '../../../middlewares/validation';
import {
  featureIdParamSchema,
  featureUpdateSchema,
  featureMergeSchema,
  featureModNoteSchema,
} from '../validation/featureRequestSchemas';

const router = Router();

/**
 * @swagger
 * /api/admin/features/{id}:
 *   get:
 *     summary: Get feature request details for moderators
 *     tags: [Admin Features]
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
 *         description: Feature request returned
 *       404:
 *         description: Feature request not found
 */
router.get('/:id', authenticateAdmin, requireSupport, validateParams(featureIdParamSchema), featureRequestAdminController.getFeature);

/**
 * @swagger
 * /api/admin/features/{id}:
 *   patch:
 *     summary: Update or re-label a feature request
 *     tags: [Admin Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               category:
 *                 type: string
 *               status:
 *                 type: string
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *               mergedIntoId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Feature request updated
 *       404:
 *         description: Feature request not found
 */
router.patch(
  '/:id',
  authenticateAdmin,
  requireSupport,
  validateParams(featureIdParamSchema),
  validateRequest(featureUpdateSchema),
  featureRequestAdminController.updateFeature
);

/**
 * @swagger
 * /api/admin/features/{id}/merge:
 *   post:
 *     summary: Merge a feature request into another
 *     tags: [Admin Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetId]
 *             properties:
 *               targetId:
 *                 type: string
 *               closeWithStatus:
 *                 type: string
 *     responses:
 *       200:
 *         description: Feature request merged
 *       404:
 *         description: Feature request not found
 */
router.post(
  '/:id/merge',
  authenticateAdmin,
  requireSupport,
  validateParams(featureIdParamSchema),
  validateRequest(featureMergeSchema),
  featureRequestAdminController.mergeFeatures
);

/**
 * @swagger
 * /api/admin/features/{id}/mod-notes:
 *   post:
 *     summary: Add a moderator note to a feature request
 *     tags: [Admin Features]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [note]
 *             properties:
 *               note:
 *                 type: string
 *     responses:
 *       201:
 *         description: Note created
 *       404:
 *         description: Feature request not found
 */
router.post(
  '/:id/mod-notes',
  authenticateAdmin,
  requireSupport,
  validateParams(featureIdParamSchema),
  validateRequest(featureModNoteSchema),
  featureRequestAdminController.addModeratorNote
);

export default router;
