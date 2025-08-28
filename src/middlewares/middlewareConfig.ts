import express, { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { 
  securityHeaders, 
  requestLogger, 
  requestSizeLimit, 
  requireHTTPS,
  requestTimeout 
} from './securityMiddleware.js';
import { errorHandler, notFoundHandler } from './errorMiddleware.js';
import { sanitizeInput } from './validation.js';

// CORS configuration - Allow all origins for development
const corsOptions = {
  origin: true, // Allow all origins
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['*'], // Allow all headers
  exposedHeaders: ['*'], // Expose all headers
  maxAge: 86400, // 24 hours
};

// Configure global middleware - Minimal restrictions for development
export function configureMiddleware(app: Application): void {
  // CORS - Allow all origins
  app.use(cors(corsOptions));
  
  // Body parsing - Increased limits
  app.use(express.json({ limit: '100mb' }));
  app.use(express.urlencoded({ extended: true, limit: '100mb' }));
  
  // Cookie parsing
  app.use(cookieParser());
  
  // Request logging (only in development)
  if (process.env.NODE_ENV === 'development') {
    app.use(requestLogger);
  }
  
  // Minimal security headers (only essential ones)
  app.use((req, res, next) => {
    res.removeHeader('X-Powered-By');
    next();
  });
}

// Configure error handling middleware (should be last)
export function configureErrorHandling(app: Application): void {
  // 404 handler
  app.use(notFoundHandler);
  
  // Global error handler
  app.use(errorHandler);
}

// Middleware combinations for different route types
export const middlewareGroups = {
  // Public routes (no authentication required)
  public: [],
  
  // Authentication routes (with rate limiting)
  auth: [
    // Rate limiting will be applied per route
  ],
  
  // Protected routes (authentication required)
  protected: [
    // Authentication middleware will be applied per route
  ],
  
  // Admin routes (authentication + admin role)
  admin: [
    // Authentication and role checking will be applied per route
  ],
  
  // API routes with validation
  api: [
    // Validation middleware will be applied per route
  ],
};

// Development middleware
export function configureDevMiddleware(app: Application): void {
  if (process.env.NODE_ENV === 'development') {
    // Additional development-only middleware can be added here
    console.log('Development middleware configured');
  }
}

// Production middleware
export function configureProductionMiddleware(app: Application): void {
  if (process.env.NODE_ENV === 'production') {
    // Additional production-only middleware can be added here
    console.log('Production middleware configured');
  }
}

// Test middleware
export function configureTestMiddleware(app: Application): void {
  if (process.env.NODE_ENV === 'test') {
    // Disable logging and other middleware that might interfere with tests
    console.log('Test middleware configured');
  }
}