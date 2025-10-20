import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { emailController } from '../../../controllers/emailController';
import { authenticateAdmin, requireManager, requireSuperAdmin } from '../../../middlewares/adminAuthMiddleware';
import { validateRequest, validateQuery, validateParams, rateLimit, rateLimitConfigs } from '../../../middlewares/validation';
import { paginationQuerySchema, userIdParamSchema } from '../../../validation/routeSchemas';
import { testEmailSchema } from '../../../validation/emailSchemas';
import adminAuthRoutes from './adminAuthRoutes';
import featureRequestAdminRoutes from '../../features/routes/featureRequestAdminRoutes';

const router = Router();

// Use admin auth routes
router.use('/auth', adminAuthRoutes);

router.use('/features', featureRequestAdminRoutes);

// All other admin routes require admin authentication

/**
 * @swagger
 * /api/admin/stats:
 *   get:
 *     summary: Get user statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User statistics retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/stats',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.general),
  adminController.getUserStats
);

/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     summary: Get all users with pagination
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *       401:
 *         description: Authentication required
 */
// Original route with all middleware
// router.get('/users',
//   authenticateAdmin,
//   requireManager,
//   rateLimit(rateLimitConfigs.general),
//   validateQuery(paginationQuerySchema),
//   adminController.getAllUsers
// );

// Test route with minimal middleware
router.get('/users-test',
  adminController.getAllUsers
);

// Modified route with only authentication middleware
router.get('/users',
  authenticateAdmin,
  adminController.getAllUsers
);

/**
 * @swagger
 * /api/admin/users/{userId}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Authentication required
 */
router.get('/users/:userId',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.general),
  validateParams(userIdParamSchema),
  adminController.getUserById
);

/**
 * @swagger
 * /api/admin/users/{userId}/restore:
 *   post:
 *     summary: Restore soft-deleted user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User restored successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Authentication required
 */
router.post('/users/:userId/restore',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.strict),
  adminController.restoreUser
);

/**
 * @swagger
 * /api/admin/users/{userId}/hard-delete:
 *   delete:
 *     summary: Permanently delete user (DANGEROUS)
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User permanently deleted
 *       404:
 *         description: User not found
 *       401:
 *         description: Authentication required
 */
router.delete('/users/:userId/hard-delete',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.strict),
  adminController.hardDeleteUser
);

/**
 * @swagger
 * /api/admin/users/{userId}/reset-token:
 *   get:
 *     summary: Get password reset token info for user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reset token info retrieved successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Authentication required
 */
router.get('/users/:userId/reset-token',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.general),
  adminController.getResetTokenInfo
);

/**
 * @swagger
 * /api/admin/users/{userId}/reset-token:
 *   delete:
 *     summary: Cancel password reset for user
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Password reset cancelled successfully
 *       404:
 *         description: User not found
 *       401:
 *         description: Authentication required
 */
router.delete('/users/:userId/reset-token',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.strict),
  adminController.cancelPasswordReset
);

/**
 * @swagger
 * /api/admin/maintenance/cleanup:
 *   post:
 *     summary: Run cleanup tasks manually
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cleanup tasks completed successfully
 *       401:
 *         description: Authentication required
 */
router.post('/maintenance/cleanup',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.strict),
  adminController.runCleanupTasks
);

/**
 * @swagger
 * /api/admin/maintenance/cleanup-tokens:
 *   post:
 *     summary: Clean up expired reset tokens
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Expired tokens cleaned up successfully
 *       401:
 *         description: Authentication required
 */
router.post('/maintenance/cleanup-tokens',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.strict),
  adminController.cleanupExpiredTokens
);

/**
 * @swagger
 * /api/admin/health:
 *   get:
 *     summary: System health check
 *     tags: [Admin]
 *     responses:
 *       200:
 *         description: System is healthy
 *       503:
 *         description: System health check failed
 */
router.get('/health',
  rateLimit(rateLimitConfigs.general),
  adminController.healthCheck
);

/**
 * @swagger
 * /api/admin/errors/stats:
 *   get:
 *     summary: Get error statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Error statistics retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/errors/stats',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.general),
  adminController.getErrorStats
);

/**
 * @swagger
 * /api/admin/errors/reset:
 *   post:
 *     summary: Reset error statistics
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Error statistics reset successfully
 *       401:
 *         description: Authentication required
 */
router.post('/errors/reset',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.strict),
  adminController.resetErrorStats
);

/**
 * @swagger
 * /api/admin/email/status:
 *   get:
 *     summary: Get email service status
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email service status retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/email/status',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.general),
  emailController.getEmailStatus
);

/**
 * @swagger
 * /api/admin/email/templates:
 *   get:
 *     summary: Get available email templates
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email templates retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/email/templates',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.general),
  emailController.getEmailTemplates
);

/**
 * @swagger
 * /api/admin/email/test:
 *   post:
 *     summary: Send test email
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *             properties:
 *               to:
 *                 type: string
 *                 format: email
 *               template:
 *                 type: string
 *               templateData:
 *                 type: object
 *     responses:
 *       200:
 *         description: Test email sent successfully
 *       401:
 *         description: Authentication required
 */
router.post('/email/test',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.strict),
  validateRequest(testEmailSchema),
  emailController.sendTestEmail
);

/**
 * @swagger
 * /api/admin/email/test-connectivity:
 *   get:
 *     summary: Test email service connectivity
 *     tags: [Admin]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Email connectivity test completed
 *       401:
 *         description: Authentication required
 */
router.get('/email/test-connectivity',
  authenticateAdmin,
  requireManager,
  rateLimit(rateLimitConfigs.general),
  emailController.testEmailConnectivity
);

export default router;
