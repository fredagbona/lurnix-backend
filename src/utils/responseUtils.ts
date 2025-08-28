import { Response } from 'express';

// Standard API response format
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Success response helper
export function sendSuccessResponse<T>(
  res: Response,
  data?: T,
  message?: string,
  statusCode: number = 200
): void {
  const response: ApiResponse<T> = {
    success: true,
    ...(message && { message }),
    ...(data && { data }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}

// Error response helper
export function sendErrorResponse(
  res: Response,
  code: string,
  message: string,
  statusCode: number = 400,
  details?: any
): void {
  const response: ApiResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}

// Created response helper
export function sendCreatedResponse<T>(
  res: Response,
  data: T,
  message: string = 'Resource created successfully'
): void {
  sendSuccessResponse(res, data, message, 201);
}

// No content response helper
export function sendNoContentResponse(res: Response): void {
  res.status(204).send();
}

// Unauthorized response helper
export function sendUnauthorizedResponse(
  res: Response,
  message: string = 'Authentication required'
): void {
  sendErrorResponse(res, 'UNAUTHORIZED', message, 401);
}

// Forbidden response helper
export function sendForbiddenResponse(
  res: Response,
  message: string = 'Access denied'
): void {
  sendErrorResponse(res, 'FORBIDDEN', message, 403);
}

// Not found response helper
export function sendNotFoundResponse(
  res: Response,
  message: string = 'Resource not found'
): void {
  sendErrorResponse(res, 'NOT_FOUND', message, 404);
}

// Validation error response helper
export function sendValidationErrorResponse(
  res: Response,
  errors: any,
  message: string = 'Validation failed'
): void {
  sendErrorResponse(res, 'VALIDATION_ERROR', message, 400, errors);
}

// Rate limit response helper
export function sendRateLimitResponse(
  res: Response,
  message: string = 'Too many requests, please try again later'
): void {
  sendErrorResponse(res, 'RATE_LIMIT_EXCEEDED', message, 429);
}

// Internal server error response helper
export function sendInternalServerErrorResponse(
  res: Response,
  message: string = 'Internal server error'
): void {
  sendErrorResponse(res, 'INTERNAL_ERROR', message, 500);
}

// Paginated response helper
export function sendPaginatedResponse<T>(
  res: Response,
  data: T[],
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  },
  message?: string
): void {
  const response: ApiResponse<{
    items: T[];
    pagination: typeof pagination;
  }> = {
    success: true,
    ...(message && { message }),
    data: {
      items: data,
      pagination,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(200).json(response);
}

// Health check response helper
export function sendHealthCheckResponse(
  res: Response,
  status: 'healthy' | 'unhealthy',
  checks: Record<string, any>
): void {
  const statusCode = status === 'healthy' ? 200 : 503;
  
  const response: ApiResponse<{
    status: string;
    checks: Record<string, any>;
  }> = {
    success: status === 'healthy',
    data: {
      status,
      checks,
    },
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}

// Custom response helper for specific use cases
export function sendCustomResponse<T>(
  res: Response,
  statusCode: number,
  success: boolean,
  data?: T,
  message?: string,
  error?: {
    code: string;
    message: string;
    details?: any;
  }
): void {
  const response: ApiResponse<T> = {
    success,
    ...(message && { message }),
    ...(data && { data }),
    ...(error && { error }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}