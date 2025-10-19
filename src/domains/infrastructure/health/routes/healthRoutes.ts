import { Router } from 'express';
import { healthController } from '../controllers/healthController';
import { rateLimit, rateLimitConfigs } from '../../../../middlewares/validation';

const router = Router();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic health check
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 status:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                 uptime:
 *                   type: number
 */
router.get('/', 
  rateLimit(rateLimitConfigs.general),
  healthController.basicHealth
);

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check with all services
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: All services are healthy
 *       503:
 *         description: One or more services are unhealthy
 */
router.get('/detailed',
  rateLimit(rateLimitConfigs.general),
  healthController.detailedHealth
);



/**
 * @swagger
 * /health/metrics:
 *   get:
 *     summary: System metrics and performance data
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: System metrics retrieved successfully
 */
router.get('/metrics',
  rateLimit(rateLimitConfigs.general),
  healthController.metrics
);

export default router;