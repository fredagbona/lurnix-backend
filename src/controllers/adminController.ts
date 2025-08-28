import { Request, Response } from 'express';
import { userRepository } from '../repositories/userRepository.js';
import { passwordResetService } from '../services/passwordResetService.js';
import { scheduledTasksService } from '../services/scheduledTasksService.js';
import { errorMonitoringService } from '../services/errorMonitoringService.js';
import { asyncHandler } from '../middlewares/errorMiddleware.js';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export class AdminController {
  // Get user statistics
  getUserStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const activeUserCount = await userRepository.getActiveUserCount();
      
      res.status(200).json({
        success: true,
        data: {
          stats: {
            activeUsers: activeUserCount,
            timestamp: new Date().toISOString(),
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Get all users (with pagination)
  getAllUsers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    try {
      const users = await userRepository.findActiveUsers(skip, limit);
      const totalUsers = await userRepository.getActiveUserCount();
      const totalPages = Math.ceil(totalUsers / limit);
      
      res.status(200).json({
        success: true,
        data: {
          users: users.map(user => ({
            id: user.id,
            username: user.username,
            fullname: user.fullname,
            email: user.email,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          })),
          pagination: {
            currentPage: page,
            totalPages,
            totalUsers,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Get user by ID
  getUserById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      const user = await userRepository.findById(userId);
      
      if (!user) {
        res.status(404).json({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
          timestamp: new Date().toISOString(),
        });
        return;
      }

      res.status(200).json({
        success: true,
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
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Restore soft-deleted user
  restoreUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      const restoredUser = await userRepository.restore(userId);
      
      res.status(200).json({
        success: true,
        message: 'User restored successfully',
        data: {
          user: {
            id: restoredUser.id,
            username: restoredUser.username,
            fullname: restoredUser.fullname,
            email: restoredUser.email,
            isActive: restoredUser.isActive,
            createdAt: restoredUser.createdAt,
            updatedAt: restoredUser.updatedAt,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Hard delete user (permanent)
  hardDeleteUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      await userRepository.hardDelete(userId);
      
      res.status(200).json({
        success: true,
        message: 'User permanently deleted',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Get password reset token info for user
  getResetTokenInfo = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      const tokenInfo = await passwordResetService.getResetTokenInfo(userId);
      
      res.status(200).json({
        success: true,
        data: {
          tokenInfo,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Cancel password reset for user
  cancelPasswordReset = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { userId } = req.params;

    try {
      await passwordResetService.cancelPasswordReset(userId);
      
      res.status(200).json({
        success: true,
        message: 'Password reset cancelled successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Run cleanup tasks manually
  runCleanupTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      await scheduledTasksService.runCleanupTasks();
      
      res.status(200).json({
        success: true,
        message: 'Cleanup tasks completed successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Clean up expired reset tokens
  cleanupExpiredTokens = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const cleanedCount = await passwordResetService.cleanupExpiredTokens();
      
      res.status(200).json({
        success: true,
        message: 'Expired tokens cleaned up successfully',
        data: {
          cleanedCount,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // System health check
  healthCheck = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      // Basic health checks
      const activeUserCount = await userRepository.getActiveUserCount();
      const errorHealth = errorMonitoringService.getHealthStatus();
      
      const overallStatus = errorHealth.status === 'critical' ? 'unhealthy' : 'healthy';
      const statusCode = overallStatus === 'healthy' ? 200 : 503;
      
      res.status(statusCode).json({
        success: overallStatus === 'healthy',
        data: {
          status: overallStatus,
          timestamp: new Date().toISOString(),
          checks: {
            database: 'connected',
            activeUsers: activeUserCount,
            errorMonitoring: errorHealth,
          },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(503).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_FAILED',
          message: 'System health check failed',
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Get error statistics
  getErrorStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const stats = errorMonitoringService.getStats();
      const trends = errorMonitoringService.getErrorTrends();
      const commonErrors = errorMonitoringService.getMostCommonErrors();
      const periodStats = errorMonitoringService.getStatsForPeriod(24);
      
      res.status(200).json({
        success: true,
        data: {
          overview: stats,
          trends,
          commonErrors,
          last24Hours: periodStats,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });

  // Reset error statistics
  resetErrorStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      errorMonitoringService.resetStats();
      
      res.status(200).json({
        success: true,
        message: 'Error statistics reset successfully',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      throw error;
    }
  });
}

// Export singleton instance
export const adminController = new AdminController();