import i18next from 'i18next';

// Base application error class
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: any;
  public readonly timestamp: string;
  public readonly messageKey: string;
  public readonly messageParams?: Record<string, any>;

  constructor(
    messageOrKey: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    details?: any,
    messageParams?: Record<string, any>
  ) {
    // If the message looks like a translation key (contains dots), store it as messageKey
    const isTranslationKey = messageOrKey.includes('.');
    const message = isTranslationKey ? i18next.t(messageOrKey, messageParams) : messageOrKey;
    
    super(message);
    
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.messageKey = isTranslationKey ? messageOrKey : '';
    this.messageParams = messageParams;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  // Get localized message
  getLocalizedMessage(language?: string): string {
    if (!this.messageKey) return this.message;
    
    const currentLanguage = language || i18next.language;
    return i18next.t(this.messageKey, { 
      ...this.messageParams,
      lng: currentLanguage 
    });
  }

  // Convert error to JSON for API responses
  toJSON(language?: string) {
    return {
      name: this.name,
      message: this.getLocalizedMessage(language),
      code: this.code,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      ...(this.messageKey && { messageKey: this.messageKey }),
      ...(this.details && { details: this.details }),
      ...(process.env.NODE_ENV !== 'production' && { stack: this.stack }),
    };
  }

  // Create error response object
  toResponse(language?: string) {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.getLocalizedMessage(language),
        ...(this.messageKey && { messageKey: this.messageKey }),
        ...(this.details && { details: this.details }),
      },
      timestamp: this.timestamp,
    };
  }
}

// Authentication and authorization errors
export class AuthenticationError extends AppError {
  constructor(message: string = 'errors.auth.authenticationRequired', details?: any, params?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, details, params);
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'errors.auth.accessDenied', details?: any, params?: Record<string, any>) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, details, params);
  }
}

export class TokenExpiredError extends AppError {
  constructor(message: string = 'errors.auth.tokenExpired', details?: any, params?: Record<string, any>) {
    super(message, 401, 'TOKEN_EXPIRED', true, details, params);
  }
}

export class InvalidTokenError extends AppError {
  constructor(message: string = 'errors.auth.invalidToken', details?: any, params?: Record<string, any>) {
    super(message, 401, 'INVALID_TOKEN', true, details, params);
  }
}

// Validation errors
export class ValidationError extends AppError {
  constructor(message: string = 'errors.validation.failed', details?: any, params?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', true, details, params);
  }
}

export class InvalidInputError extends AppError {
  constructor(message: string = 'errors.validation.invalidInput', details?: any, params?: Record<string, any>) {
    super(message, 400, 'INVALID_INPUT', true, details, params);
  }
}

// Resource errors
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: any) {
    super('errors.resource.notFound', 404, 'NOT_FOUND', true, details, { resource });
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'errors.resource.conflict', details?: any, params?: Record<string, any>) {
    super(message, 409, 'CONFLICT', true, details, params);
  }
}

export class DuplicateResourceError extends AppError {
  constructor(resource: string = 'Resource', field?: string, details?: any) {
    super('errors.resource.duplicate', 409, 'DUPLICATE_RESOURCE', true, details, {
      resource,
      field: field ?? ''
    });
  }
}

// Rate limiting errors
export class RateLimitError extends AppError {
  constructor(message: string = 'errors.rateLimit.tooManyRequests', details?: any, params?: Record<string, any>) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, details, params);
  }
}

// Database errors
export class DatabaseError extends AppError {
  constructor(message: string = 'errors.database.operationFailed', details?: any, params?: Record<string, any>) {
    super(message, 500, 'DATABASE_ERROR', true, details, params);
  }
}

export class ConnectionError extends AppError {
  constructor(message: string = 'errors.database.connectionFailed', details?: any, params?: Record<string, any>) {
    super(message, 503, 'CONNECTION_ERROR', true, details, params);
  }
}

// External service errors
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string = 'errors.external.serviceFailed', details?: any) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR', true, details, { service });
  }
}

export class EmailServiceError extends AppError {
  constructor(message: string = 'errors.email.serviceFailed', details?: any, params?: Record<string, any>) {
    super(message, 502, 'EMAIL_SERVICE_ERROR', true, details, params);
  }
}

// Business logic errors
export class BusinessLogicError extends AppError {
  constructor(messageKey: string, details?: any, params?: Record<string, any>) {
    super(messageKey, 400, 'BUSINESS_LOGIC_ERROR', true, details, params);
  }
}

export class InsufficientPermissionsError extends AppError {
  constructor(action: string = 'perform this action', details?: any) {
    super('errors.auth.insufficientPermissions', 403, 'INSUFFICIENT_PERMISSIONS', true, details, { action });
  }
}

// System errors
export class SystemError extends AppError {
  constructor(message: string = 'errors.system.error', details?: any, params?: Record<string, any>) {
    super(message, 500, 'SYSTEM_ERROR', false, details, params);
  }
}

export class ConfigurationError extends AppError {
  constructor(message: string = 'errors.system.configuration', details?: any, params?: Record<string, any>) {
    super(message, 500, 'CONFIGURATION_ERROR', false, details, params);
  }
}

// Request errors
export class BadRequestError extends AppError {
  constructor(message: string = 'errors.request.badRequest', details?: any, params?: Record<string, any>) {
    super(message, 400, 'BAD_REQUEST', true, details, params);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message: string = 'errors.request.payloadTooLarge', details?: any, params?: Record<string, any>) {
    super(message, 413, 'PAYLOAD_TOO_LARGE', true, details, params);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message: string = 'errors.request.unsupportedMediaType', details?: any, params?: Record<string, any>) {
    super(message, 415, 'UNSUPPORTED_MEDIA_TYPE', true, details, params);
  }
}

// Timeout errors
export class TimeoutError extends AppError {
  constructor(operation: string = 'Operation', details?: any) {
    super('errors.system.timeout', 408, 'TIMEOUT_ERROR', true, details, { operation });
  }
}

// Maintenance errors
export class MaintenanceError extends AppError {
  constructor(message: string = 'errors.system.maintenance', details?: any, params?: Record<string, any>) {
    super(message, 503, 'MAINTENANCE_MODE', true, details, params);
  }
}

// Feature errors
export class FeatureDisabledError extends AppError {
  constructor(feature: string, details?: any) {
    super('errors.feature.disabled', 404, 'FEATURE_DISABLED', true, details, { feature });
  }
}