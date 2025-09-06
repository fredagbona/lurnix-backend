import { Admin, AdminRole } from '../types/auth';
import { adminRepository, CreateAdminData } from '../repositories/adminRepository.js';
import { hashPassword, comparePassword } from '../utils/passwordUtils.js';
import { generateToken } from '../utils/jwt.js';
import { AppError } from '../errors/AppError.js';
import { emailService } from './emailService.js';

export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminRegisterRequest {
  name: string;
  email: string;
  password: string;
  role?: AdminRole;
  createdBy?: string; // Name of the admin who created this account
}

export interface AdminProfile {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt: Date;
}

export interface AdminAuthResponse {
  admin: AdminProfile;
  token: string;
}

export class AdminAuthService {
  // Register a new admin (only super_admin can do this)
  async register(data: AdminRegisterRequest): Promise<AdminAuthResponse> {
    // Check if email already exists
    const existingAdmin = await adminRepository.findByEmail(data.email);
    if (existingAdmin) {
      throw new AppError('Email already in use', 400);
    }

    // Hash password
    const password_hash = await hashPassword(data.password);

    // Create admin
    const admin = await adminRepository.create({
      name: data.name,
      email: data.email,
      password_hash,
      role: data.role || AdminRole.MANAGER // Default to manager if not specified
    });

    // Generate JWT token
    const token = generateToken({
      adminId: admin.id,
      email: admin.email,
      role: admin.role
    });
    
    // Send welcome email to the new admin
    try {
      await emailService.sendAdminWelcomeEmail(
        admin.email,
        admin.name,
        admin.role,
        data.createdBy || 'System Administrator'
      );
      console.log(`✅ Welcome email sent to new admin: ${admin.email}`);
    } catch (error) {
      console.error(`❌ Failed to send welcome email to admin: ${admin.email}`, error);
      // Don't throw error here, as the admin was created successfully
    }

    // Return admin profile and token
    return {
      admin: this.toAdminProfile(admin),
      token
    };
  }

  // Login admin
  async login(data: AdminLoginRequest): Promise<AdminAuthResponse> {
    // Find admin by email
    const admin = await adminRepository.findByEmail(data.email);
    if (!admin) {
      throw new AppError('Invalid email or password', 401);
    }

    // Verify password
    const isPasswordValid = await comparePassword(data.password, admin.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401);
    }

    // Generate JWT token
    const token = generateToken({
      adminId: admin.id,
      email: admin.email,
      role: admin.role
    });

    // Return admin profile and token
    return {
      admin: this.toAdminProfile(admin),
      token
    };
  }

  // Verify admin exists by ID
  async verifyAdmin(adminId: string): Promise<Admin> {
    const admin = await adminRepository.findById(adminId);
    if (!admin) {
      throw new AppError('Admin not found', 404);
    }
    return admin;
  }

  // Change admin password
  async changePassword(adminId: string, currentPassword: string, newPassword: string): Promise<void> {
    // Find admin
    const admin = await this.verifyAdmin(adminId);

    // Verify current password
    const isPasswordValid = await comparePassword(currentPassword, admin.password_hash);
    if (!isPasswordValid) {
      throw new AppError('Current password is incorrect', 400);
    }

    // Hash new password
    const password_hash = await hashPassword(newPassword);

    // Update admin
    await adminRepository.update(adminId, { password_hash });
  }

  // Convert Admin to AdminProfile (remove sensitive data)
  private toAdminProfile(admin: Admin): AdminProfile {
    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      createdAt: admin.createdAt
    };
  }
}

// Export singleton instance
export const adminAuthService = new AdminAuthService();
