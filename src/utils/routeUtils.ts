import { Request, Response, NextFunction } from 'express';

// Route wrapper for better error handling
export function asyncRoute(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// Route timing middleware
export function routeTimer(routeName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(`Route ${routeName} took ${duration}ms`);
    });
    
    next();
  };
}

// Route access logger
export function routeLogger(routeName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] Accessing route: ${routeName} - ${req.method} ${req.path}`);
    next();
  };
}

// Route deprecation warning
export function deprecatedRoute(message: string, newRoute?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    console.warn(`DEPRECATED ROUTE: ${req.method} ${req.path} - ${message}`);
    if (newRoute) {
      console.warn(`Please use ${newRoute} instead`);
    }
    
    // Add deprecation header
    res.setHeader('X-Deprecated', 'true');
    if (newRoute) {
      res.setHeader('X-Deprecated-Replacement', newRoute);
    }
    
    next();
  };
}

// Route feature flag
export function featureFlag(flagName: string, enabled: boolean = true) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!enabled) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FEATURE_DISABLED',
          message: `Feature '${flagName}' is currently disabled`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
}

// Route maintenance mode
export function maintenanceMode(enabled: boolean = false, message?: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (enabled) {
      res.status(503).json({
        success: false,
        error: {
          code: 'MAINTENANCE_MODE',
          message: message || 'Service is currently under maintenance',
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
}

// Route version compatibility
export function requireVersion(minVersion: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientVersion = req.get('API-Version') || '1.0.0';
    
    // Simple version comparison (for production, use a proper semver library)
    if (clientVersion < minVersion) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VERSION_TOO_OLD',
          message: `API version ${minVersion} or higher is required. You are using ${clientVersion}`,
        },
        timestamp: new Date().toISOString(),
      });
      return;
    }
    
    next();
  };
}

// Route response caching
export function cacheResponse(maxAge: number = 300) { // 5 minutes default
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET') {
      res.setHeader('Cache-Control', `public, max-age=${maxAge}`);
    }
    next();
  };
}

// Route request ID generator
export function requestId() {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = Math.random().toString(36).substring(2, 15);
    req.headers['x-request-id'] = id;
    res.setHeader('X-Request-ID', id);
    next();
  };
}