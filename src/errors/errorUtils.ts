import { AppError } from './AppError.js';

// Error classification
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Get error severity based on status code and type
export function getErrorSeverity(error: Error): ErrorSeverity {
  if (error instanceof AppError) {
    const { statusCode, isOperational } = error;
    
    // Non-operational errors are always critical
    if (!isOperational) {
      return ErrorSeverity.CRITICAL;
    }
    
    // Classify by status code
    if (statusCode >= 500) {
      return ErrorSeverity.HIGH;
    } else if (statusCode >= 400) {
      return ErrorSeverity.MEDIUM;
    } else {
      return ErrorSeverity.LOW;
    }
  }
  
  // Unknown errors are critical
  return ErrorSeverity.CRITICAL;
}

// Error context information
export interface ErrorContext {
  userId?: string;
  requestId?: string;
  userAgent?: string;
  ip?: string;
  method?: string;
  url?: string;
  body?: any;
  query?: any;
  params?: any;
  headers?: any;
  timestamp: string;
}

// Enhanced error logging
export function logError(error: Error, context?: ErrorContext): void {
  const severity = getErrorSeverity(error);
  const isOperational = isOperationalError(error);
  
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error instanceof AppError && {
        code: error.code,
        statusCode: error.statusCode,
        details: error.details,
      }),
    },
    severity,
    isOperational,
    context,
    timestamp: new Date().toISOString(),
  };
  
  // Log based on severity
  switch (severity) {
    case ErrorSeverity.CRITICAL:
      console.error('🚨 CRITICAL ERROR:', JSON.stringify(logData, null, 2));
      break;
    case ErrorSeverity.HIGH:
      console.error('❌ HIGH SEVERITY ERROR:', JSON.stringify(logData, null, 2));
      break;
    case ErrorSeverity.MEDIUM:
      console.warn('⚠️  MEDIUM SEVERITY ERROR:', JSON.stringify(logData, null, 2));
      break;
    case ErrorSeverity.LOW:
      console.info('ℹ️  LOW SEVERITY ERROR:', JSON.stringify(logData, null, 2));
      break;
  }
  
  // In production, you might want to send critical errors to external monitoring
  if (severity === ErrorSeverity.CRITICAL && process.env.NODE_ENV === 'production') {
    // TODO: Send to external monitoring service (e.g., Sentry, DataDog)
    console.error('CRITICAL ERROR - Consider sending to external monitoring service');
  }
}

// Error sanitization for client responses
export function sanitizeErrorForClient(error: Error): any {
  if (error instanceof AppError) {
    return error.toResponse();
  }
  
  // For unknown errors, don't expose internal details in production
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
      },
      timestamp: new Date().toISOString(),
    };
  }
  
  // In development, show more details
  return {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: error.message,
      name: error.name,
      stack: error.stack,
    },
    timestamp: new Date().toISOString(),
  };
}

// Convert common errors to AppError instances
export function normalizeError(error: any): AppError {
  if (error instanceof AppError) {
    return error;
  }
  
  // Handle Prisma errors
  if (error.code) {
    switch (error.code) {
      case 'P2002':
        return new AppError(
          'Resource already exists',
          409,
          'DUPLICATE_RESOURCE',
          true,
          { prismaCode: error.code, meta: error.meta }
        );
      case 'P2025':
        return new AppError(
          'Resource not found',
          404,
          'NOT_FOUND',
          true,
          { prismaCode: error.code, meta: error.meta }
        );
      case 'P2003':
        return new AppError(
          'Foreign key constraint failed',
          400,
          'CONSTRAINT_VIOLATION',
          true,
          { prismaCode: error.code, meta: error.meta }
        );
      default:
        return new AppError(
          'Database operation failed',
          500,
          'DATABASE_ERROR',
          true,
          { prismaCode: error.code, meta: error.meta }
        );
    }
  }
  
  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    return new AppError('Invalid token', 401, 'INVALID_TOKEN');
  }
  
  if (error.name === 'TokenExpiredError') {
    return new AppError('Token has expired', 401, 'TOKEN_EXPIRED');
  }
  
  // Handle validation errors (Zod)
  if (error.name === 'ZodError') {
    return new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      true,
      { validationErrors: error.errors }
    );
  }
  
  // Handle syntax errors
  if (error instanceof SyntaxError) {
    return new AppError(
      'Invalid JSON format',
      400,
      'INVALID_JSON',
      true
    );
  }
  
  // Handle type errors
  if (error instanceof TypeError) {
    return new AppError(
      'Type error occurred',
      500,
      'TYPE_ERROR',
      false,
      { originalMessage: error.message }
    );
  }
  
  // Handle reference errors
  if (error instanceof ReferenceError) {
    return new AppError(
      'Reference error occurred',
      500,
      'REFERENCE_ERROR',
      false,
      { originalMessage: error.message }
    );
  }
  
  // Default case - unknown error
  return new AppError(
    error.message || 'An unknown error occurred',
    500,
    'UNKNOWN_ERROR',
    false,
    { originalError: error.toString() }
  );
}

// Error aggregation for multiple errors
export class ErrorAggregator {
  private errors: AppError[] = [];
  
  add(error: Error | AppError): void {
    const normalizedError = error instanceof AppError ? error : normalizeError(error);
    this.errors.push(normalizedError);
  }
  
  hasErrors(): boolean {
    return this.errors.length > 0;
  }
  
  getErrors(): AppError[] {
    return [...this.errors];
  }
  
  getHighestSeverityError(): AppError | null {
    if (this.errors.length === 0) return null;
    
    return this.errors.reduce((highest, current) => {
      const currentSeverity = getErrorSeverity(current);
      const highestSeverity = getErrorSeverity(highest);
      
      const severityOrder = {
        [ErrorSeverity.CRITICAL]: 4,
        [ErrorSeverity.HIGH]: 3,
        [ErrorSeverity.MEDIUM]: 2,
        [ErrorSeverity.LOW]: 1,
      };
      
      return severityOrder[currentSeverity] > severityOrder[highestSeverity] ? current : highest;
    });
  }
  
  clear(): void {
    this.errors = [];
  }
  
  toResponse(): any {
    if (this.errors.length === 0) {
      return null;
    }
    
    if (this.errors.length === 1) {
      return this.errors[0].toResponse();
    }
    
    // Multiple errors
    return {
      success: false,
      error: {
        code: 'MULTIPLE_ERRORS',
        message: 'Multiple errors occurred',
        details: this.errors.map(error => error.toResponse().error),
      },
      timestamp: new Date().toISOString(),
    };
  }
}

// Error recovery strategies
export interface ErrorRecoveryStrategy {
  canRecover(error: AppError): boolean;
  recover(error: AppError): Promise<any>;
}

export class RetryStrategy implements ErrorRecoveryStrategy {
  constructor(
    private maxRetries: number = 3,
    private delay: number = 1000,
    private backoffMultiplier: number = 2
  ) {}
  
  canRecover(error: AppError): boolean {
    // Only retry for certain types of errors
    return ['CONNECTION_ERROR', 'TIMEOUT_ERROR', 'EXTERNAL_SERVICE_ERROR'].includes(error.code);
  }
  
  async recover(error: AppError): Promise<any> {
    // This would be implemented based on the specific operation being retried
    throw new Error('Retry strategy must be implemented for specific operations');
  }
}