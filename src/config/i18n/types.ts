import type { Request } from 'express';
import type { Language } from '../../prisma/prismaTypes.js';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { ParsedQs } from 'qs';

interface I18nLocals {
  language?: Language;
  [key: string]: any;
}

export interface I18nRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  LocalsObj extends Record<string, any> = I18nLocals
> extends Request<P, ResBody, ReqBody, ReqQuery, LocalsObj> {}

// Types for translation keys
export type TranslationNamespaces = 'common' | 'auth' | 'quiz' | 'errors' | 'admin' | 'email';

export interface CommonMessages {
  success: string;
  error: string;
  notFound: string;
  unauthorized: string;
  forbidden: string;
  validation: {
    required: string;
    invalid: string;
    tooShort: string;
    tooLong: string;
  };
}

// Add more type definitions for other namespaces as needed
export interface AuthMessages {
  login: {
    success: string;
    failed: string;
    invalidCredentials: string;
  };
  register: {
    success: string;
    emailExists: string;
    usernameExists: string;
  };
  verification: {
    required: string;
    success: string;
    failed: string;
    expired: string;
    resent: string;
  };
}

export interface EmailMessages {
  status: {
    success: string;
    failed: string;
  };
  templates: {
    success: string;
    notFound: string;
  };
  test: {
    success: string;
    failed: string;
  };
  welcome: {
    success: string;
    failed: string;
    missingParameters: string;
  };
  reset: {
    success: string;
    failed: string;
    missingParameters: string;
  };
  errors: {
    missingRecipient: string;
    invalidTemplate: string;
    sendFailed: string;
  };
  connectivity: {
    success: string;
    failed: string;
  };
}

export interface TranslationResource {
  common: CommonMessages;
  auth: AuthMessages;
  email: EmailMessages;
  // Add other namespaces as needed
}