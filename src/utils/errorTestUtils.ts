import { AppError } from '../errors/AppError.js';

// Error testing utilities for development and testing

export class ErrorTestUtils {
  // Generate test errors for different scenarios
  static generateTestError(type: string): AppError {
    switch (type) {
      case 'validation':
        return new AppError('Test validation error', 400, 'VALIDATION_ERROR', true, {
          field: 'testField',
          value: 'invalidValue',
        });
      
      case 'authentication':
        return new AppError('Test authentication error', 401, 'AUTHENTICATION_ERROR');
      
      case 'authorization':
        return new AppError('Test authorization error', 403, 'AUTHORIZATION_ERROR');
      
      case 'notFound':
        return new AppError('Test resource not found', 404, 'NOT_FOUND');
      
      case 'conflict':
        return new AppError('Test resource conflict', 409, 'CONFLICT');
      
      case 'rateLimit':
        return new AppError('Test rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
      
      case 'database':
        return new AppError('Test database error', 500, 'DATABASE_ERROR', true, {
          query: 'SELECT * FROM test_table',
          error: 'Connection timeout',
        });
      
      case 'external':
        return new AppError('Test external service error', 502, 'EXTERNAL_SERVICE_ERROR');
      
      case 'system':
        return new AppError('Test system error', 500, 'SYSTEM_ERROR', false);
      
      default:
        return new AppError('Test unknown error', 500, 'UNKNOWN_ERROR');
    }
  }

  // Simulate error scenarios for testing
  static async simulateErrorScenario(scenario: string): Promise<never> {
    const error = this.generateTestError(scenario);
    throw error;
  }

  // Generate multiple errors for testing aggregation
  static generateMultipleErrors(count: number = 5): AppError[] {
    const errorTypes = ['validation', 'authentication', 'notFound', 'database', 'system'];
    const errors: AppError[] = [];
    
    for (let i = 0; i < count; i++) {
      const type = errorTypes[i % errorTypes.length];
      errors.push(this.generateTestError(type));
    }
    
    return errors;
  }

  // Test error recovery scenarios
  static async testErrorRecovery(operation: () => Promise<any>, maxRetries: number = 3): Promise<any> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.log(`Attempt ${attempt} failed:`, (error as Error).message);
        
        if (attempt < maxRetries) {
          // Wait before retry (exponential backoff)
          const delay = Math.pow(2, attempt - 1) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError!;
  }

  // Validate error response format
  static validateErrorResponse(response: any): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    if (typeof response !== 'object' || response === null) {
      errors.push('Response must be an object');
      return { isValid: false, errors };
    }
    
    if (response.success !== false) {
      errors.push('Response success must be false for errors');
    }
    
    if (!response.error) {
      errors.push('Response must have an error object');
    } else {
      if (!response.error.code) {
        errors.push('Error must have a code');
      }
      
      if (!response.error.message) {
        errors.push('Error must have a message');
      }
    }
    
    if (!response.timestamp) {
      errors.push('Response must have a timestamp');
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Performance test for error handling
  static async performanceTest(errorCount: number = 1000): Promise<{
    totalTime: number;
    averageTime: number;
    errorsPerSecond: number;
  }> {
    const startTime = Date.now();
    
    for (let i = 0; i < errorCount; i++) {
      try {
        const errorType = ['validation', 'authentication', 'database'][i % 3];
        throw this.generateTestError(errorType);
      } catch (error) {
        // Simulate error handling
        const appError = error as AppError;
        appError.toResponse();
      }
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    
    return {
      totalTime,
      averageTime: totalTime / errorCount,
      errorsPerSecond: (errorCount / totalTime) * 1000,
    };
  }

  // Memory usage test for error handling
  static memoryUsageTest(errorCount: number = 10000): {
    initialMemory: number;
    finalMemory: number;
    memoryIncrease: number;
  } {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const initialMemory = process.memoryUsage().heapUsed;
    const errors: AppError[] = [];
    
    // Generate many errors
    for (let i = 0; i < errorCount; i++) {
      const errorType = ['validation', 'authentication', 'database', 'system'][i % 4];
      errors.push(this.generateTestError(errorType));
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    
    return {
      initialMemory,
      finalMemory,
      memoryIncrease: finalMemory - initialMemory,
    };
  }
}

// Development-only error simulation endpoints
export function createErrorTestRoutes() {
  if (process.env.NODE_ENV === 'production') {
    return null; // Don't create test routes in production
  }
  
  const { Router } = require('express');
  const router = Router();
  
  // Test different error types
  router.get('/test-error/:type', (req: any, res: any, next: any) => {
    const { type } = req.params;
    try {
      throw ErrorTestUtils.generateTestError(type);
    } catch (error) {
      next(error);
    }
  });
  
  // Test error performance
  router.get('/test-performance/:count', async (req: any, res: any) => {
    const count = parseInt(req.params.count, 10) || 1000;
    const results = await ErrorTestUtils.performanceTest(count);
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    });
  });
  
  // Test memory usage
  router.get('/test-memory/:count', (req: any, res: any) => {
    const count = parseInt(req.params.count, 10) || 10000;
    const results = ErrorTestUtils.memoryUsageTest(count);
    res.json({
      success: true,
      data: results,
      timestamp: new Date().toISOString(),
    });
  });
  
  return router;
}