// User-related types
export interface User {
  id: string;
  username: string;
  fullname: string;
  email: string;
  password_hash: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  resetToken: string | null;
  resetTokenExpiry: Date | null;
}

// User profile (response without sensitive data)
export interface UserProfile {
  id: string;
  username: string;
  fullname: string;
  email: string;
  isActive: boolean;
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
  token: string;
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

// Account Deletion DTOs
export interface DeleteAccountRequest {
  password: string;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
  iat: number;
  exp: number;
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
}

export interface UpdateUserData {
  username?: string;
  fullname?: string;
  email?: string;
  password_hash?: string;
  resetToken?: string | null;
  resetTokenExpiry?: Date | null;
}