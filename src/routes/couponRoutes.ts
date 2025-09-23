import express from 'express';
import { couponController } from '../controllers/couponController';
import { authenticate as authMiddleware, optionalAuthenticate } from '../middlewares/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Coupons
 *   description: Coupon validation and application
 */

/**
 * @swagger
 * /api/coupons/validate:
 *   post:
 *     summary: Validate a coupon against a plan
 *     tags: [Coupons]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - planId
 *             properties:
 *               code:
 *                 type: string
 *               planId:
 *                 type: string
 *                 format: uuid
 *               userId:
 *                 type: string
 *                 format: uuid
 *                 description: Optional user identifier for eligibility checks
 *     responses:
 *       200:
 *         description: Coupon validation result
 */
router.post('/validate', optionalAuthenticate, couponController.validateCoupon.bind(couponController));

/**
 * @swagger
 * /api/coupons/apply:
 *   post:
 *     summary: Apply a coupon to a subscription
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - subscriptionId
 *               - couponCode
 *             properties:
 *               subscriptionId:
 *                 type: string
 *                 format: uuid
 *               couponCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Coupon applied successfully
 */
router.post('/apply', authMiddleware, couponController.applyCoupon.bind(couponController));

/**
 * @swagger
 * /api/coupons/remove/{subscriptionId}:
 *   delete:
 *     summary: Remove a coupon from a subscription
 *     tags: [Coupons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Coupon removed successfully
 */
router.delete(
  '/remove/:subscriptionId',
  authMiddleware,
  couponController.removeCoupon.bind(couponController),
);

export default router;
