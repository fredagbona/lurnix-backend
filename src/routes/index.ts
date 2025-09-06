import { Router } from "express";
import authRoutes from "./auth/authRoutes";
import userManagementRoutes from "./user/userManagementRoutes";
import adminRoutes from "./admin/adminRoutes";
import healthRoutes from "./health/healthRoutes";
import quizRoutes from "./quizRoutes";
import roadmapRoutes from "./roadmapRoutes";
import quizAdminRoutes from "./quizAdminRoutes";
import subscriptionRoutes from "./subscriptionRoutes";

const router = Router();

// API version prefix
const API_VERSION = "/api";

// Mount routes
router.use(`${API_VERSION}/auth`, authRoutes);
router.use(`${API_VERSION}/users`, userManagementRoutes);
router.use(`${API_VERSION}/admin`, adminRoutes);
router.use("/health", healthRoutes);
router.use(`${API_VERSION}/quiz`, quizRoutes);
router.use(`${API_VERSION}/roadmaps`, roadmapRoutes);
router.use(`${API_VERSION}/admin/quiz`, quizAdminRoutes);
router.use(`${API_VERSION}/subscriptions`, subscriptionRoutes);

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
