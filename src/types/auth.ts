// Subscription status enum to match Prisma schema
export enum SubscriptionStatus {
  FREE = 'free',
  ACTIVE = 'active',
  CANCELED = 'canceled',
  EXPIRED = 'expired'
}

// User-related types
export interface User {
  id: string;
  username: string;
  fullname: string;
  email: string;
  password_hash: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  verificationToken: string | null;
  verificationTokenExpiry: Date | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
  // Subscription fields
  subscriptionId: string | null;
  subscriptionStatus: SubscriptionStatus | string;
  subscriptionEndDate: Date | null;
}

// User profile (response without sensitive data)
export interface UserProfile {
  id: string;
  username: string;
  fullname: string;
  email: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: Date;
}

// Registration DTOs
export interface RegisterRequest {
  username: string;
  fullname: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  success: boolean;
  user: UserProfile;
  requiresVerification?: boolean;
}

// Login DTOs
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  user: UserProfile;
  token: string;
}

// Profile Update DTOs
export interface UpdateProfileRequest {
  username?: string;
  fullname?: string;
  email?: string;
}

// Password Change DTOs
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Password Reset DTOs
export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

// Email Verification DTOs
export interface VerifyEmailRequest {
  token: string;
}

export interface ResendVerificationRequest {
  email: string;
}

// Account Deletion DTOs
export interface DeleteAccountRequest {
  password: string;
}

// JWT Payload
export interface JWTPayload {
  userId?: string;
  adminId?: string;
  email: string;
  username?: string;
  role?: AdminRole;
  iat: number;
  exp: number;
}

// Admin types
export enum AdminRole {
  SUPER_ADMIN = 'super_admin',
  MANAGER = 'manager',
  SUPPORT = 'support'
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: AdminRole;
  createdAt: Date;
  updatedAt: Date;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt: Date;
}

// Admin DTOs
export interface AdminRegisterRequest {
  name: string;
  email: string;
  password: string;
  role: AdminRole;
}

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface AdminForgotPasswordRequest {
  email: string;
}

export interface AdminResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface AdminResponse {
  success: boolean;
  admin: AdminProfile;
  token: string;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

// Database operation types
export interface CreateUserData {
  username: string;
  fullname: string;
  email: string;
  password_hash: string;
  isVerified?: boolean;
}

export interface UpdateUserData {
  username?: string;
  fullname?: string;
  email?: string;
  password_hash?: string;
  isVerified?: boolean;
  verificationToken?: string | null;
  verificationTokenExpiry?: Date | null;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
}