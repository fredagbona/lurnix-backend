import express from 'express';
import { planController } from '../controllers/planController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Pricing
 *   description: Pricing calculations and utilities
 */

/**
 * @swagger
 * /api/pricing/calculate:
 *   post:
 *     summary: Calculate pricing for a subscription plan
 *     tags: [Pricing]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               planId:
 *                 type: string
 *                 format: uuid
 *                 description: Subscription plan tier identifier
 *               planType:
 *                 type: string
 *                 enum: [free, builder, master]
 *                 description: Plan type (required if planId is not provided)
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, 6_months, 12_months]
 *                 description: Billing cycle to calculate pricing for
 *               couponCode:
 *                 type: string
 *                 description: Optional coupon code to validate (not yet applied)
 *     responses:
 *       200:
 *         description: Pricing calculation result
 *       400:
 *         description: Invalid input data
 *       404:
 *         description: Plan not found
 */
router.post('/calculate', planController.calculatePricing);

export default router;
