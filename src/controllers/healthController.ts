import { Request, Response } from 'express';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { prisma } from '../prisma/client.js';
import { emailService } from '../services/emailService.js';
import { errorMonitoringService } from '../services/infrastructure';
import { getEnvironmentInfo } from '../config/environment.js';

export class HealthController {
  // Basic health check
  basicHealth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    res.status(200).json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Detailed health check
  detailedHealth = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const checks = await this.performHealthChecks();
    const overallStatus = checks.every(check => check.status === 'healthy') ? 'healthy' : 'unhealthy';
    const statusCode = overallStatus === 'healthy' ? 200 : 503;

    res.status(statusCode).json({
      success: overallStatus === 'healthy',
      status: overallStatus,
      timestamp: new Date().toISOString(),
      environment: getEnvironmentInfo(),
      checks: checks.reduce((acc, check) => {
        acc[check.name] = {
          status: check.status,
          message: check.message,
          responseTime: check.responseTime,
          ...(check.details && { details: check.details }),
        };
        return acc;
      }, {} as Record<string, any>),
    });
  });



  // System metrics
  metrics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const errorStats = errorMonitoringService.getStatsForPeriod(24);

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      metrics: {
        system: {
          uptime: process.uptime(),
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
        },
        memory: {
          rss: memoryUsage.rss,
          heapTotal: memoryUsage.heapTotal,
          heapUsed: memoryUsage.heapUsed,
          external: memoryUsage.external,
          arrayBuffers: memoryUsage.arrayBuffers,
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system,
        },
        errors: {
          totalErrors: errorStats.totalErrors,
          criticalErrors: errorStats.criticalErrors,
          highErrors: errorStats.highErrors,
          errorRate: errorStats.errorRate,
        },
      },
    });
  });

  // Private helper methods
  private async performHealthChecks() {
    const checks = [];

    // Database check
    checks.push(await this.checkDatabase());

    // Email service check
    checks.push(await this.checkEmailService());

    // Error monitoring check
    checks.push(await this.checkErrorMonitoring());

    // Memory check
    checks.push(await this.checkMemoryUsage());

    return checks;
  }



  private async checkDatabase() {
    const startTime = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      return {
        name: 'database',
        status: 'healthy' as const,
        message: 'Database connection successful',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy' as const,
        message: 'Database connection failed',
        responseTime: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkEmailService() {
    const startTime = Date.now();
    try {
      const emailStatus = emailService.getStatus();
      
      if (!emailStatus.enabled) {
        return {
          name: 'email',
          status: 'healthy' as const,
          message: 'Email service disabled',
          responseTime: Date.now() - startTime,
        };
      }

      if (!emailStatus.configured) {
        return {
          name: 'email',
          status: 'unhealthy' as const,
          message: 'Email service not configured',
          responseTime: Date.now() - startTime,
        };
      }

      const connected = await emailService.testConnection();
      return {
        name: 'email',
        status: connected ? 'healthy' as const : 'unhealthy' as const,
        message: connected ? 'Email service connected' : 'Email service connection failed',
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        name: 'email',
        status: 'unhealthy' as const,
        message: 'Email service check failed',
        responseTime: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkErrorMonitoring() {
    const startTime = Date.now();
    try {
      const healthStatus = errorMonitoringService.getHealthStatus();
      return {
        name: 'errorMonitoring',
        status: healthStatus.status === 'critical' ? 'unhealthy' as const : 'healthy' as const,
        message: healthStatus.message,
        responseTime: Date.now() - startTime,
        details: healthStatus.details,
      };
    } catch (error) {
      return {
        name: 'errorMonitoring',
        status: 'unhealthy' as const,
        message: 'Error monitoring check failed',
        responseTime: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async checkMemoryUsage() {
    const startTime = Date.now();
    try {
      const memoryUsage = process.memoryUsage();
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const usagePercentage = (heapUsedMB / heapTotalMB) * 100;

      const status = usagePercentage > 90 ? 'unhealthy' as const : 'healthy' as const;
      const message = `Memory usage: ${heapUsedMB.toFixed(2)}MB / ${heapTotalMB.toFixed(2)}MB (${usagePercentage.toFixed(1)}%)`;

      return {
        name: 'memory',
        status,
        message,
        responseTime: Date.now() - startTime,
        details: {
          heapUsed: heapUsedMB,
          heapTotal: heapTotalMB,
          usagePercentage,
        },
      };
    } catch (error) {
      return {
        name: 'memory',
        status: 'unhealthy' as const,
        message: 'Memory check failed',
        responseTime: Date.now() - startTime,
        details: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const healthController = new HealthController();