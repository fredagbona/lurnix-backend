import express from 'express';
import { authenticate as authMiddleware } from '../middlewares/authMiddleware.js';
import { objectiveController } from '../controllers/objectiveController.js';

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Objectives
 *   description: Manage learner objectives and sprint planning
 */

/**
 * @swagger
 * /api/objectives:
 *   post:
 *     summary: Create an objective
 *     description: Creates a learner objective linked to a profile snapshot. Initial sprint planning is triggered separately.
 *     tags: [Objectives]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Build portfolio-ready landing page"
 *               description:
 *                 type: string
 *                 example: "Ship a responsive landing page with deployable demo."
 *               learnerProfileId:
 *                 type: string
 *                 format: uuid
 *               successCriteria:
 *                 type: array
 *                 items:
 *                   type: string
 *               requiredSkills:
 *                 type: array
 *                 items:
 *                   type: string
 *               priority:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *     responses:
 *       201:
 *         description: Objective created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   description: Localized success message using `objectives.create.success`
 *                 data:
 *                   type: object
 *                   properties:
 *                     objective:
 *                       $ref: '#/components/schemas/Objective'
 *                     planLimits:
 *                       $ref: '#/components/schemas/PlanLimits'
 *                 timestamp:
 *                   type: string
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 */
router.post('/', authMiddleware, objectiveController.createObjective.bind(objectiveController));

/**
 * @swagger
 * /api/objectives:
 *   get:
 *     summary: List objectives for the authenticated learner
 *     description: Returns objectives with their latest sprint metadata so the UI can render the planning dashboard.
 *     tags: [Objectives]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Objectives retrieved successfully
 */
router.get('/', authMiddleware, objectiveController.listObjectives.bind(objectiveController));

/**
 * @swagger
 * /api/objectives/{objectiveId}:
 *   get:
 *     summary: Retrieve a single objective with its sprints
 *     description: Returns detailed objective context including historical sprints for timeline/progress views.
 *     tags: [Objectives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Objective retrieved successfully
 *       404:
 *         description: Objective not found
 */
router.get('/:objectiveId', authMiddleware, objectiveController.getObjective.bind(objectiveController));

/**
 * @swagger
 * /api/objectives/{objectiveId}:
 *   delete:
 *     summary: Delete an objective without sprints
 *     description: Removes an objective that has no associated sprints. Use this to clean up mistaken objectives before planning begins.
 *     tags: [Objectives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Objective deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   description: Localized success message using `objectives.delete.success`
 *                 data:
 *                   type: object
 *                   properties:
 *                     planLimits:
 *                       $ref: '#/components/schemas/PlanLimits'
 *                 timestamp:
 *                   type: string
 *       400:
 *         description: Objective has existing sprints
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Objective not found
 */
router.delete('/:objectiveId', authMiddleware, objectiveController.deleteObjective.bind(objectiveController));

/**
 * @swagger
 * /api/objectives/{objectiveId}/sprints/generate:
 *   post:
 *     summary: Generate the initial skeleton sprint for an objective
 *     description: Creates a one-day, three micro-task sprint skeleton so learners can start immediately. Additional scope can be added later via the expansion endpoint.
 *     tags: [Objectives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               learnerProfileId:
 *                 type: string
 *                 format: uuid
 *               preferLength:
 *                 type: integer
 *                 enum: [1, 3, 7, 14]
 *                 description: Desired eventual sprint length (used as a target for future expansions). The initial skeleton is always 1 day.
 *               allowedResources:
 *                 type: array
 *                 description: Restrict the generated sprint to this whitelist of resources.
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Sprint generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   description: Localized success message using `objectives.sprint.generated`
 *                 data:
 *                   $ref: '#/components/schemas/SprintPlanResponse'
 *                 timestamp:
 *                   type: string
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 */
router.post('/:objectiveId/sprints/generate', authMiddleware, objectiveController.generateSprint.bind(objectiveController));

/**
 * @swagger
 * /api/objectives/{objectiveId}/sprints/{sprintId}/expand:
 *   post:
 *     summary: Expand an existing sprint incrementally
 *     description: Extends the current sprint plan by adding more days or micro-tasks while preserving previously generated work.
 *     tags: [Objectives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SprintExpansionRequest'
 *     responses:
 *       200:
 *         description: Sprint expanded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   description: Localized success message using `objectives.sprint.expanded`
 *                 data:
 *                   $ref: '#/components/schemas/SprintPlanResponse'
 *                 timestamp:
 *                   type: string
 *       400:
 *         description: Invalid payload
 *       401:
 *         description: Unauthorized
 */
router.post(
  '/:objectiveId/sprints/:sprintId/expand',
  authMiddleware,
  objectiveController.expandSprint.bind(objectiveController)
);

/**
 * @swagger
 * /api/objectives/{objectiveId}/sprints/{sprintId}:
 *   get:
 *     summary: Retrieve a sprint details
 *     description: Returns sprint metadata and planner output for a given objective.
 *     tags: [Objectives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sprint retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                   description: Localized message using `objectives.sprint.retrieved`
 *                 data:
 *                   $ref: '#/components/schemas/SprintPlanResponse'
 *                 timestamp:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Sprint not found
 */
router.get('/:objectiveId/sprints/:sprintId', authMiddleware, objectiveController.getSprint.bind(objectiveController));

/**
 * @swagger
 * /api/objectives/{objectiveId}/sprints/{sprintId}/evidence:
 *   post:
 *     summary: Submit sprint evidence artifacts
 *     description: Stores sprint deliverable artifacts and optional self-evaluation notes before triggering a review.
 *     tags: [Objectives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: sprintId
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
 *               artifacts:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     artifactId:
 *                       type: string
 *                     projectId:
 *                       type: string
 *                     type:
 *                       type: string
 *                       enum: [repository, deployment, video, screenshot]
 *                     url:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [ok, broken, missing, unknown]
 *                     notes:
 *                       type: string
 *               selfEvaluation:
 *                 type: object
 *                 properties:
 *                   confidence:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 10
 *                   reflection:
 *                     type: string
 *               markSubmitted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Sprint evidence stored successfully
 */
router.post(
  '/:objectiveId/sprints/:sprintId/evidence',
  authMiddleware,
  objectiveController.submitSprintEvidence.bind(objectiveController)
);

/**
 * @swagger
 * /api/objectives/{objectiveId}/sprints/{sprintId}/review:
 *   post:
 *     summary: Trigger an automated sprint review
 *     description: Runs the reviewer engine on submitted evidence and returns the structured review summary.
 *     tags: [Objectives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Sprint reviewed successfully
 *   get:
 *     summary: Retrieve the latest review summary
 *     description: Returns the stored reviewer output for a sprint, if available.
 *     tags: [Objectives]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: objectiveId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: sprintId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Review summary retrieved
 */
router.post(
  '/:objectiveId/sprints/:sprintId/review',
  authMiddleware,
  objectiveController.reviewSprint.bind(objectiveController)
);
router.get(
  '/:objectiveId/sprints/:sprintId/review',
  authMiddleware,
  objectiveController.getSprintReview.bind(objectiveController)
);

export default router;
