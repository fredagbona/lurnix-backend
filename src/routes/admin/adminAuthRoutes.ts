import { Router } from 'express';
import { adminAuthController } from '../../controllers/adminAuthController.js';
import { authenticateAdmin, requireSuperAdmin } from '../../middlewares/adminAuthMiddleware.js';
import { validateRequest, rateLimit, rateLimitConfigs } from '../../middlewares/validation.js';
import { adminLoginSchema, adminRegisterSchema, changePasswordSchema } from '../../validation/adminSchemas.js';
import adminPasswordResetRoutes from './adminPasswordResetRoutes.js';

const router = Router();

// Use admin password reset routes
router.use('/', adminPasswordResetRoutes);

/**
 * @swagger
 * /api/admin/auth/register:
 *   post:
 *     summary: Register a new admin (super_admin only)
 *     tags: [Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               role:
 *                 type: string
 *                 enum: [super_admin, manager, support]
 *     responses:
 *       201:
 *         description: Admin registered successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Insufficient permissions
 */
router.post('/register',
  authenticateAdmin,
  requireSuperAdmin,
  rateLimit(rateLimitConfigs.strict),
  validateRequest(adminRegisterSchema),
  adminAuthController.register
);

/**
 * @swagger
 * /api/admin/auth/login:
 *   post:
 *     summary: Admin login
 *     tags: [Admin Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Admin logged in successfully
 *       401:
 *         description: Invalid credentials
 */
router.post('/login',
  rateLimit(rateLimitConfigs.auth),
  validateRequest(adminLoginSchema),
  adminAuthController.login
);

/**
 * @swagger
 * /api/admin/auth/profile:
 *   get:
 *     summary: Get current admin profile
 *     tags: [Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Admin profile retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/profile',
  authenticateAdmin,
  rateLimit(rateLimitConfigs.general),
  adminAuthController.getProfile
);

/**
 * @swagger
 * /api/admin/auth/change-password:
 *   post:
 *     summary: Change admin password
 *     tags: [Admin Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Invalid input or current password is incorrect
 *       401:
 *         description: Authentication required
 */
router.post('/change-password',
  authenticateAdmin,
  rateLimit(rateLimitConfigs.strict),
  validateRequest(changePasswordSchema),
  adminAuthController.changePassword
);

export default router;
