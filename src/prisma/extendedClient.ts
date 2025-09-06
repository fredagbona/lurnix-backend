import { PrismaClient } from '@prisma/client';

// Create a single instance of the Prisma client
const prismaClient = new PrismaClient();

// Export the client with proper type definitions
export const prisma = prismaClient;

// Export type for use in other files
export type ExtendedPrismaClient = typeof prismaClient;
