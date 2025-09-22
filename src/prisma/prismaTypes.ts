import { PrismaClient, Prisma } from '@prisma/client';

// Define Language type based on our Prisma schema
export type Language = 'en' | 'fr';

// This type represents the actual User model language field type from Prisma
export type PrismaLanguage = Language;

// Define a type that includes all model delegates
type PrismaModels = {
  roadmap: PrismaClient['roadmap'];
  progress: PrismaClient['progress'];
  objective: PrismaClient['objective'];
  quizResult: PrismaClient['quizResult'];
  quizQuestion: PrismaClient['quizQuestion'];
  quizOption: PrismaClient['quizOption'];
  user: PrismaClient['user'];
  admin: PrismaClient['admin'];
  subscriptionPlan: PrismaClient['subscriptionPlan'];
};

// Extended PrismaClient type with model delegates
export type ExtendedPrismaClient = PrismaClient & PrismaModels;
