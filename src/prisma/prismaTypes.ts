import { PrismaClient } from '@prisma/client';

// Define a type that includes all the models we need
type PrismaModels = {
  roadmap: any;
  progress: any;
  objective: any;
  quizResult: any;
  quizQuestion: any;
  quizOption: any;
  user: any;
  admin: any;
  subscriptionPlan: any;
};

// Define the extended PrismaClient type with proper model casing
export type ExtendedPrismaClient = PrismaClient & PrismaModels;
