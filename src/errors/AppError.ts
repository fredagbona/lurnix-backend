// Base application error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any
  ) {
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Convert error to JSON for API responses
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      ...(this.details && { details: this.details }),
      ...(process.env.NODE_ENV !== 'production' && { stack: this.stack }),
    };
  }

  // Create error response object
  toResponse() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(this.details && { details: this.details }),
      },
      timestamp: this.timestamp,
    };
  }
}

// Authentication and authorization errors
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', details?: any) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, details);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', details?: any) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, details);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = 'Token has expired', details?: any) {
    super(message, 401, 'TOKEN_EXPIRED', true, details);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message: string = 'Invalid token', details?: any) {
    super(message, 401, 'INVALID_TOKEN', true, details);
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(message: string = 'Validation failed', details?: any) {
    super(message, 400, 'VALIDATION_ERROR', true, details);
  }
}

export class InvalidInputError extends AppError {
  constructor(message: string = 'Invalid input provided', details?: any) {
    super(message, 400, 'INVALID_INPUT', true, details);
  }
}

// Resource errors
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: any) {
    super(`${resource} not found`, 404, 'NOT_FOUND', true, details);
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Resource conflict', details?: any) {
    super(message, 409, 'CONFLICT', true, details);
  }
}

export class DuplicateResourceError extends AppError {
  constructor(resource: string = 'Resource', field?: string, details?: any) {
    const message = field 
      ? `${resource} with this ${field} already exists`
      : `${resource} already exists`;
    super(message, 409, 'DUPLICATE_RESOURCE', true, details);
  }
}

// Rate limiting errors
export class RateLimitError extends AppError {
  constructor(message: string = 'Too many requests', details?: any) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, details);
  }
}

// Database errors
export class DatabaseError extends AppError {
  constructor(message: string = 'Database operation failed', details?: any) {
    super(message, 500, 'DATABASE_ERROR', true, details);
  }
}

export class ConnectionError extends AppError {
  constructor(message: string = 'Database connection failed', details?: any) {
    super(message, 503, 'CONNECTION_ERROR', true, details);
  }
}

// External service errors
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'External service error', details?: any) {
    super(`${service}: ${message}`, 502, 'EXTERNAL_SERVICE_ERROR', true, details);
  }
}

export class EmailServiceError extends AppError {
  constructor(message: string = 'Email service error', details?: any) {
    super(message, 502, 'EMAIL_SERVICE_ERROR', true, details);
  }
}

// Business logic errors
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'BUSINESS_LOGIC_ERROR', true, details);
  }
}

export class InsufficientPermissionsError extends AppError {
  constructor(action: string = 'perform this action', details?: any) {
    super(`Insufficient permissions to ${action}`, 403, 'INSUFFICIENT_PERMISSIONS', true, details);
  }
}

// System errors
export class SystemError extends AppError {
  constructor(message: string = 'System error occurred', details?: any) {
    super(message, 500, 'SYSTEM_ERROR', false, details);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string = 'Configuration error', details?: any) {
    super(message, 500, 'CONFIGURATION_ERROR', false, details);
  }
}

// Request errors
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', details?: any) {
    super(message, 400, 'BAD_REQUEST', true, details);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string = 'Request payload too large', details?: any) {
    super(message, 413, 'PAYLOAD_TOO_LARGE', true, details);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message: string = 'Unsupported media type', details?: any) {
    super(message, 415, 'UNSUPPORTED_MEDIA_TYPE', true, details);
  }
}

// Timeout errors
export class TimeoutError extends AppError {
  constructor(operation: string = 'Operation', details?: any) {
    super(`${operation} timed out`, 408, 'TIMEOUT_ERROR', true, details);
  }
}

// Maintenance errors
export class MaintenanceError extends AppError {
  constructor(message: string = 'Service is under maintenance', details?: any) {
    super(message, 503, 'MAINTENANCE_MODE', true, details);
  }
}

// Feature errors
export class FeatureDisabledError extends AppError {
  constructor(feature: string, details?: any) {
    super(`Feature '${feature}' is currently disabled`, 404, 'FEATURE_DISABLED', true, details);
  }
}