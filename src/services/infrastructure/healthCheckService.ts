import { PrismaClient } from '@prisma/client';
import { emailService } from '../emailService.js';
import { errorMonitoringService } from './errorMonitoringService.js';
import { config } from '../../config/environment.js';

// Health check status types
export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  status: HealthStatus;
  message: string;
  responseTime?: number;
  details?: any;
}

export interface SystemHealthCheck {
  status: HealthStatus;
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: HealthCheckResult;
    email: HealthCheckResult;
    errorMonitoring: HealthCheckResult;
    memory: HealthCheckResult;
    disk?: HealthCheckResult;
  };
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

export class HealthCheckService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // Check database connectivity
  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Simple database query to check connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 1000) {
        return {
          status: 'degraded',
          message: 'Database connection is slow',
          responseTime,
          details: { threshold: '1000ms', actual: `${responseTime}ms` }
        };
      }
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        responseTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  // Check email service
  async checkEmail(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const emailStatus = emailService.getStatus();
      const isConnected = await emailService.testConnection();
      
      const responseTime = Date.now() - startTime;
      
      if (!emailStatus.enabled) {
        return {
          status: 'degraded',
          message: 'Email service is disabled',
          responseTime,
          details: emailStatus
        };
      }
      
      if (!emailStatus.configured || !isConnected) {
        return {
          status: 'degraded',
          message: 'Email service is not properly configured',
          responseTime,
          details: {
            enabled: emailStatus.enabled,
            configured: emailStatus.configured,
            host: emailStatus.host,
            fromEmail: emailStatus.fromEmail
          }
        };
      }
      
      return {
        status: 'healthy',
        message: 'Email service is healthy',
        responseTime,
        details: {
          enabled: emailStatus.enabled,
          configured: emailStatus.configured,
          host: emailStatus.host,
          fromEmail: emailStatus.fromEmail
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Email service check failed',
        responseTime: Date.now() - startTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  // Check error monitoring
  checkErrorMonitoring(): HealthCheckResult {
    try {
      const healthStatus = errorMonitoringService.getHealthStatus();
      
      return {
        status: healthStatus.status === 'critical' ? 'unhealthy' : 
                healthStatus.status === 'warning' ? 'degraded' : 'healthy',
        message: healthStatus.message,
        details: healthStatus.details
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Error monitoring check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  // Check memory usage
  checkMemory(): HealthCheckResult {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      const details = {
        heapUsed: `${Math.round(usedMemory / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(totalMemory / 1024 / 1024)}MB`,
        usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`
      };
      
      if (memoryUsagePercent > 90) {
        return {
          status: 'unhealthy',
          message: 'Memory usage is critically high',
          details
        };
      }
      
      if (memoryUsagePercent > 75) {
        return {
          status: 'degraded',
          message: 'Memory usage is high',
          details
        };
      }
      
      return {
        status: 'healthy',
        message: 'Memory usage is normal',
        details
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Memory check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  // Comprehensive system health check
  async performHealthCheck(): Promise<SystemHealthCheck> {
    const startTime = Date.now();
    
    // Run all health checks in parallel
    const [database, email, errorMonitoring, memory] = await Promise.all([
      this.checkDatabase(),
      this.checkEmail(),
      Promise.resolve(this.checkErrorMonitoring()),
      Promise.resolve(this.checkMemory())
    ]);
    
    const checks = {
      database,
      email,
      errorMonitoring,
      memory
    };
    
    // Calculate summary
    const checkResults = Object.values(checks);
    const summary = {
      total: checkResults.length,
      healthy: checkResults.filter(check => check.status === 'healthy').length,
      degraded: checkResults.filter(check => check.status === 'degraded').length,
      unhealthy: checkResults.filter(check => check.status === 'unhealthy').length
    };
    
    // Determine overall system status
    let overallStatus: HealthStatus = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0', // Could be read from package.json
      environment: config.NODE_ENV,
      checks,
      summary
    };
  }

  // Quick health check (for load balancers)
  async quickHealthCheck(): Promise<{ status: HealthStatus; timestamp: string }> {
    try {
      // Just check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get system information
  getSystemInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      pid: process.pid,
      memory: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
  }

  // Cleanup resources
  async cleanup(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();