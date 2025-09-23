import { Request, Response, NextFunction } from 'express';
import i18next from 'i18next';
import middleware from 'i18next-http-middleware';
import jwt from 'jsonwebtoken';
import { db } from '../prisma/prismaWrapper.js';

declare module 'express' {
  interface Request {
    lng?: string;
    language?: string;
  }
}

/**
 * Express middleware to handle language detection and setting
 */
export const languageMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Try to get language from user object (set by auth middleware)
  const userLanguage = (req as any).user?.language;

  // Try to get language from token
  const authHeader = req.headers.authorization;
  let tokenLanguage;
  let decodedToken;
  let dbLanguage;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      decodedToken = jwt.decode(token) as { language?: string; userId?: string; adminId?: string };
      tokenLanguage = decodedToken?.language;

      if (decodedToken?.userId) {
        try {
          const userRecord = await db.user.findUnique({
            where: { id: decodedToken.userId },
            select: { language: true }
          });

          if (userRecord?.language) {
            dbLanguage = userRecord.language;
          }
        } catch (dbError) {
          console.error('Error fetching user language from database:', dbError);
        }
      } else if (decodedToken?.adminId) {
        try {
          const adminRecord = await db.admin.findUnique({
            where: { id: decodedToken.adminId },
            select: { language: true }
          });

          if (adminRecord?.language) {
            dbLanguage = adminRecord.language;
          }
        } catch (dbError) {
          console.error('Error fetching admin language from database:', dbError);
        }
      }
    } catch (error) {
      console.error('Error decoding token language:', error);
    }
  }

  // Try to get language from Accept-Language header
  const headerLanguage = req.headers['accept-language']?.split(',')[0]?.substring(0, 2);

  // Set language in order of precedence:
  // 1. User preference from database
  // 2. Token language
  // 3. Accept-Language header
  // 4. Default to 'en'
  const language = dbLanguage || userLanguage || tokenLanguage || headerLanguage || 'en';
  const normalizedLanguage = language.toLowerCase();

  // Set language for i18next and request
  req.lng = normalizedLanguage;
  req.language = normalizedLanguage;
  
  // Set user language if we have it from the token
  if (decodedToken) {
    (req as any).user = {
      ...(req as any).user,
      ...decodedToken,
      ...(dbLanguage ? { language: dbLanguage } : {})
    };
  }

  // Force i18next to use this language
  i18next.changeLanguage(normalizedLanguage);
  
  next();
};

// Configure i18next middleware with options
export const i18nextMiddleware = middleware.handle(i18next, {
  ignoreRoutes: ['/health', '/api-docs'],
  removeLngFromUrl: false
});
