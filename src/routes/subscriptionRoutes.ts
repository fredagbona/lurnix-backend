import express from 'express';
import { subscriptionController } from '../controllers/subscriptionController';
import { authenticate as authMiddleware } from '../middlewares/authMiddleware';
import { authenticateAdmin as adminAuthMiddleware } from '../middlewares/adminAuthMiddleware';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Subscriptions
 *   description: Subscription plan management
 */

/**
 * @swagger
 * /api/subscriptions:
 *   get:
 *     summary: Get all subscription plans
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: regionCode
 *         schema:
 *           type: string
 *         description: Filter by region code (e.g., 'US', 'FR')
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *         description: Filter by active status
 *     responses:
 *       200:
 *         description: List of subscription plans
 */
router.get('/', subscriptionController.getSubscriptionPlans);

/**
 * @swagger
 * /api/subscriptions/user-region:
 *   get:
 *     summary: Get subscription plans based on user's region
 *     tags: [Subscriptions]
 *     description: Returns subscription plans based on the user's detected region from request headers, query params, or IP
 *     responses:
 *       200:
 *         description: List of subscription plans for the user's region
 */
router.get('/user-region', subscriptionController.getSubscriptionPlansForUser);

/**
 * @swagger
 * /api/subscriptions/regions:
 *   get:
 *     summary: Get all available regions with subscription plans
 *     tags: [Subscriptions]
 *     description: Returns a list of all regions that have active subscription plans
 *     responses:
 *       200:
 *         description: List of available regions with their currency codes
 */
router.get('/regions', subscriptionController.getAvailableRegions);

/**
 * @swagger
 * /api/subscriptions/{id}:
 *   get:
 *     summary: Get subscription plan by ID
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan details
 *       404:
 *         description: Subscription plan not found
 */
router.get('/:id', subscriptionController.getSubscriptionPlanById);

/**
 * @swagger
 * /api/subscriptions/region/{regionCode}:
 *   get:
 *     summary: Get subscription plans by region code
 *     tags: [Subscriptions]
 *     parameters:
 *       - in: path
 *         name: regionCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Region code (e.g., 'US', 'FR')
 *     responses:
 *       200:
 *         description: List of subscription plans for the region
 */
router.get('/region/:regionCode', subscriptionController.getSubscriptionPlansByRegion);

/**
 * @swagger
 * /api/subscriptions:
 *   post:
 *     summary: Create a new subscription plan
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
 *               - code
 *               - name
 *               - price
 *               - currency
 *               - regionCode
 *               - interval
 *               - features
 *             properties:
 *               code:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *               regionCode:
 *                 type: string
 *               interval:
 *                 type: string
 *                 enum: [monthly, yearly]
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: Subscription plan created successfully
 *       400:
 *         description: Invalid input
 */
router.post('/', adminAuthMiddleware, subscriptionController.createSubscriptionPlan);

/**
 * @swagger
 * /api/subscriptions/{id}:
 *   put:
 *     summary: Update a subscription plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               currency:
 *                 type: string
 *               regionCode:
 *                 type: string
 *               interval:
 *                 type: string
 *                 enum: [monthly, yearly]
 *               features:
 *                 type: array
 *                 items:
 *                   type: string
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Subscription plan updated successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Subscription plan not found
 */
router.put('/:id', adminAuthMiddleware, subscriptionController.updateSubscriptionPlan);

/**
 * @swagger
 * /api/subscriptions/{id}:
 *   delete:
 *     summary: Delete a subscription plan
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Subscription plan ID
 *     responses:
 *       200:
 *         description: Subscription plan deleted successfully
 *       400:
 *         description: Cannot delete plan with active subscribers
 *       404:
 *         description: Subscription plan not found
 */
router.delete('/:id', adminAuthMiddleware, subscriptionController.deleteSubscriptionPlan);

/**
 * @swagger
 * /api/subscriptions/user/subscribe:
 *   post:
 *     summary: Subscribe a user to a plan
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
 *               - userId
 *               - subscriptionId
 *               - endDate
 *             properties:
 *               userId:
 *                 type: string
 *               subscriptionId:
 *                 type: string
 *               endDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: User subscribed successfully
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User or subscription plan not found
 */
router.post('/user/subscribe', authMiddleware, subscriptionController.subscribeUser);

/**
 * @swagger
 * /api/subscriptions/user/{userId}/cancel:
 *   post:
 *     summary: Cancel a user's subscription
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Subscription canceled successfully
 *       400:
 *         description: User does not have an active subscription
 *       404:
 *         description: User not found
 */
router.post('/user/:userId/cancel', authMiddleware, subscriptionController.cancelSubscription);

/**
 * @swagger
 * /api/subscriptions/user/{userId}:
 *   get:
 *     summary: Get a user's subscription details
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User subscription details
 *       404:
 *         description: User not found
 */
router.get('/user/:userId', authMiddleware, subscriptionController.getUserSubscription);

/**
 * @swagger
 * /api/subscriptions/user-region:
 *   get:
 *     summary: Get subscription plans based on user's region
 *     tags: [Subscriptions]
 *     description: Returns subscription plans based on the user's detected region from request headers, query params, or IP
 *     responses:
 *       200:
 *         description: List of subscription plans for the user's region
 */
router.get('/user-region', subscriptionController.getSubscriptionPlansForUser);

/**
 * @swagger
 * /api/subscriptions/regions:
 *   get:
 *     summary: Get all available regions with subscription plans
 *     tags: [Subscriptions]
 *     description: Returns a list of all regions that have active subscription plans
 *     responses:
 *       200:
 *         description: List of available regions with their currency codes
 */
router.get('/regions', subscriptionController.getAvailableRegions);

export default router;
