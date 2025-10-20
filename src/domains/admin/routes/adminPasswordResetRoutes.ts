import express from 'express';
import { adminPasswordResetController } from '../controllers/adminPasswordResetController.js';

const router = express.Router();

/**
 * @swagger
 * /api/admin/auth/forgot-password:
 *   post:
 *     summary: Request password reset for admin
 *     tags: [Admin Auth]
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
 *         description: Password reset email sent if email exists
 *       400:
 *         description: Invalid input
 */
router.post('/forgot-password', adminPasswordResetController.forgotPassword);

/**
 * @swagger
 * /api/admin/auth/reset-password:
 *   post:
 *     summary: Reset admin password using token
 *     tags: [Admin Auth]
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
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successful
 *       400:
 *         description: Invalid or expired token
 */
router.post('/reset-password', adminPasswordResetController.resetPassword);


export default router;
