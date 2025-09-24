import { Router } from "express";
import authRoutes from "./auth/authRoutes";
import userManagementRoutes from "./user/userManagementRoutes";
import adminRoutes from "./admin/adminRoutes";
import healthRoutes from "./health/healthRoutes";
import quizRoutes from "./quizRoutes";
import quizAdminRoutes from "./quizAdminRoutes";
import subscriptionRoutes from "./subscriptionRoutes";
import planRoutes from "./planRoutes";
import pricingRoutes from "./pricingRoutes";
import couponRoutes from "./couponRoutes";
import webhookRoutes from "./webhookRoutes";
import aiRoutes from "./aiRoutes";
import aiProfileRoutes from "./aiProfileRoutes";
import featureRequestRoutes from "./featureRequestRoutes";
import objectiveRoutes from "./objectiveRoutes";

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
router.use(`${API_VERSION}/subscriptions`, subscriptionRoutes);
router.use(`${API_VERSION}/plans`, planRoutes);
router.use(`${API_VERSION}/pricing`, pricingRoutes);
router.use(`${API_VERSION}/coupons`, couponRoutes);
router.use(`${API_VERSION}/webhooks`, webhookRoutes);
router.use(`${API_VERSION}/ai`, aiRoutes);
router.use(`${API_VERSION}/ai/profile`, aiProfileRoutes);
router.use(`${API_VERSION}/features`, featureRequestRoutes);
router.use(`${API_VERSION}/objectives`, objectiveRoutes);

// Health check endpoint (no auth required)
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API documentation endpoint
router.get("/docs", (req, res) => {
  res.redirect("/api-docs");
});

export default router;
