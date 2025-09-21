import { Router } from 'express';
import { quizController } from '../controllers/quizController';
import { authenticate } from '../middlewares/authMiddleware';
import { validateRequest } from '../middlewares/validation';
import { 
  quizSubmissionSchema, 
  createQuizQuestionSchema, 
  updateQuizQuestionSchema,
  createQuizSectionSchema,
  updateQuizSectionSchema
} from '../validation/quizSchemas';
import { checkAdminRole, authenticateAdmin } from '../middlewares/adminAuthMiddleware';
import { AdminRole } from '../types/auth';

const router = Router();

/**
 * @swagger
 * /api/quiz:
 *   get:
 *     summary: Get active quiz questions
 *     tags: [Quiz]
 *     parameters:
 *       - in: query
 *         name: version
 *         schema:
 *           type: integer
 *         description: Optional quiz version
 *     responses:
 *       200:
 *         description: Quiz questions retrieved successfully
 */
router.get('/', quizController.getQuiz);

/**
 * @swagger
 * /api/quiz/submit:
 *   post:
 *     summary: Submit quiz answers
 *     description: Submit user answers to the quiz to generate a personalized profile
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/QuizSubmission'
 *           example:
 *             version: 2
 *             answers: {
 *               "new_framework_scenario": "hands_on_first",
 *               "bug_hunting_preference": "experimental_debug",
 *               "learning_retention": "practical_memory",
 *               "project_approach": "mvp_first",
 *               "coding_dream": "freedom_lifestyle",
 *               "frustration_trigger": "need_examples",
 *               "success_feeling": "problem_solving_satisfaction",
 *               "time_availability": "balanced_time",
 *               "demo_excitement": "ui_excitement",
 *               "first_project_dream": "mobile_app_dream",
 *               "tech_personality": "speed_runner",
 *               "stuck_reaction": "help_seeker",
 *               "failure_recovery": "growth_mindset",
 *               "learning_plateau": "technology_explorer"
 *             }
 *     responses:
 *       200:
 *         description: Quiz submitted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: {
 *                 quizResultId: "550e8400-e29b-41d4-a716-446655440000",
 *                 profile: {
 *                   style: "visual",
 *                   visual: 0.6,
 *                   reading: 0.2,
 *                   handsOn: 0.2,
 *                   level: "beginner",
 *                   timePerDay: 60,
 *                   goal: "career_change",
 *                   preferredStack: ["react"]
 *                 }
 *               }
 *               timestamp: "2025-09-06T18:30:43.857Z"
 */
router.post('/submit', authenticate, validateRequest(quizSubmissionSchema), quizController.submitQuiz);

/**
 * @swagger
 * /api/quiz/results/{id}:
 *   get:
 *     summary: Get a specific quiz result
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz result ID
 *     responses:
 *       200:
 *         description: Quiz result retrieved successfully
 */
router.get('/results/:id', authenticate, quizController.getQuizResult);

/**
 * @swagger
 * /api/quiz/results:
 *   get:
 *     summary: Get all quiz results for the authenticated user
 *     tags: [Quiz]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quiz results retrieved successfully
 */
router.get('/results', authenticate, quizController.getUserQuizResults);

