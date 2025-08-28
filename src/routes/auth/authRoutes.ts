import { Router } from 'express';
import { authController } from '../../controllers/authController';
import { authenticate, optionalAuthenticate } from '../../middlewares/authMiddleware';
import { validateRequest, rateLimit, rateLimitConfigs } from '../../middlewares/validation';
import { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema 
} from '../../validation/authSchemas';

const router = Router();

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - fullname
 *               - email
 *               - password
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
 *               password:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 *       409:
 *         description: Email or username already exists
 *       429:
 *         description: Too many registration attempts
 */
router.post('/register', 
  rateLimit(rateLimitConfigs.register),
  validateRequest(registerSchema),
  authController.register
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
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
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials or account deactivated
 *       429:
 *         description: Too many login attempts
 */
router.post('/login',
  rateLimit(rateLimitConfigs.auth),
  validateRequest(loginSchema),
  authController.login
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: Password reset email sent (if account exists)
 *       429:
 *         description: Too many password reset requests
 */
router.post('/forgot-password',
  rateLimit(rateLimitConfigs.passwordReset),
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password using token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password',
  rateLimit(rateLimitConfigs.auth),
  validateRequest(resetPasswordSchema),
  authController.resetPassword
);

/**
 * @swagger
 * /api/auth/verify-reset-token/{token}:
 *   get:
 *     summary: Verify password reset token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token verification result
 *       400:
 *         description: Invalid token format
 */
router.get('/verify-reset-token/:token',
  rateLimit(rateLimitConfigs.general),
  authController.verifyResetToken
);

/**
 * @swagger
 * /api/auth/refresh-token:
 *   post:
 *     summary: Refresh JWT token
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       401:
 *         description: Authentication required
 */
router.post('/refresh-token',
  authenticate,
  authController.refreshToken
);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 */
router.post('/logout',
  optionalAuthenticate,
  authController.logout
);

/**
 * @swagger
 * /api/auth/check:
 *   get:
 *     summary: Check authentication status
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User is authenticated
 *       401:
 *         description: User is not authenticated
 */
router.get('/check',
  authenticate,
  authController.checkAuth
);

export default router;