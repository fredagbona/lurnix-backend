import { Router } from 'express';
import { userManagementController } from '../../controllers/userManagementController';
import { authenticate, optionalAuthenticate } from '../../middlewares/authMiddleware';
import { validateRequest, validateQuery, rateLimit, rateLimitConfigs } from '../../middlewares/validation';
import { requireAccountOwnership } from '../../middlewares/securityMiddleware';
import { 
  updateProfileSchema, 
  changePasswordSchema, 
  deleteAccountSchema 
} from '../../validation/authSchemas';
import { 
  emailAvailabilityQuerySchema, 
  usernameAvailabilityQuerySchema 
} from '../../validation/routeSchemas.js';

const router = Router();

/**
 * @swagger
 * /api/users/profile:
 *   get:
 *     summary: Get user profile
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/profile',
  authenticate,
  userManagementController.getProfile
);

/**
 * @swagger
 * /api/users/profile:
 *   put:
 *     summary: Update user profile
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 30
 *               fullname:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Authentication required
 *       409:
 *         description: Email or username already exists
 */
router.put('/profile',
  authenticate,
  rateLimit(rateLimitConfigs.general),
  validateRequest(updateProfileSchema),
  userManagementController.updateProfile
);

/**
 * @swagger
 * /api/users/password:
 *   put:
 *     summary: Change password
 *     tags: [User Management]
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
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Invalid current password or authentication required
 */
router.put('/password',
  authenticate,
  rateLimit(rateLimitConfigs.strict),
  validateRequest(changePasswordSchema),
  userManagementController.changePassword
);

/**
 * @swagger
 * /api/users/account:
 *   delete:
 *     summary: Delete user account (soft delete)
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - password
 *             properties:
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Account deleted successfully
 *       401:
 *         description: Invalid password or authentication required
 */
router.delete('/account',
  authenticate,
  rateLimit(rateLimitConfigs.strict),
  validateRequest(deleteAccountSchema),
  userManagementController.deleteAccount
);

/**
 * @swagger
 * /api/users/check-email:
 *   get:
 *     summary: Check email availability
 *     tags: [User Management]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: true
 *         schema:
 *           type: string
 *           format: email
 *     responses:
 *       200:
 *         description: Email availability status
 *       400:
 *         description: Invalid email format
 */
router.get('/check-email',
  optionalAuthenticate,
  rateLimit(rateLimitConfigs.general),
  validateQuery(emailAvailabilityQuerySchema),
  userManagementController.checkEmailAvailability
);

/**
 * @swagger
 * /api/users/check-username:
 *   get:
 *     summary: Check username availability
 *     tags: [User Management]
 *     parameters:
 *       - in: query
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *           minLength: 3
 *           maxLength: 30
 *     responses:
 *       200:
 *         description: Username availability status
 *       400:
 *         description: Invalid username format
 */
router.get('/check-username',
  optionalAuthenticate,
  rateLimit(rateLimitConfigs.general),
  validateQuery(usernameAvailabilityQuerySchema),
  userManagementController.checkUsernameAvailability
);

/**
 * @swagger
 * /api/users/account-status:
 *   get:
 *     summary: Get account status
 *     tags: [User Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Account status retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/account-status',
  authenticate,
  userManagementController.getAccountStatus
);

export default router;