// Admin routes for managing quiz questions
/**
 * @swagger
 * /api/quiz/admin/questions:
 *   post:
 *     summary: Create a new quiz question (admin only)
 *     description: Create a new quiz question with options and assign it to a section
 *     tags: [Quiz, Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQuizQuestion'
 *           example:
 *             version: 1
 *             key: "new_question_key"
 *             title: "What is your preferred learning method?"
 *             description: "Select the option that best describes your learning style"
 *             type: "single"
 *             weightCategory: "learning_style"
 *             sortOrder: 8
 *             isActive: true
 *             sectionId: "550e8400-e29b-41d4-a716-446655440000"
 *             options: [
 *               {
 *                 label: "Reading documentation",
 *                 value: "reading",
 *                 weights: { "visual": 1, "reading": 3, "handsOn": 1 }
 *               },
 *               {
 *                 label: "Watching video tutorials",
 *                 value: "visual",
 *                 weights: { "visual": 3, "reading": 1, "handsOn": 1 }
 *               },
 *               {
 *                 label: "Hands-on practice",
 *                 value: "hands_on",
 *                 weights: { "visual": 1, "reading": 1, "handsOn": 3 }
 *               }
 *             ]
 *     responses:
 *       201:
 *         description: Quiz question created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: {
 *                 id: "550e8400-e29b-41d4-a716-446655440000",
 *                 key: "new_question_key",
 *                 title: "What is your preferred learning method?",
 *                 description: "Select the option that best describes your learning style",
 *                 type: "single",
 *                 weightCategory: "learning_style",
 *                 sortOrder: 8,
 *                 isActive: true,
 *                 sectionId: "550e8400-e29b-41d4-a716-446655440000",
 *                 createdAt: "2025-09-06T18:30:43.857Z",
 *                 updatedAt: "2025-09-06T18:30:43.857Z",
 *                 options: [
 *                   {
 *                     id: "550e8400-e29b-41d4-a716-446655440001",
 *                     label: "Reading documentation",
 *                     value: "reading",
 *                     weights: { "visual": 1, "reading": 3, "handsOn": 1 }
 *                   },
 *                   {
 *                     id: "550e8400-e29b-41d4-a716-446655440002",
 *                     label: "Watching video tutorials",
 *                     value: "visual",
 *                     weights: { "visual": 3, "reading": 1, "handsOn": 1 }
 *                   },
 *                   {
 *                     id: "550e8400-e29b-41d4-a716-446655440003",
 *                     label: "Hands-on practice",
 *                     value: "hands_on",
 *                     weights: { "visual": 1, "reading": 1, "handsOn": 3 }
 *                   }
 *                 ]
 *               }
 *               timestamp: "2025-09-06T18:30:43.857Z"
 */
router.post(
  '/admin/questions',
  authenticateAdmin,
  checkAdminRole([AdminRole.SUPER_ADMIN, AdminRole.MANAGER]),
  validateRequest(createQuizQuestionSchema),
  quizController.createQuizQuestion
);

/**
 * @swagger
 * /api/quiz/admin/questions/{id}:
 *   put:
 *     summary: Update a quiz question (admin only)
 *     description: Update an existing quiz question's properties, options, or section assignment
 *     tags: [Quiz, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz question ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateQuizQuestion'
 *           example:
 *             title: "Updated question title"
 *             description: "Updated description text"
 *             type: "single"
 *             weightCategory: "learning_style"
 *             sortOrder: 3
 *             isActive: true
 *             sectionId: "550e8400-e29b-41d4-a716-446655440000"
 *             options: [
 *               {
 *                 label: "Option 1",
 *                 value: "option1",
 *                 weights: { "visual": 1, "reading": 3, "handsOn": 1 }
 *               },
 *               {
 *                 label: "Option 2",
 *                 value: "option2",
 *                 weights: { "visual": 3, "reading": 1, "handsOn": 1 }
 *               }
 *             ]
 *     responses:
 *       200:
 *         description: Quiz question updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: {
 *                 id: "550e8400-e29b-41d4-a716-446655440000",
 *                 key: "existing_question_key",
 *                 title: "Updated question title",
 *                 description: "Updated description text",
 *                 type: "single",
 *                 weightCategory: "learning_style",
 *                 sortOrder: 3,
 *                 isActive: true,
 *                 sectionId: "550e8400-e29b-41d4-a716-446655440000",
 *                 createdAt: "2025-09-06T18:30:43.857Z",
 *                 updatedAt: "2025-09-06T18:30:43.857Z",
 *                 options: [
 *                   {
 *                     id: "550e8400-e29b-41d4-a716-446655440001",
 *                     label: "Option 1",
 *                     value: "option1",
 *                     weights: { "visual": 1, "reading": 3, "handsOn": 1 }
 *                   },
 *                   {
 *                     id: "550e8400-e29b-41d4-a716-446655440002",
 *                     label: "Option 2",
 *                     value: "option2",
 *                     weights: { "visual": 3, "reading": 1, "handsOn": 1 }
 *                   }
 *                 ]
 *               }
 *               timestamp: "2025-09-06T18:30:43.857Z"
 */
router.put(
  '/admin/questions/:id',
  authenticateAdmin,
  checkAdminRole([AdminRole.SUPER_ADMIN, AdminRole.MANAGER]),
  validateRequest(updateQuizQuestionSchema),
  quizController.updateQuizQuestion
);

/**
 * @swagger
 * /api/quiz/admin/questions/{id}:
 *   delete:
 *     summary: Delete a quiz question (admin only)
 *     description: Permanently delete a quiz question and all its options
 *     tags: [Quiz, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz question ID
 *     responses:
 *       200:
 *         description: Quiz question deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Quiz question deleted successfully"
 *               timestamp: "2025-09-06T19:20:15.123Z"
 */
