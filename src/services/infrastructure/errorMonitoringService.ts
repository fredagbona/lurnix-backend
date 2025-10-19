import { AppError } from '../../errors/AppError.js';
import { ErrorSeverity, getErrorSeverity, ErrorContext } from '../../errors/errorUtils.js';

// Error statistics
interface ErrorStats {
  total: number;
  byCode: Record<string, number>;
  bySeverity: Record<ErrorSeverity, number>;
  byStatusCode: Record<number, number>;
  recentErrors: Array<{
    error: AppError;
    context?: ErrorContext;
    timestamp: string;
  }>;
}

// Error monitoring configuration
interface MonitoringConfig {
  maxRecentErrors: number;
  alertThresholds: {
    criticalErrorsPerHour: number;
    highErrorsPerHour: number;
    totalErrorsPerHour: number;
  };
  enableAlerts: boolean;
}

export class ErrorMonitoringService {
  private stats: ErrorStats = {
    total: 0,
    byCode: {},
    bySeverity: {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    },
    byStatusCode: {},
    recentErrors: [],
  };

  private config: MonitoringConfig = {
    maxRecentErrors: 100,
    alertThresholds: {
      criticalErrorsPerHour: 5,
      highErrorsPerHour: 20,
      totalErrorsPerHour: 100,
    },
    enableAlerts: process.env.NODE_ENV === 'production',
  };

  private hourlyStats: Array<{
    hour: string;
    errors: number;
    critical: number;
    high: number;
  }> = [];

  // Record an error occurrence
  recordError(error: AppError, context?: ErrorContext): void {
    const severity = getErrorSeverity(error);
    
    // Update statistics
    this.stats.total++;
    this.stats.byCode[error.code] = (this.stats.byCode[error.code] || 0) + 1;
    this.stats.bySeverity[severity]++;
    this.stats.byStatusCode[error.statusCode] = (this.stats.byStatusCode[error.statusCode] || 0) + 1;
    
    // Add to recent errors (with size limit)
    this.stats.recentErrors.unshift({
      error,
      context,
      timestamp: new Date().toISOString(),
    });
    
    if (this.stats.recentErrors.length > this.config.maxRecentErrors) {
      this.stats.recentErrors = this.stats.recentErrors.slice(0, this.config.maxRecentErrors);
    }
    
    // Update hourly stats
    this.updateHourlyStats(severity);
    
    // Check for alerts
    if (this.config.enableAlerts) {
      this.checkAlertThresholds();
    }
  }

  // Get current error statistics
  getStats(): ErrorStats {
    return { ...this.stats };
  }

  // Get error statistics for a specific time period
  getStatsForPeriod(hours: number = 24): {
    totalErrors: number;
    criticalErrors: number;
    highErrors: number;
    errorRate: number; // errors per hour
  } {
    const now = new Date();
    const cutoff = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    
    const recentErrors = this.stats.recentErrors.filter(
      entry => new Date(entry.timestamp) > cutoff
    );
    
    const criticalErrors = recentErrors.filter(
      entry => getErrorSeverity(entry.error) === ErrorSeverity.CRITICAL
    ).length;
    
    const highErrors = recentErrors.filter(
      entry => getErrorSeverity(entry.error) === ErrorSeverity.HIGH
    ).length;
    
    return {
      totalErrors: recentErrors.length,
      criticalErrors,
      highErrors,
      errorRate: recentErrors.length / hours,
    };
  }

  // Get most common errors
  getMostCommonErrors(limit: number = 10): Array<{
    code: string;
    count: number;
    percentage: number;
  }> {
    const entries = Object.entries(this.stats.byCode)
      .map(([code, count]) => ({
        code,
        count,
        percentage: (count / this.stats.total) * 100,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return entries;
  }

  // Get error trends
  getErrorTrends(): Array<{
    hour: string;
    errors: number;
    critical: number;
    high: number;
  }> {
    return [...this.hourlyStats].reverse().slice(0, 24); // Last 24 hours
  }

  // Reset statistics
  resetStats(): void {
    this.stats = {
      total: 0,
      byCode: {},
      bySeverity: {
        [ErrorSeverity.LOW]: 0,
        [ErrorSeverity.MEDIUM]: 0,
        [ErrorSeverity.HIGH]: 0,
        [ErrorSeverity.CRITICAL]: 0,
      },
      byStatusCode: {},
      recentErrors: [],
    };
    this.hourlyStats = [];
  }

  // Update configuration
  updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Get health status based on error rates
  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    message: string;
    details: any;
  } {
    const hourlyStats = this.getStatsForPeriod(1);
    
    if (hourlyStats.criticalErrors >= this.config.alertThresholds.criticalErrorsPerHour) {
      return {
        status: 'critical',
        message: 'High number of critical errors detected',
        details: hourlyStats,
      };
    }
    
    if (hourlyStats.totalErrors >= this.config.alertThresholds.totalErrorsPerHour) {
      return {
        status: 'warning',
        message: 'High error rate detected',
        details: hourlyStats,
      };
    }
    
    return {
      status: 'healthy',
      message: 'Error rates are within normal limits',
      details: hourlyStats,
    };
  }

  // Private methods
  private updateHourlyStats(severity: ErrorSeverity): void {
    const currentHour = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH
    
    let hourlyEntry = this.hourlyStats.find(entry => entry.hour === currentHour);
    
    if (!hourlyEntry) {
      hourlyEntry = {
        hour: currentHour,
        errors: 0,
        critical: 0,
        high: 0,
      };
      this.hourlyStats.push(hourlyEntry);
      
      // Keep only last 48 hours
      if (this.hourlyStats.length > 48) {
        this.hourlyStats = this.hourlyStats.slice(-48);
      }
    }
    
    hourlyEntry.errors++;
    if (severity === ErrorSeverity.CRITICAL) {
      hourlyEntry.critical++;
    } else if (severity === ErrorSeverity.HIGH) {
      hourlyEntry.high++;
    }
  }

  private checkAlertThresholds(): void {
    const hourlyStats = this.getStatsForPeriod(1);
    
    if (hourlyStats.criticalErrors >= this.config.alertThresholds.criticalErrorsPerHour) {
      this.sendAlert('CRITICAL_ERROR_THRESHOLD', {
        message: `Critical error threshold exceeded: ${hourlyStats.criticalErrors} critical errors in the last hour`,
        stats: hourlyStats,
      });
    }
    
    if (hourlyStats.totalErrors >= this.config.alertThresholds.totalErrorsPerHour) {
      this.sendAlert('HIGH_ERROR_RATE', {
        message: `High error rate detected: ${hourlyStats.totalErrors} errors in the last hour`,
        stats: hourlyStats,
      });
    }
  }

  private sendAlert(type: string, data: any): void {
    // In a production system, this would send alerts to external services
    // like Slack, PagerDuty, email, etc.
    console.error(`🚨 ALERT [${type}]:`, JSON.stringify(data, null, 2));
    
    // TODO: Implement actual alerting mechanisms
    // - Send to Slack webhook
    // - Send to PagerDuty
    // - Send email notifications
    // - Log to external monitoring service
  }
}

// Export singleton instance
export const errorMonitoringService = new ErrorMonitoringService();