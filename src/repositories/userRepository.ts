import { prisma } from '../prisma/client.js';
import { User, CreateUserData, UpdateUserData } from '../types/auth.js';

// Custom error classes for repository operations
export class UserRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UserRepositoryError';
  }
}

export class UserNotFoundError extends UserRepositoryError {
  constructor(identifier: string) {
    super(`User not found: ${identifier}`);
    this.name = 'UserNotFoundError';
  }
}

export class DuplicateUserError extends UserRepositoryError {
  constructor(field: string, value: string) {
    super(`User with ${field} '${value}' already exists`);
    this.name = 'DuplicateUserError';
  }
}

export class UserRepository {
  // Create a new user
  async create(data: CreateUserData): Promise<User> {
    try {
      const user = await prisma.user.create({
        data: {
          username: data.username,
          fullname: data.fullname,
          email: data.email,
          password_hash: data.password_hash,
          isActive: true,
        },
      });
      return user;
    } catch (error: any) {
      if (error.code === 'P2002') {
        // Unique constraint violation
        const field = error.meta?.target?.[0] || 'field';
        const value = field === 'email' ? data.email : data.username;
        throw new DuplicateUserError(field, value);
      }
      throw new UserRepositoryError(`Failed to create user: ${error.message}`);
    }
  }

  // Find user by ID
  async findById(id: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
      });
      return user;
    } catch (error: any) {
      throw new UserRepositoryError(`Failed to find user by ID: ${error.message}`);
    }
  }

  // Find active user by ID (excludes soft-deleted users)
  async findActiveById(id: string): Promise<User | null> {
    try {
      const user = await prisma.user.findFirst({
        where: { 
          id,
          isActive: true,
        },
      });
      return user;
    } catch (error: any) {
      throw new UserRepositoryError(`Failed to find active user by ID: ${error.message}`);
    }
  }

  // Find user by email
  async findByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      return user;
    } catch (error: any) {
      throw new UserRepositoryError(`Failed to find user by email: ${error.message}`);
    }
  }

  // Find active user by email (excludes soft-deleted users)
  async findActiveByEmail(email: string): Promise<User | null> {
    try {
      const user = await prisma.user.findFirst({
        where: { 
          email: email.toLowerCase(),
          isActive: true,
        },
      });
      return user;
    } catch (error: any) {
      throw new UserRepositoryError(`Failed to find active user by email: ${error.message}`);
    }
  }

  // Find user by username
  async findByUsername(username: string): Promise<User | null> {
    try {
      const user = await prisma.user.findUnique({
        where: { username: username.toLowerCase() },
      });
      return user;
    } catch (error: any) {
      throw new UserRepositoryError(`Failed to find user by username: ${error.message}`);
    }
  }

  // Find active user by username (excludes soft-deleted users)
  async findActiveByUsername(username: string): Promise<User | null> {
    try {
      const user = await prisma.user.findFirst({
        where: { 
          username: username.toLowerCase(),
          isActive: true,
        },
      });
      return user;
    } catch (error: any) {
      throw new UserRepositoryError(`Failed to find active user by username: ${error.message}`);
    }
  }

  // Find user by reset token
  async findByResetToken(token: string): Promise<User | null> {
    try {
      const user = await prisma.user.findFirst({
        where: { 
          resetToken: token,
          isActive: true,
          resetTokenExpiry: {
            gt: new Date(), // Token must not be expired
          },
        },
      });
      return user;
    } catch (error: any) {
      throw new UserRepositoryError(`Failed to find user by reset token: ${error.message}`);
    }
  }

  // Update user
  async update(id: string, data: UpdateUserData): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
      return user;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new UserNotFoundError(id);
      }
      if (error.code === 'P2002') {
        // Unique constraint violation
        const field = error.meta?.target?.[0] || 'field';
        const value = data.email || data.username || 'unknown';
        throw new DuplicateUserError(field, value);
      }
      throw new UserRepositoryError(`Failed to update user: ${error.message}`);
    }
  }

  // Soft delete user (set isActive to false)
  async softDelete(id: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          isActive: false,
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new UserNotFoundError(id);
      }
      throw new UserRepositoryError(`Failed to soft delete user: ${error.message}`);
    }
  }

  // Hard delete user (permanent deletion - use with caution)
  async hardDelete(id: string): Promise<void> {
    try {
      await prisma.user.delete({
        where: { id },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new UserNotFoundError(id);
      }
      throw new UserRepositoryError(`Failed to hard delete user: ${error.message}`);
    }
  }

  // Restore soft-deleted user
  async restore(id: string): Promise<User> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          isActive: true,
          deletedAt: null,
          updatedAt: new Date(),
        },
      });
      return user;
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new UserNotFoundError(id);
      }
      throw new UserRepositoryError(`Failed to restore user: ${error.message}`);
    }
  }

  // Check if email exists (including soft-deleted users)
  async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          ...(excludeUserId && { id: { not: excludeUserId } }),
        },
      });
      return !!user;
    } catch (error: any) {
      throw new UserRepositoryError(`Failed to check email existence: ${error.message}`);
    }
  }

  // Check if username exists (including soft-deleted users)
  async usernameExists(username: string, excludeUserId?: string): Promise<boolean> {
    try {
      const user = await prisma.user.findFirst({
        where: {
          username: username.toLowerCase(),
          ...(excludeUserId && { id: { not: excludeUserId } }),
        },
      });
      return !!user;
    } catch (error: any) {
      throw new UserRepositoryError(`Failed to check username existence: ${error.message}`);
    }
  }

  // Get user count (active users only)
  async getActiveUserCount(): Promise<number> {
    try {
      const count = await prisma.user.count({
        where: { isActive: true },
      });
      return count;
    } catch (error: any) {
      throw new UserRepositoryError(`Failed to get user count: ${error.message}`);
    }
  }

  // Get all active users (with pagination)
  async findActiveUsers(skip: number = 0, take: number = 10): Promise<User[]> {
    try {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      });
      return users;
    } catch (error: any) {
      throw new UserRepositoryError(`Failed to find active users: ${error.message}`);
    }
  }

  // Update password
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          password_hash: passwordHash,
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new UserNotFoundError(id);
      }
      throw new UserRepositoryError(`Failed to update password: ${error.message}`);
    }
  }

  // Set reset token
  async setResetToken(id: string, token: string, expiresAt: Date): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          resetToken: token,
          resetTokenExpiry: expiresAt,
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new UserNotFoundError(id);
      }
      throw new UserRepositoryError(`Failed to set reset token: ${error.message}`);
    }
  }

  // Clear reset token
  async clearResetToken(id: string): Promise<void> {
    try {
      await prisma.user.update({
        where: { id },
        data: {
          resetToken: null,
          resetTokenExpiry: null,
          updatedAt: new Date(),
        },
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new UserNotFoundError(id);
      }
      throw new UserRepositoryError(`Failed to clear reset token: ${error.message}`);
    }
  }
}

// Export a singleton instance
export const userRepository = new UserRepository();