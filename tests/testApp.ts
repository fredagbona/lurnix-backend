import express from 'express';
import authRoutes from '../src/routes/auth/authRoutes.js';
import userManagementRoutes from '../src/routes/user/userManagementRoutes.js';
import { configureMiddleware, configureErrorHandling } from '../src/middlewares/middlewareConfig.js';

// Create test app with disabled rate limiting
export const createTestApp = () => {
  const app = express();
  
  // Configure middleware but disable rate limiting for tests
  process.env.ENABLE_RATE_LIMITING = 'false';
  configureMiddleware(app);
  
  // Mount routes
  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', userManagementRoutes);
  
  // Configure error handling
  configureErrorHandling(app);
  
  return app;
};