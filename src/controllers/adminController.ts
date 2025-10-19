import { Request, Response } from 'express';
import { userRepository } from '../repositories/userRepository.js';
import { passwordResetService } from '../services/passwordResetService.js';
import { scheduledTasksService, errorMonitoringService } from '../services/infrastructure';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';
import { prisma } from '../prisma/client.js';
import { I18nRequest } from '../config/i18n/types.js';
import { sendTranslatedResponse } from '../utils/translationUtils.js';
import { AppError } from '../errors/AppError.js';

export class AdminController {
  // Simple test endpoint
  testEndpoint = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    try {
      sendTranslatedResponse(res, 'admin.system.testSuccess', {
        statusCode: 200
      });
    } catch (error) {
      console.error('Error in test endpoint:', error);
      throw new AppError('admin.system.testError', 500, 
        error instanceof Error ? error.message : String(error)
      );
    }
  });
  
  // Get user statistics
  getUserStats = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    try {
      const activeUserCount = await userRepository.getActiveUserCount();
      
      sendTranslatedResponse(res, 'admin.users.stats.retrieved', {
        statusCode: 200,
        data: {
          stats: {
            activeUsers: activeUserCount,
            timestamp: new Date().toISOString(),
          }
        }
      });
    } catch (error) {
      throw error;
    }
  });

  // Get all users (with pagination)
  getAllUsers = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const skip = (page - 1) * limit;
      
      console.log(`[DEBUG] Admin getAllUsers - Starting with page: ${page}, limit: ${limit}, skip: ${skip}`);
      
      // Use direct Prisma query with explicit field selection
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: {
          id: true,
          username: true,
          fullname: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
      
      console.log(`[DEBUG] Admin getAllUsers - Found ${users.length} users`);
      
      // Get total count
      const totalUsers = await prisma.user.count({
        where: { isActive: true },
      });
      
      console.log(`[DEBUG] Admin getAllUsers - Total users count: ${totalUsers}`);
      
      const totalPages = Math.ceil(totalUsers / limit);
      
      sendTranslatedResponse(res, 'admin.users.list.retrieved', {
        statusCode: 200,
        data: {
          users,
          pagination: {
            currentPage: page,
            totalPages,
            totalUsers,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          }
        }
      });
    } catch (error) {
      console.error('[ERROR] Admin getAllUsers - Caught error:', error);
      if (error instanceof Error) {
        console.error('[ERROR] Admin getAllUsers - Error message:', error.message);
        console.error('[ERROR] Admin getAllUsers - Error stack:', error.stack);
      }
      
      throw new AppError('admin.errors.internal', 500, 
        error instanceof Error ? error.message : String(error)
      );
    }
  });

  // Get user by ID
  getUserById = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      const user = await userRepository.findById(userId);
      
      if (!user) {
        throw new AppError('admin.users.notFound', 404);
      }

      sendTranslatedResponse(res, 'admin.users.detail.retrieved', {
        statusCode: 200,
        data: {
          user: {
            id: user.id,
            username: user.username,
            fullname: user.fullname,
            email: user.email,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
            deletedAt: user.deletedAt,
          }
        }
      });
    } catch (error) {
      throw error;
    }
  });

  // Restore soft-deleted user
  restoreUser = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      const restoredUser = await userRepository.restore(userId);
      
      sendTranslatedResponse(res, 'admin.users.restored', {
        statusCode: 200,
        data: {
          user: {
            id: restoredUser.id,
            username: restoredUser.username,
            fullname: restoredUser.fullname,
            email: restoredUser.email,
            isActive: restoredUser.isActive,
            createdAt: restoredUser.createdAt,
            updatedAt: restoredUser.updatedAt,
          }
        }
      });
    } catch (error) {
      throw error;
    }
  });

  // Hard delete user (permanent)
  hardDeleteUser = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      await userRepository.hardDelete(userId);
      
      sendTranslatedResponse(res, 'admin.users.deleted', {
        statusCode: 200
      });
    } catch (error) {
      throw error;
    }
  });

  // Get password reset token info for user
  getResetTokenInfo = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      const tokenInfo = await passwordResetService.getResetTokenInfo(userId);
      
      sendTranslatedResponse(res, 'admin.users.reset.tokenInfo', {
        statusCode: 200,
        data: {
          tokenInfo
        }
      });
    } catch (error) {
      throw error;
    }
  });

  // Cancel password reset for user
  cancelPasswordReset = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      await passwordResetService.cancelPasswordReset(userId);
      
      sendTranslatedResponse(res, 'admin.users.resetCancelled', {
        statusCode: 200
      });
    } catch (error) {
      throw error;
    }
  });

    // Run cleanup tasks manually
  runCleanupTasks = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    try {
      await scheduledTasksService.runCleanupTasks();
      
      sendTranslatedResponse(res, 'admin.system.cleanupSuccess', {
        statusCode: 200
      });
    } catch (error) {
      throw error;
    }
  });

  // Clean up expired tokens
  cleanupExpiredTokens = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    try {
      const cleanedCount = await passwordResetService.cleanupExpiredTokens();
      
      sendTranslatedResponse(res, 'admin.system.tokensCleanedUp', {
        statusCode: 200,
        data: {
          cleanedCount
        }
      });
    } catch (error) {
      throw error;
    }
  });

  // System health check
  healthCheck = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    try {
      // Basic health checks
      const activeUserCount = await userRepository.getActiveUserCount();
      const errorHealth = errorMonitoringService.getHealthStatus();
      
      const overallStatus = errorHealth.status === 'critical' ? 'unhealthy' : 'healthy';
      const statusCode = overallStatus === 'healthy' ? 200 : 503;
      
      sendTranslatedResponse(res, `admin.health.status.${overallStatus}`, {
        statusCode,
        data: {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          checks: {
            database: 'connected',
            activeUsers: activeUserCount,
            errorMonitoring: errorHealth,
          }
        }
      });
    } catch (error) {
      throw new AppError('admin.health.checkFailed', 503);
    }
  });

  // Get error statistics
  getErrorStats = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    try {
      const stats = errorMonitoringService.getStats();
      const trends = errorMonitoringService.getErrorTrends();
      const commonErrors = errorMonitoringService.getMostCommonErrors();
      const periodStats = errorMonitoringService.getStatsForPeriod(24);
      
      sendTranslatedResponse(res, 'admin.health.errorStats.retrieved', {
        statusCode: 200,
        data: {
          overview: stats,
          trends,
          commonErrors,
          last24Hours: periodStats
        }
      });
    } catch (error) {
      throw error;
    }
  });

  // Reset error statistics
  resetErrorStats = asyncHandler(async (req: Request & I18nRequest, res: Response): Promise<void> => {
    try {
      errorMonitoringService.resetStats();
      
      sendTranslatedResponse(res, 'admin.health.errorStats.reset', {
        statusCode: 200
      });
    } catch (error) {
      throw error;
    }
  });
}

// Export singleton instance
export const adminController = new AdminController();