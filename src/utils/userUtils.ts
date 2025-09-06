import { User, UserProfile } from '../types/auth.js';

// Convert User entity to UserProfile (removes sensitive data)
export function toUserProfile(user: User): UserProfile {
  return {
    id: user.id,
    username: user.username,
    fullname: user.fullname,
    email: user.email,
    isActive: user.isActive,
    isVerified: user.isVerified ?? false,
    createdAt: user.createdAt,
  };
}

// Convert multiple Users to UserProfiles
export function toUserProfiles(users: User[]): UserProfile[] {
  return users.map(toUserProfile);
}

// Check if user is active and not soft-deleted
export function isUserActive(user: User): boolean {
  return user.isActive && !user.deletedAt;
}

// Check if reset token is valid and not expired
export function isResetTokenValid(user: User): boolean {
  if (!user.resetToken || !user.resetTokenExpiry) {
    return false;
  }
  
  return new Date() < user.resetTokenExpiry;
}

// Check if verification token is valid and not expired
export function isVerificationTokenValid(user: User): boolean {
  if (!user.verificationToken || !user.verificationTokenExpiry) {
    return false;
  }
  
  return new Date() < user.verificationTokenExpiry;
}

// Sanitize user data for logging (removes sensitive information)
export function sanitizeUserForLogging(user: User): Partial<User> {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    deletedAt: user.deletedAt,
  };
}