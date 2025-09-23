import i18next from 'i18next';
import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export interface TranslatedResponse {
  success: boolean;
  message: string;
  data?: any;
  timestamp: string;
}

export function sendTranslatedResponse(
  res: Response,
  key: string,
  options: {
    statusCode?: number;
    success?: boolean;
    data?: any;
    interpolation?: Record<string, any>;
  }
): void {
  // Get the user's preferred language with detailed logging
  const userLang = (res.req as AuthRequest).user?.language;
  const reqLang = (res.req as any).language;
  const lngLang = (res.req as any).lng;
  const language = userLang || reqLang || lngLang || 'en';
  
  const statusCode = options.statusCode || 200;
  const success = options.success ?? true;

  // Extract namespace from key
  const keyParts = key.split('.');
  const namespace = keyParts[0];
  const namespacedKey = keyParts.length > 1 ? keyParts.slice(1).join('.') : key;
  
  // Check if namespace bundle is loaded
  if (!i18next.hasResourceBundle(language, namespace)) {
    console.warn(`Translation bundle not loaded for ${language}/${namespace}, forcing reload...`);
    try {
      const bundle = require(`../locales/${language}/${namespace}.json`);
      i18next.addResourceBundle(language, namespace, bundle, true, true);
    } catch (error) {
      console.error(`Failed to load translation bundle ${language}/${namespace}:`, error);
    }
  }

  // Try translation with current language first
  let message = i18next.t(namespacedKey, { 
    ...options.interpolation, 
    lng: language,
    ns: namespace
  });
  
  // If the message is the same as the key, try with fallback language
  const untranslatedTokens = new Set([key, namespacedKey]);
  if (untranslatedTokens.has(message) && language !== 'en') {
    message = i18next.t(namespacedKey, { 
      ...options.interpolation, 
      lng: 'en',
      ns: namespace
    });
  }

  // If still no translation, use a generic message
  if (untranslatedTokens.has(message)) {
    console.error(`Translation missing for key: ${key} in both ${language} and en`);
    message = success ? 'Operation completed successfully' : 'Operation failed';
  }

  const response: TranslatedResponse = {
    success,
    message,
    ...(options.data && { data: options.data }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}
