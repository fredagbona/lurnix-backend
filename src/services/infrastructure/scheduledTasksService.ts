import { passwordResetService } from '../passwordResetService.js';

export class ScheduledTasksService {
  private intervals: NodeJS.Timeout[] = [];

  // Start all scheduled tasks
  start(): void {
    console.log('Starting scheduled tasks...');

    // Clean up expired reset tokens every hour
    const tokenCleanupInterval = setInterval(async () => {
      try {
        await passwordResetService.cleanupExpiredTokens();
      } catch (error) {
        console.error('Scheduled token cleanup failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    this.intervals.push(tokenCleanupInterval);

    // Clean up rate limiting records every hour
    const rateLimitCleanupInterval = setInterval(() => {
      try {
        passwordResetService.cleanupRateLimiting();
      } catch (error) {
        console.error('Scheduled rate limit cleanup failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

    this.intervals.push(rateLimitCleanupInterval);

    console.log('Scheduled tasks started successfully');
  }

  // Stop all scheduled tasks
  stop(): void {
    console.log('Stopping scheduled tasks...');
    
    this.intervals.forEach(interval => {
      clearInterval(interval);
    });
    
    this.intervals = [];
    console.log('Scheduled tasks stopped');
  }

  // Manual cleanup trigger (for testing or admin use)
  async runCleanupTasks(): Promise<void> {
    console.log('Running manual cleanup tasks...');
    
    try {
      const cleanedTokens = await passwordResetService.cleanupExpiredTokens();
      passwordResetService.cleanupRateLimiting();
      
      console.log(`Manual cleanup completed. Cleaned ${cleanedTokens} expired tokens.`);
    } catch (error) {
      console.error('Manual cleanup failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const scheduledTasksService = new ScheduledTasksService();