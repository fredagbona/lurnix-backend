import 'express';
import type { JWTPayload } from './auth';

declare global {
  namespace Express {
    interface User extends JWTPayload {}

    interface Request {
      user?: JWTPayload;
      userId?: string;
      validatedQuery?: Record<string, unknown>;
      language?: string;
      lng?: string;
    }
  }
}

export {};