router.delete(
  '/admin/questions/:id',
  authenticateAdmin,
  checkAdminRole([AdminRole.SUPER_ADMIN, AdminRole.MANAGER]),
  quizController.deleteQuizQuestion
);

/**
 * @swagger
 * /api/quiz/admin/sections:
 *   get:
 *     summary: Get all quiz sections (admin only)
 *     tags: [Quiz, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: version
 *         schema:
 *           type: integer
 *         description: Optional quiz version
 *     responses:
 *       200:
 *         description: Quiz sections retrieved successfully
 */
router.get(
  '/admin/sections',
  authenticateAdmin,
  checkAdminRole([AdminRole.SUPER_ADMIN, AdminRole.MANAGER]),
  quizController.getQuizSections
);

/**
 * @swagger
 * /api/quiz/admin/sections:
 *   post:
 *     summary: Create a new quiz section (admin only)
 *     description: Create a new section to group related quiz questions
 *     tags: [Quiz, Admin]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQuizSection'
 *           example:
 *             version: 1
 *             title: "Technical Background"
 *             description: "Questions about your technical experience and skills"
 *             sortOrder: 5
 *             isActive: true
 *     responses:
 *       201:
 *         description: Quiz section created successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: {
 *                 id: "550e8400-e29b-41d4-a716-446655440000",
 *                 version: 1,
 *                 title: "Technical Background",
 *                 description: "Questions about your technical experience and skills",
 *                 sortOrder: 5,
 *                 isActive: true,
 *                 createdAt: "2025-09-06T18:30:43.857Z",
 *                 updatedAt: "2025-09-06T18:30:43.857Z"
 *               }
 *               timestamp: "2025-09-06T18:30:43.857Z"
 */
router.post(
  '/admin/sections',
  authenticateAdmin,
  checkAdminRole([AdminRole.SUPER_ADMIN, AdminRole.MANAGER]),
  validateRequest(createQuizSectionSchema),
  quizController.createQuizSection
);

/**
 * @swagger
 * /api/quiz/admin/sections/{id}:
 *   put:
 *     summary: Update a quiz section (admin only)
 *     description: Update an existing quiz section's properties
 *     tags: [Quiz, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz section ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateQuizSection'
 *           example:
 *             title: "Updated Section Title"
 *             description: "Updated section description text"
 *             sortOrder: 2
 *             isActive: true
 *     responses:
 *       200:
 *         description: Quiz section updated successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data: {
 *                 id: "550e8400-e29b-41d4-a716-446655440000",
 *                 version: 1,
 *                 title: "Updated Section Title",
 *                 description: "Updated section description text",
 *                 sortOrder: 2,
 *                 isActive: true,
 *                 createdAt: "2025-09-06T18:30:43.857Z",
 *                 updatedAt: "2025-09-06T19:15:22.123Z",
 *                 questions: [
 *                   {
 *                     id: "550e8400-e29b-41d4-a716-446655440001",
 *                     key: "question_key_1",
 *                     title: "Question 1",
 *                     type: "single",
 *                     sortOrder: 1,
 *                     options: [...]
 *                   },
 *                   {
 *                     id: "550e8400-e29b-41d4-a716-446655440002",
 *                     key: "question_key_2",
 *                     title: "Question 2",
 *                     type: "multi",
 *                     sortOrder: 2,
 *                     options: [...]
 *                   }
 *                 ]
 *               }
 *               timestamp: "2025-09-06T19:15:22.123Z"
 */
router.put(
  '/admin/sections/:id',
  authenticateAdmin,
  checkAdminRole([AdminRole.SUPER_ADMIN, AdminRole.MANAGER]),
  validateRequest(updateQuizSectionSchema),
  quizController.updateQuizSection
);

/**
 * @swagger
 * /api/quiz/admin/sections/{id}:
 *   delete:
 *     summary: Delete a quiz section (admin only)
 *     description: Permanently delete a quiz section. Questions in this section will be unassigned from the section but not deleted.
 *     tags: [Quiz, Admin]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Quiz section ID
 *     responses:
 *       200:
 *         description: Quiz section deleted successfully
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: "Quiz section deleted successfully"
 *               timestamp: "2025-09-06T19:25:33.456Z"
 */
router.delete(
  '/admin/sections/:id',
  authenticateAdmin,
  checkAdminRole([AdminRole.SUPER_ADMIN, AdminRole.MANAGER]),
  quizController.deleteQuizSection
);

export default router;
