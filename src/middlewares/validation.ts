import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';
import { translateKey } from '../utils/translationUtils.js';

// Custom error class for validation errors
export class ValidationError extends Error {
  public statusCode: number;
  public errors: any;

  constructor(message: string, errors: any) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.errors = errors;
  }
}

// Validation middleware factory
export function validateRequest(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validatedData = schema.parse(req.body);
      
      // Replace request body with validated and sanitized data
      req.body = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const language = (req as any).language || 'en';
        const validationErrors = error.errors.map(err => {
          const field = err.path.join('.') || 'value';
          const messageKey = err.message;
          const { message, resolvedKey } = translateKey(messageKey, {
            language,
          });

          return {
            field,
            message,
            ...(messageKey !== message && messageKey !== resolvedKey ? { messageKey } : {}),
            code: err.code,
          };
        });

        return next(new ValidationError('Invalid input data', validationErrors));
      }

      // Handle unexpected errors
      return next(error);
    }
  };
}

// Sanitization utilities
export class InputSanitizer {
  // Remove potentially dangerous characters
  static sanitizeString(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+=/gi, ''); // Remove event handlers
  }

  // Sanitize email
  static sanitizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  // Sanitize username (allow only alphanumeric, underscore, hyphen)
  static sanitizeUsername(username: string): string {
    return username
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '');
  }

  // Sanitize full name (allow letters, spaces, apostrophes, hyphens)
  static sanitizeFullName(fullname: string): string {
    return fullname
      .trim()
      .replace(/[^a-zA-Z\s'-]/g, '')
      .replace(/\s+/g, ' '); // Replace multiple spaces with single space
  }
}

// Middleware to sanitize common fields
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  // Input sanitization disabled for development
  next();
}

// Rate limiting configuration
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  message?: string;
  skipSuccessfulRequests?: boolean;
}

// Simple in-memory rate limiter (for production, use Redis)
class InMemoryRateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();

  isAllowed(key: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const record = this.requests.get(key);

    if (!record || now > record.resetTime) {
      // First request or window expired
      this.requests.set(key, {
        count: 1,
        resetTime: now + config.windowMs,
      });
      return true;
    }

    if (record.count >= config.maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    for (const [key, record] of this.requests.entries()) {
      if (now > record.resetTime) {
        this.requests.delete(key);
      }
    }
  }
}

const rateLimiter = new InMemoryRateLimiter();

// Rate limiting middleware factory
export function rateLimit(config: RateLimitConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Rate limiting disabled - always allow requests
    next();
  };
}

// Cleanup rate limiter periodically
setInterval(() => {
  rateLimiter.cleanup();
}, 60000); // Clean up every minute

// Validate query parameters
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      const validationErrors = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }));

      return res.status(400).json({
        success: false,
        error: {
          code: 'QUERY_VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: validationErrors,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Preserve validated values alongside the original query object
    (req as any).validatedQuery = result.data;
    next();
  };
}

// Validate URL parameters
export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validatedData = schema.parse(req.params);
      req.params = validatedData;
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const language = (req as any).language || 'en';
        const validationErrors = error.errors.map(err => {
          const field = err.path.join('.') || 'value';
          const messageKey = err.message;
          const { message, resolvedKey } = translateKey(messageKey, { language });

          return {
            field,
            message,
            ...(messageKey !== message && messageKey !== resolvedKey ? { messageKey } : {}),
            code: err.code,
            source: 'params',
          };
        });

        return next(new ValidationError('Invalid URL parameters', validationErrors));
      }

      return next(error);
    }
  };
}

// Predefined rate limit configurations
export const rateLimitConfigs = {
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later',
  },
  
  // Registration endpoint
  register: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many registration attempts, please try again later',
  },
  
  // Password reset endpoint
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 3,
    message: 'Too many password reset requests, please try again later',
  },
  
  // General API endpoints
  general: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests, please try again later',
  },
  
  // Strict rate limiting for sensitive operations
  strict: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Rate limit exceeded for sensitive operation',
  },
};

