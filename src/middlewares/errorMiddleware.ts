import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware.js';
import { AuthServiceError } from '../services/authService.js';
import { PasswordResetError } from '../services/passwordResetService.js';
import { UserRepositoryError } from '../repositories/userRepository.js';
import { ValidationError } from './validation.js';
import { AppError } from '../errors/AppError.js';
import { normalizeError } from '../errors/errorUtils.js';
import { logError, sanitizeErrorForClient, ErrorContext } from '../errors/errorUtils.js';
import { errorMonitoringService } from '../services/errorMonitoringService.js';

// Global error handler middleware
export function errorHandler(
  error: any,
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  // Normalize the error to AppError
  const normalizedError = normalizeError(error);
  
  // Create error context
  const context: ErrorContext = {
    userId: req.userId,
    requestId: req.headers['x-request-id'] as string,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    method: req.method,
    url: req.url,
    body: req.body,
    query: req.query,
    params: req.params,
    headers: {
      authorization: req.headers.authorization ? '[REDACTED]' : undefined,
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
    },
    timestamp: new Date().toISOString(),
  };
  
  // Log the error with context
  logError(normalizedError, context);
  
  // Record error for monitoring
  errorMonitoringService.recordError(normalizedError, context);
  
  // Handle legacy error types for backward compatibility
  if (error instanceof AuthServiceError) {
    const appError = new AppError(error.message, error.statusCode, 'AUTH_ERROR');
    const response = sanitizeErrorForClient(appError);
    res.status(appError.statusCode).json(response);
    return;
  }
  
  if (error instanceof PasswordResetError) {
    const appError = new AppError(error.message, error.statusCode, 'PASSWORD_RESET_ERROR');
    const response = sanitizeErrorForClient(appError);
    res.status(appError.statusCode).json(response);
    return;
  }
  
  if (error instanceof UserRepositoryError) {
    const appError = new AppError('Database operation failed', 500, 'DATABASE_ERROR');
    const response = sanitizeErrorForClient(appError);
    res.status(appError.statusCode).json(response);
    return;
  }
  
  if (error instanceof ValidationError) {
    const appError = new AppError(error.message, error.statusCode, 'VALIDATION_ERROR', true, error.errors);
    const response = sanitizeErrorForClient(appError);
    res.status(appError.statusCode).json(response);
    return;
  }
  
  // Send sanitized error response
  const response = sanitizeErrorForClient(normalizedError);
  res.status(normalizedError.statusCode).json(response);
}

// 404 handler middleware
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
    timestamp: new Date().toISOString(),
  });
}

// Async error wrapper
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Validation error formatter
export function formatValidationError(errors: any[]): any {
  return errors.reduce((acc, error) => {
    const field = error.path?.join('.') || error.field;
    if (!acc[field]) {
      acc[field] = [];
    }
    acc[field].push(error.message);
    return acc;
  }, {});
}

// Database error handler
export function handleDatabaseError(error: any): AppError {
  let customError: AppError;

  // Handle Prisma errors
  if (error.code === 'P2002') {
    customError = new AppError('Resource already exists', 409, 'DUPLICATE_RESOURCE');
  } else if (error.code === 'P2025') {
    customError = new AppError('Resource not found', 404, 'RESOURCE_NOT_FOUND');
  } else if (error.code === 'P2003') {
    customError = new AppError('Foreign key constraint failed', 400, 'CONSTRAINT_FAILED');
  } else {
    customError = new AppError('Database operation failed', 500, 'DATABASE_ERROR');
  }

  return customError;
}

// Rate limit error handler
export function handleRateLimitError(req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
    timestamp: new Date().toISOString(),
  });
}

// CORS error handler
export function handleCORSError(req: Request, res: Response): void {
  res.status(403).json({
    success: false,
    error: {
      code: 'CORS_ERROR',
      message: 'Cross-origin request blocked',
    },
    timestamp: new Date().toISOString(),
  });
}