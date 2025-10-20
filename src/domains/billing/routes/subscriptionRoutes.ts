import express from 'express';
import { subscriptionController } from '../controllers/subscriptionController';
import { authenticate as authMiddleware } from '../../../middlewares/authMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription lifecycle management
 */

/**
 * @swagger
 * /api/subscriptions:
 *   post:
 *     summary: Create a subscription for the authenticated user
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - planId
 *             properties:
 *               planId:
 *                 type: string
 *                 format: uuid
 *               couponCode:
 *                 type: string
 *               autoRenewal:
 *                 type: boolean
 *               startDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: Subscription created successfully
 */
router.post('/', authMiddleware, subscriptionController.createSubscription.bind(subscriptionController));

/**
 * @swagger
 * /api/subscriptions/current:
 *   get:
 *     summary: Get the authenticated user's current subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current subscription metadata
 */
router.get('/current', authMiddleware, subscriptionController.getCurrentSubscription.bind(subscriptionController));

/**
 * @swagger
 * /api/subscriptions/{subscriptionId}/upgrade:
 *   put:
 *     summary: Upgrade a subscription to a new plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPlanId
 *             properties:
 *               newPlanId:
 *                 type: string
 *                 format: uuid
 *               couponCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription upgraded successfully
 */
router.put(
  '/:subscriptionId/upgrade',
  authMiddleware,
  subscriptionController.upgradeSubscription.bind(subscriptionController),
);

/**
 * @swagger
 * /api/subscriptions/{subscriptionId}/downgrade:
 *   put:
 *     summary: Downgrade a subscription to a new plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPlanId
 *             properties:
 *               newPlanId:
 *                 type: string
 *                 format: uuid
 *               couponCode:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription downgraded successfully
 */
router.put(
  '/:subscriptionId/downgrade',
  authMiddleware,
  subscriptionController.downgradeSubscription.bind(subscriptionController),
);

/**
 * @swagger
 * /api/subscriptions/{subscriptionId}/cancel:
 *   put:
 *     summary: Cancel a subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               cancelImmediately:
 *                 type: boolean
 *               reason:
 *                 type: string
 *     responses:
 *       200:
 *         description: Subscription cancelled successfully
 */
router.put(
  '/:subscriptionId/cancel',
  authMiddleware,
  subscriptionController.cancelSubscription.bind(subscriptionController),
);

/**
 * @swagger
 * /api/subscriptions/{subscriptionId}/reactivate:
 *   post:
 *     summary: Reactivate a cancelled subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: subscriptionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               billingCycle:
 *                 type: string
 *                 enum: [monthly, 6_months, 12_months]
 *     responses:
 *       200:
 *         description: Subscription reactivated successfully
 */
router.post(
  '/:subscriptionId/reactivate',
  authMiddleware,
  subscriptionController.reactivateSubscription.bind(subscriptionController),
);

export default router;
