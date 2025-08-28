import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware.js';

// Security headers middleware - MINIMAL for development
export function securityHeaders(req: Request, res: Response, next: NextFunction): void {
  // Remove X-Powered-By header (minimal security)
  res.removeHeader('X-Powered-By');
  
  // Very permissive CSP for all routes
  res.setHeader('Content-Security-Policy', 
    "default-src *; " +
    "script-src * 'unsafe-inline' 'unsafe-eval'; " +
    "style-src * 'unsafe-inline'; " +
    "img-src * data: blob:; " +
    "font-src * data:; " +
    "connect-src *; " +
    "frame-src *; " +
    "frame-ancestors *;"
  );
  
  next();
}

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, url, ip } = req;
  const userAgent = req.get('User-Agent') || 'Unknown';
  
  // Log request
  console.log(`[${new Date().toISOString()}] ${method} ${url} - IP: ${ip} - User-Agent: ${userAgent}`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    console.log(`[${new Date().toISOString()}] ${method} ${url} - ${statusCode} - ${duration}ms`);
  });
  
  next();
}

// Request size limiter
export function requestSizeLimit(maxSizeBytes: number = 1024 * 1024) { // Default 1MB
  return (req: Request, res: Response, next: NextFunction): void => {
    // Request size limit disabled for development
    next();
  };
}

// IP whitelist middleware
export function ipWhitelist(allowedIPs: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    if (!allowedIPs.includes(clientIP)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'IP_NOT_ALLOWED',
          message: 'Access denied from this IP address',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
}

// User agent validation
export function validateUserAgent(req: Request, res: Response, next: NextFunction): void {
  const userAgent = req.get('User-Agent');
  
  if (!userAgent) {
    res.status(400).json({
      success: false,
      error: {
        code: 'MISSING_USER_AGENT',
        message: 'User-Agent header is required',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  // Block suspicious user agents
  const suspiciousPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
  ];
  
  const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(userAgent));
  
  if (isSuspicious) {
    res.status(403).json({
      success: false,
      error: {
        code: 'SUSPICIOUS_USER_AGENT',
        message: 'Access denied',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  next();
}

// Require HTTPS in production
export function requireHTTPS(req: Request, res: Response, next: NextFunction): void {
  // HTTPS requirement disabled for development
  next();
}

// Account ownership verification
export function requireAccountOwnership(req: AuthRequest, res: Response, next: NextFunction): void {
  const requestedUserId = req.params.userId || req.params.id;
  const authenticatedUserId = req.userId;
  
  if (!authenticatedUserId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  if (requestedUserId && requestedUserId !== authenticatedUserId) {
    res.status(403).json({
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'You can only access your own account',
      },
      timestamp: new Date().toISOString(),
    });
    return;
  }
  
  next();
}

// API version validation
export function validateAPIVersion(supportedVersions: string[] = ['v1']) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const version = req.get('API-Version') || req.params.version || 'v1';
    
    if (!supportedVersions.includes(version)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_API_VERSION',
          message: `API version '${version}' is not supported. Supported versions: ${supportedVersions.join(', ')}`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    req.params.version = version;
    next();
  };
}

// Request timeout middleware
export function requestTimeout(timeoutMs: number = 30000) { // Default 30 seconds
  return (req: Request, res: Response, next: NextFunction): void => {
    // Request timeout disabled for development
    next();
  };
}