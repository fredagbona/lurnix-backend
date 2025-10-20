import { Router } from "express";
import authRoutes from "./auth/authRoutes";
import userManagementRoutes from "./user/userManagementRoutes";
import adminRoutes from "../domains/admin/routes/adminRoutes";
import healthRoutes from "../domains/infrastructure/health/routes/healthRoutes";
import quizRoutes from "./quizRoutes";
import quizAdminRoutes from "./quizAdminRoutes";
import adaptiveQuizRoutes from "./adaptiveQuizRoutes";
import subscriptionRoutes from "./subscriptionRoutes";
import planRoutes from "./planRoutes";
import pricingRoutes from "./pricingRoutes";
import couponRoutes from "./couponRoutes";
import webhookRoutes from "./webhookRoutes";
import aiRoutes from "./aiRoutes";
import aiProfileRoutes from "./aiProfileRoutes";
import featureRequestRoutes from "../domains/features/routes/featureRequestRoutes";
import objectiveRoutes from "./objectiveRoutes";
import progressRoutes from "./progressRoutes";
import sprintRoutes from "./sprintRoutes";
import technicalAssessmentRoutes from "./technicalAssessmentRoutes";

const router = Router();

// API version prefix
const API_VERSION = "/api";

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/users`, userManagementRoutes);
router.use(`${API_VERSION}/admin`, adminRoutes);
router.use("/health", healthRoutes);
router.use(`${API_VERSION}/quiz`, quizRoutes);
router.use(`${API_VERSION}/admin/quiz`, quizAdminRoutes);
router.use(`${API_VERSION}/quizzes`, adaptiveQuizRoutes);
router.use(`${API_VERSION}/subscriptions`, subscriptionRoutes);
router.use(`${API_VERSION}/plans`, planRoutes);
router.use(`${API_VERSION}/pricing`, pricingRoutes);
router.use(`${API_VERSION}/coupons`, couponRoutes);
router.use(`${API_VERSION}/webhooks`, webhookRoutes);
router.use(`${API_VERSION}/ai`, aiRoutes);
router.use(`${API_VERSION}/ai/profile`, aiProfileRoutes);
router.use(`${API_VERSION}/features`, featureRequestRoutes);
router.use(`${API_VERSION}/objectives`, objectiveRoutes);
router.use(`${API_VERSION}`, progressRoutes);
router.use(`${API_VERSION}`, sprintRoutes);
router.use(`${API_VERSION}/assessments`, technicalAssessmentRoutes);

// Health check endpoint (no auth required)
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API documentation endpoint (only in development)
router.get("/docs", (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    res.redirect("/api-docs");
  } else {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'API documentation is not available in production'
      },
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
