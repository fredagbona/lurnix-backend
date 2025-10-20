import { Request, Response, NextFunction } from 'express';
import type { I18nRequest } from '../config/i18n/types.js';
import { AuthServiceError, PasswordResetError } from '../services/auth';

// Extended request type that includes both i18n and auth properties
interface LocalizedAuthRequest extends I18nRequest {
  userId?: string;
}
import { UserNotFoundError, UserRepositoryError } from '../domains/auth/repositories/userRepository.js';
import { ValidationError } from './validation.js';
import { AppError } from '../errors/AppError.js';
import { normalizeError } from '../errors/errorUtils.js';
import { logError, sanitizeErrorForClient, ErrorContext } from '../errors/errorUtils.js';
import { errorMonitoringService } from '../services/infrastructure';

// Global error handler middleware
export function errorHandler(
  error: any,
  req: LocalizedAuthRequest,
  res: Response,
  next: NextFunction
): void {
  // Get user's preferred language
  const language = req.language || 'en';

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
    language, // Add language to error context
  };
  
  // Log the error with context
  logError(normalizedError, context);
  
  // Record error for monitoring
  errorMonitoringService.recordError(normalizedError, context);
  
    // Handle legacy error types with localization
  if (error instanceof AuthServiceError) {
    const appError = new AppError('errors.auth.generic', error.statusCode, 'AUTH_ERROR');
    res.status(appError.statusCode).json(appError.toResponse(language));
    return;
  }
  
  if (error instanceof PasswordResetError) {
    const appError = new AppError('errors.auth.passwordReset', error.statusCode, 'PASSWORD_RESET_ERROR');
    res.status(appError.statusCode).json(appError.toResponse(language));
    return;
  }
  
  if (error instanceof UserRepositoryError) {
    const appError = new AppError('errors.database.operationFailed', 500, 'DATABASE_ERROR');
    res.status(appError.statusCode).json(appError.toResponse(language));
    return;
  }
  
  if (error instanceof ValidationError) {
    const appError = new AppError('errors.validation.failed', error.statusCode, 'VALIDATION_ERROR', true, error.errors);
    res.status(appError.statusCode).json(appError.toResponse(language));
    return;
  }
  // Send localized error response
  const response = normalizedError.toResponse(language);
  res.status(normalizedError.statusCode).json(response);
}

// 404 handler middleware
export function notFoundHandler(req: Request, res: Response): void {
  const language = (req as LocalizedAuthRequest).language || 'en';
  const error = new AppError('errors.route.notFound', 404, 'NOT_FOUND', true, null, {
    method: req.method,
    path: req.path
  });
  res.status(404).json(error.toResponse(language));
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
  const language = (req as LocalizedAuthRequest).language || 'en';
  const error = new AppError('errors.rateLimit.tooManyRequests', 429, 'RATE_LIMIT_EXCEEDED');
  res.status(429).json(error.toResponse(language));
}

// CORS error handler
export function handleCORSError(req: Request, res: Response): void {
  const language = (req as LocalizedAuthRequest).language || 'en';
  const error = new AppError('errors.security.corsBlocked', 403, 'CORS_ERROR');
  res.status(403).json(error.toResponse(language));
}