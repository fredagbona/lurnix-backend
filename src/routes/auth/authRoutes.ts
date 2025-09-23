import { Router } from 'express';
import { authController } from '../../controllers/authController';
import { authenticate, optionalAuthenticate } from '../../middlewares/authMiddleware';
import { validateRequest, validateQuery, validateParams, rateLimit, rateLimitConfigs } from '../../middlewares/validation';
import { 
  registerSchema, 
  loginSchema, 
  forgotPasswordSchema, 
  resetPasswordSchema,
  resendVerificationSchema,
  oauthStartQuerySchema,
  unlinkProviderSchema,
  unlinkProviderParamsSchema
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
 * /api/auth/verify-email/{token}:
 *   get:
 *     summary: Verify email address using token
 *     tags: [Authentication]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Invalid or expired verification token
 */
router.get('/verify-email/:token',
  rateLimit(rateLimitConfigs.general),
  authController.verifyEmail
);

/**
 * @swagger
 * /api/auth/resend-verification:
 *   post:
 *     summary: Resend verification email
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
 *         description: Verification email sent (if account exists and is not verified)
 *       429:
 *         description: Too many verification email requests
 */
router.post('/resend-verification',
  rateLimit(rateLimitConfigs.passwordReset), // Reuse password reset rate limit config
  validateRequest(resendVerificationSchema),
  authController.resendVerification
);

// OAuth provider routes
/**
 * @swagger
 * /api/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     description: Redirects the user to Google for authentication. Accepts an optional `redirect` query parameter (path that starts with `/`) to control the frontend post-login destination.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: redirect
 *         schema:
 *           type: string
 *           example: /dashboard
 *         description: Relative path to redirect to after successful authentication.
 *     responses:
 *       302:
 *         description: Redirect to Google OAuth consent page
 */
router.get('/google',
  rateLimit(rateLimitConfigs.auth),
  validateQuery(oauthStartQuerySchema),
  authController.googleOAuthInitiate
);

/**
 * @swagger
 * /api/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     description: Handles the Google OAuth response, issues a JWT, and redirects to the frontend with the token.
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect back to the frontend with authentication result
 */
router.get('/google/callback',
  authController.googleOAuthCallback
);

/**
 * @swagger
 * /api/auth/github:
 *   get:
 *     summary: Initiate GitHub OAuth login
 *     description: Redirects the user to GitHub for authentication. Accepts an optional `redirect` query parameter (path that starts with `/`) to control the frontend post-login destination.
 *     tags: [Authentication]
 *     parameters:
 *       - in: query
 *         name: redirect
 *         schema:
 *           type: string
 *           example: /dashboard
 *         description: Relative path to redirect to after successful authentication.
 *     responses:
 *       302:
 *         description: Redirect to GitHub OAuth consent page
 */
router.get('/github',
  rateLimit(rateLimitConfigs.auth),
  validateQuery(oauthStartQuerySchema),
  authController.githubOAuthInitiate
);

/**
 * @swagger
 * /api/auth/github/callback:
 *   get:
 *     summary: GitHub OAuth callback
 *     description: Handles the GitHub OAuth response, issues a JWT, and redirects to the frontend with the token.
 *     tags: [Authentication]
 *     responses:
 *       302:
 *         description: Redirect back to the frontend with authentication result
 */
router.get('/github/callback',
  authController.githubOAuthCallback
);

/**
 * @swagger
 * /api/auth/linked-accounts:
 *   get:
 *     summary: Get linked authentication providers
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Linked authentication providers
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     providers:
 *                       type: array
 *                       items:
 *                         type: string
 *                     primaryProvider:
 *                       type: string
 *                       nullable: true
 *                     hasPassword:
 *                       type: boolean
 *                     avatar:
 *                       type: string
 *                       nullable: true
 *       401:
 *         description: Authentication required
 */
router.get('/linked-accounts',
  authenticate,
  authController.getLinkedAccounts
);

/**
 * @swagger
 * /api/auth/unlink/{provider}:
 *   post:
 *     summary: Unlink an OAuth provider from the authenticated user
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [google, github]
 *         description: Provider to unlink
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: Required when the account also has an email/password login
 *     responses:
 *       200:
 *         description: Provider unlinked successfully
 *       400:
 *         description: Invalid request (e.g., last provider or password missing)
 *       401:
 *         description: Authentication required
 */
router.post('/unlink/:provider',
  authenticate,
  validateParams(unlinkProviderParamsSchema),
  validateRequest(unlinkProviderSchema),
  authController.unlinkProvider
);

export default router;
