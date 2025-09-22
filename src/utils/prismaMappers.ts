import { User, SubscriptionStatus } from '../types/auth.js';
import type { Language } from '../prisma/prismaTypes.js';
import { User as PrismaUser } from '@prisma/client';

// Define a type that includes all fields from Prisma User
type PrismaUserWithVerification = Omit<PrismaUser, 'language'> & {
  language?: Language;
  isVerified?: boolean;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
  subscriptionId?: string | null;
  subscriptionStatus?: string;
  subscriptionEndDate?: Date | null;
};

/**
 * Maps a Prisma User object to our User type
 * This ensures all required fields are present even if the database schema
 * doesn't match our type definition exactly
 */
export function mapPrismaUserToUser(prismaUser: PrismaUserWithVerification): User {
  // Use default values for subscription fields if they don't exist
  const subscriptionStatus = (prismaUser.subscriptionStatus || SubscriptionStatus.FREE) as SubscriptionStatus;
  
  try {
    return {
      id: prismaUser.id,
      username: prismaUser.username,
      fullname: prismaUser.fullname,
      email: prismaUser.email,
      password_hash: prismaUser.password_hash,
      isActive: prismaUser.isActive,
      isVerified: prismaUser.isVerified ?? false,
      createdAt: prismaUser.createdAt,
      updatedAt: prismaUser.updatedAt,
      deletedAt: prismaUser.deletedAt,
      verificationToken: prismaUser.verificationToken ?? null,
      verificationTokenExpiry: prismaUser.verificationTokenExpiry ?? null,
      resetToken: prismaUser.resetToken ?? null,
      resetTokenExpiry: prismaUser.resetTokenExpiry ?? null,
      // Subscription fields with defaults
      subscriptionId: prismaUser.subscriptionId ?? null,
      subscriptionStatus: subscriptionStatus as SubscriptionStatus,
      subscriptionEndDate: prismaUser.subscriptionEndDate ?? null,
      language: (prismaUser.language as Language) ?? 'en',
    };
  } catch (error) {
    console.error('Error in mapPrismaUserToUser:', error);
    console.error('Problem user data:', JSON.stringify(prismaUser, null, 2));
    throw error;
  }
}

/**
 * Maps an array of Prisma User objects to our User type
 */
export function mapPrismaUsersToUsers(prismaUsers: PrismaUserWithVerification[]): User[] {
  return prismaUsers.map(mapPrismaUserToUser);
}
