import express, { Application, Request, Response } from 'express';
import routes from './routes/index';
import { setupSwagger } from './config/swagger';
import { config, validateEnvironment, getEnvironmentInfo, logConfiguration } from './config/environment';
import { configureMiddleware, configureErrorHandling } from './middlewares/middlewareConfig';
import { scheduledTasksService } from './services/scheduledTasksService';
import { emailService } from './services/emailService.js';
import { errorMonitoringService } from './services/errorMonitoringService';
import { healthCheckService } from './services/healthCheckService';
import { adminSeedService } from './services/adminSeedService.js';
import { prisma } from './prisma/client';

// Validate environment configuration
let envValidation;
if (config.NODE_ENV === 'production') {
  // In production, use standard environment validation
  // We're not importing the custom validation to avoid MAILZEET_API_KEY requirement
  envValidation = {
    valid: true,
    errors: []
  };
} else {
  // In development, use standard environment validation
  envValidation = validateEnvironment();
}

if (!envValidation.valid) {
  console.error('❌ Environment validation failed:');
  envValidation.errors.forEach(error => {
    console.error(`   - ${error}`);
  });
  process.exit(1);
}

// Log configuration in development
logConfiguration();

const app: Application = express();

// Setup Swagger documentation (before routes)
setupSwagger(app);

// Configure global middleware
configureMiddleware(app);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: '🚀 Lurnix API running with TypeScript!',
    version: '1.0.0',
    environment: config.NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    documentation: '/api-docs',
    health: '/health'
  });
});

// Health check endpoints
app.get('/health', async (req: Request, res: Response) => {
  try {
    const healthCheck = await healthCheckService.performHealthCheck();
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                      healthCheck.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Quick health check for load balancers
app.get('/health/quick', async (req: Request, res: Response) => {
  try {
    const quickCheck = await healthCheckService.quickHealthCheck();
    const statusCode = quickCheck.status === 'healthy' ? 200 : 3;
    
    res.status(statusCode).json(quickCheck);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString()
    });
  }
});

// System information endpoint
app.get('/system-info', (req: Request, res: Response) => {
  const systemInfo = healthCheckService.getSystemInfo();
  res.json({
    success: true,
    data: systemInfo,
    timestamp: new Date().toISOString()
  });
});



// Mount all routes
app.use(routes);

// Configure error handling (must be last)
configureErrorHandling(app);

// Start scheduled tasks
scheduledTasksService.start();

const PORT = config.PORT;

const server = app.listen(PORT, async () => {
  console.log('🚀 Lurnix API Server Started');
  console.log('─'.repeat(50));
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
  console.log(`⚡ Quick Health: http://localhost:${PORT}/health/quick`);
  console.log(`📊 System Info: http://localhost:${PORT}/system-info`);
  console.log(`🌍 Environment: ${config.NODE_ENV}`);
  console.log(`📧 Email Service: ${config.EMAIL_ENABLED ? 'Enabled' : 'Disabled'}`);
  console.log(`👤 Admin Seed: ${config.ADMIN_SEED_ENABLED ? 'Enabled' : 'Disabled'}`);
  console.log('─'.repeat(50));
  
  // Seed default admin if enabled
  try {
    await adminSeedService.seedDefaultAdmin();
  } catch (error) {
    console.error('❌ Error seeding default admin:', error);
  }
  
  // Perform initial health check
  healthCheckService.performHealthCheck()
    .then(health => {
      console.log(`💚 Initial Health Check: ${health.status.toUpperCase()}`);
      if (health.status !== 'healthy') {
        console.warn('⚠️  Some services are not fully healthy. Check /health for details.');
      }
    })
    .catch(error => {
      console.error('❌ Initial health check failed:', error);
    });
});

// Graceful shutdown handler
const gracefulShutdown = async (signal: string) => {
  console.log(`\n${signal} received, shutting down gracefully...`);
  console.log('─'.repeat(50));
  
  // Close server to stop accepting new connections
  server.close(async () => {
    console.log('🔌 HTTP server closed');
    
    try {
      // Stop scheduled tasks
      scheduledTasksService.stop();
      console.log('⏰ Scheduled tasks stopped');
      
      // Cleanup health check service
      await healthCheckService.cleanup();
      console.log('🔍 Health check service cleaned up');
      
      console.log('✅ Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  });
  
  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('❌ Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  errorMonitoringService.recordError(error as any);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  errorMonitoringService.recordError(reason as any);
  gracefulShutdown('UNHANDLED_REJECTION');
});
