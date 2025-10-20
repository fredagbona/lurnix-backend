import express from 'express';
import { planController } from '../controllers/planController';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Plans
 *   description: Subscription plan retrieval and pricing
 */

/**
 * @swagger
 * /api/plans:
 *   get:
 *     summary: Get available subscription plans
 *     tags: [Plans]
 *     responses:
 *       200:
 *         description: List of subscription plans grouped by plan type with pricing tiers
 */
router.get('/', planController.getPlans);

/**
 * @swagger
 * /api/plans/{planType}/pricing:
 *   get:
 *     summary: Get pricing details for a plan type
 *     tags: [Plans]
 *     parameters:
 *       - in: path
 *         name: planType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [free, builder, master]
 *         description: Plan type identifier
 *       - in: query
 *         name: billing_cycle
 *         schema:
 *           type: string
 *           enum: [monthly, 6_months, 12_months]
 *         description: Optional billing cycle filter
 *     responses:
 *       200:
 *         description: Pricing tiers for the requested plan
 *       404:
 *         description: Plan not found
 */
router.get('/:planType/pricing', planController.getPlanPricing);

export default router;
