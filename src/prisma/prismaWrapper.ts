import { PrismaClient } from '@prisma/client';

// Create a single instance of the Prisma client
const prismaClient = new PrismaClient();

// Define a type that includes all the models we need
type PrismaModels = {
  roadmap: any;
  progress: any;
  objective: any;
  sprint: any;
  sprintArtifact: any;
  learnerProfile: any;
  quizResult: any;
  quizQuestion: any;
  quizOption: any;
  knowledgeQuiz: any;
  knowledgeQuizQuestion: any;
  knowledgeQuizTranslation: any;
  knowledgeQuizQuestionTranslation: any;
  user: any;
  admin: any;
  subscriptionPlan: any;
  featureRequest: any;
  featureVote: any;
  featureStatusChange: any;
  featureModNote: any;
  objectiveContext: any;
};

// Create a wrapper with type assertions to fix TypeScript errors
export const db = prismaClient as unknown as PrismaModels & PrismaClient;
