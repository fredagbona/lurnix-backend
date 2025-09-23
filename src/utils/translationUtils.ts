import i18next from 'i18next';
import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware.js';

export interface TranslatedResponse {
  success: boolean;
  message: string;
  data?: any;
  timestamp: string;
}

interface TranslationOptions {
  language?: string;
  interpolation?: Record<string, any>;
  fallbackMessage?: string;
}

function ensureBundle(language: string, namespace?: string) {
  if (!namespace) {
    return;
  }

  if (i18next.hasResourceBundle(language, namespace)) {
    return;
  }

  try {
    const bundle = require(`../locales/${language}/${namespace}.json`);
    i18next.addResourceBundle(language, namespace, bundle, true, true);
  } catch (error) {
    console.error(`Failed to load translation bundle ${language}/${namespace}:`, error);
  }
}

function resolveTranslationKey(rawKey: string) {
  if (!rawKey) {
    return { namespace: undefined as string | undefined, key: rawKey };
  }

  if (rawKey.includes(':')) {
    const [namespace, key] = rawKey.split(':');
    return { namespace: namespace || undefined, key: key || rawKey };
  }

  const namespaces = new Set<string>(
    Array.isArray(i18next.options?.ns)
      ? (i18next.options?.ns as string[])
      : typeof i18next.options?.ns === 'string'
        ? [i18next.options?.ns as string]
        : []
  );

  const defaultNamespace = Array.isArray(i18next.options?.defaultNS)
    ? (i18next.options?.defaultNS[0] as string | undefined)
    : (i18next.options?.defaultNS as string | undefined) ?? 'translation';

  const parts = rawKey.split('.');
  const potentialNamespace = parts[0];

  if (namespaces.has(potentialNamespace) && parts.length > 1) {
    return {
      namespace: potentialNamespace,
      key: parts.slice(1).join('.'),
    };
  }

  return {
    namespace: defaultNamespace,
    key: rawKey,
  };
}

export function translateKey(
  rawKey: string,
  options: TranslationOptions = {}
): { message: string; resolvedKey: string; namespace?: string } {
  const language = options.language || i18next.language || 'en';
  const { namespace, key } = resolveTranslationKey(rawKey);

  ensureBundle(language, namespace);

  const translationOptions = {
    ...options.interpolation,
    lng: language,
    ...(namespace ? { ns: namespace } : {}),
  };

  let message = i18next.t(key, translationOptions);

  if ((message === key || message === rawKey) && language !== 'en') {
    ensureBundle('en', namespace);
    message = i18next.t(key, {
      ...options.interpolation,
      lng: 'en',
      ...(namespace ? { ns: namespace } : {}),
    });
  }

  if (message === key || message === rawKey) {
    if (options.fallbackMessage) {
      message = options.fallbackMessage;
    }
  }

  return {
    message,
    resolvedKey: key,
    namespace,
  };
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
  const userLang = (res.req as AuthRequest).user?.language;
  const reqLang = (res.req as any).language;
  const lngLang = (res.req as any).lng;
  const language = userLang || reqLang || lngLang || 'en';
  
  const statusCode = options.statusCode || 200;
  const success = options.success ?? true;

  const { message, resolvedKey } = translateKey(key, {
    language,
    interpolation: options.interpolation,
    fallbackMessage: success ? 'Operation completed successfully' : 'Operation failed',
  });

  if (message === resolvedKey || message === key) {
    console.error(`Translation missing for key: ${key} in both ${language} and en`);
  }

  const response: TranslatedResponse = {
    success,
    message,
    ...(options.data && { data: options.data }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
}
