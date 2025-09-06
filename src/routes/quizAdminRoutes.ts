import express from 'express';
import { quizAdminController } from '../controllers/admin/quizAdminController';
import { authenticateAdmin } from '../middlewares/adminAuthMiddleware';
import { checkAdminRole } from '../middlewares/adminAuthMiddleware';
import { AdminRole } from '../types/auth';

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateAdmin);

// Routes that require SUPER_ADMIN role
router.post(
  '/questions',
  checkAdminRole([AdminRole.SUPER_ADMIN]),
  quizAdminController.createQuizQuestion
);

router.post(
  '/questions/with-options',
  checkAdminRole([AdminRole.SUPER_ADMIN]),
  quizAdminController.createQuizQuestionWithOptions
);

router.put(
  '/questions/:id',
  checkAdminRole([AdminRole.SUPER_ADMIN]),
  quizAdminController.updateQuizQuestion
);

router.delete(
  '/questions/:id',
  checkAdminRole([AdminRole.SUPER_ADMIN]),
  quizAdminController.deleteQuizQuestion
);

router.post(
  '/options',
  checkAdminRole([AdminRole.SUPER_ADMIN]),
  quizAdminController.createQuizOption
);

router.put(
  '/options/:id',
  checkAdminRole([AdminRole.SUPER_ADMIN]),
  quizAdminController.updateQuizOption
);

router.delete(
  '/options/:id',
  checkAdminRole([AdminRole.SUPER_ADMIN]),
  quizAdminController.deleteQuizOption
);

// Routes that allow both SUPER_ADMIN and MANAGER roles
router.get(
  '/questions',
  checkAdminRole([AdminRole.SUPER_ADMIN, AdminRole.MANAGER]),
  quizAdminController.getQuizQuestions
);

router.get(
  '/questions/:id',
  checkAdminRole([AdminRole.SUPER_ADMIN, AdminRole.MANAGER]),
  quizAdminController.getQuizQuestionById
);

export default router;
