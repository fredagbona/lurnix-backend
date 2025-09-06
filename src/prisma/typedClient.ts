import { PrismaClient } from '@prisma/client';
import { ExtendedPrismaClient } from './prismaTypes';

// Create a single instance of the Prisma client
const prismaClient = new PrismaClient();

// Create a type-safe wrapper around the Prisma client
const typedPrismaClient = prismaClient as unknown as ExtendedPrismaClient;

export { typedPrismaClient as prisma };
