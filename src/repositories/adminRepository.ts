import { PrismaClient } from '@prisma/client';
import { Admin, AdminRole } from '../types/auth';
import { AppError } from '../errors/AppError.js';

const prisma = new PrismaClient();

// Custom error classes
export class AdminNotFoundError extends AppError {
  constructor(message = 'Admin not found') {
    super(message, 404);
    this.name = 'AdminNotFoundError';
  }
}

export class AdminAlreadyExistsError extends AppError {
  constructor(message = 'Admin already exists') {
    super(message, 409);
    this.name = 'AdminAlreadyExistsError';
  }
}

export interface CreateAdminData {
  name: string;
  email: string;
  password_hash: string;
  role?: AdminRole;
}

export interface UpdateAdminData {
  name?: string;
  email?: string;
  password_hash?: string;
  role?: AdminRole;
}

export class AdminRepository {
  // Create new admin
  async create(data: CreateAdminData): Promise<Admin> {
    try {
      // Using raw query since Prisma client doesn't have Admin model yet
      const result = await prisma.$executeRaw`
        INSERT INTO "Admin" (id, name, email, password_hash, role, "createdAt", "updatedAt")
        VALUES (gen_random_uuid(), ${data.name}, ${data.email}, ${data.password_hash}, ${data.role}::"AdminRole", NOW(), NOW())
        RETURNING *
      `;
      
      // Fetch the created admin
      const admin = await this.findByEmail(data.email);
      if (!admin) {
        throw new Error('Failed to create admin');
      }
      
      return admin;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('unique constraint') || errorMessage.includes('duplicate key')) {
        throw new AdminAlreadyExistsError('Admin with this email already exists');
      }
      throw new Error(`Failed to create admin: ${errorMessage}`);
    }
  }

  // Find admin by ID
  async findById(id: string): Promise<Admin | null> {
    try {
      // Using raw query since Prisma client doesn't have Admin model yet
      const result = await prisma.$queryRaw<any[]>`
        SELECT * FROM "Admin" WHERE id = ${id} LIMIT 1
      `;
      
      return result[0] as Admin || null;
    } catch (error) {
      console.error('Error finding admin by ID:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  // Find admin by email
  async findByEmail(email: string): Promise<Admin | null> {
    try {
      // Using raw query since Prisma client doesn't have Admin model yet
      const result = await prisma.$queryRaw`
        SELECT * FROM "Admin" WHERE email = ${email} LIMIT 1
      `;
      
      return (result as any[])[0] as Admin || null;
    } catch (error) {
      console.error('Error finding admin by email:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  // Update admin
  async update(id: string, data: Partial<Admin>): Promise<Admin> {
    try {
      // Build SET clause dynamically based on provided data
      let setClauses = [];
      const values: any[] = [];
      
      if (data.name) {
        setClauses.push('name = $1');
        values.push(data.name);
      }
      
      if (data.email) {
        setClauses.push(`email = $${values.length + 1}`);
        values.push(data.email);
      }
      
      if (data.password_hash) {
        setClauses.push(`password_hash = $${values.length + 1}`);
        values.push(data.password_hash);
      }
      
      if (data.role) {
        setClauses.push(`role = $${values.length + 1}`);
        values.push(data.role);
      }
      
      if (data.resetToken !== undefined) {
        setClauses.push(`"resetToken" = $${values.length + 1}`);
        values.push(data.resetToken);
      }
      
      if (data.resetTokenExpiry !== undefined) {
        setClauses.push(`"resetTokenExpiry" = $${values.length + 1}`);
        values.push(data.resetTokenExpiry);
      }
      
      // Add updatedAt
      setClauses.push(`"updatedAt" = NOW()`);
      
      // Execute update query for each field separately
      if (setClauses.length > 0) {
        // We'll use individual updates instead of a dynamic SET clause
        if (data.name) {
          await prisma.$executeRaw`UPDATE "Admin" SET name = ${data.name} WHERE id = ${id}`;
        }
        if (data.email) {
          await prisma.$executeRaw`UPDATE "Admin" SET email = ${data.email} WHERE id = ${id}`;
        }
        if (data.password_hash) {
          await prisma.$executeRaw`UPDATE "Admin" SET password_hash = ${data.password_hash} WHERE id = ${id}`;
        }
        if (data.role) {
          await prisma.$executeRaw`UPDATE "Admin" SET role = ${data.role}::"AdminRole" WHERE id = ${id}`;
        }
        if (data.resetToken !== undefined) {
          await prisma.$executeRaw`UPDATE "Admin" SET "resetToken" = ${data.resetToken} WHERE id = ${id}`;
        }
        if (data.resetTokenExpiry !== undefined) {
          await prisma.$executeRaw`UPDATE "Admin" SET "resetTokenExpiry" = ${data.resetTokenExpiry} WHERE id = ${id}`;
        }
        // Update the timestamp
        await prisma.$executeRaw`UPDATE "Admin" SET "updatedAt" = NOW() WHERE id = ${id}`;
      }
      
      // Return updated admin
      const admin = await this.findById(id);
      if (!admin) {
        throw new AdminNotFoundError();
      }
      
      return admin;
    } catch (error) {
      console.error('Error updating admin:', error instanceof Error ? error.message : String(error));
      throw new AdminNotFoundError();
    }
  }

  // Delete admin
  async delete(id: string): Promise<void> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM "Admin" WHERE id = ${id}
      `;
      
      if (result === 0) {
        throw new AdminNotFoundError();
      }
    } catch (error) {
      console.error('Error deleting admin:', error instanceof Error ? error.message : String(error));
      throw new AdminNotFoundError();
    }
  }

  // Get all admins
  async findAll(): Promise<Admin[]> {
    try {
      const result = await prisma.$queryRaw`
        SELECT * FROM "Admin" ORDER BY "createdAt" DESC
      `;
      
      return result as Admin[];
    } catch (error) {
      console.error('Error finding all admins:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }

  // Count all admins
  async count(): Promise<number> {
    try {
      const result = await prisma.$queryRaw`
        SELECT COUNT(*) as count FROM "Admin"
      `;
      
      return Number((result as any[])[0].count) || 0;
    } catch (error) {
      console.error('Error counting admins:', error instanceof Error ? error.message : String(error));
      return 0;
    }
  }

  // Find admins by role
  async findByRole(role: AdminRole): Promise<Admin[]> {
    try {
      const result = await prisma.$queryRaw`
        SELECT * FROM "Admin" WHERE role = ${role}
      `;
      
      return result as Admin[];
    } catch (error) {
      console.error('Error finding admins by role:', error instanceof Error ? error.message : String(error));
      return [];
    }
  }
  
  // Find admin by reset token
  async findByResetToken(token: string): Promise<Admin | null> {
    try {
      const result = await prisma.$queryRaw`
        SELECT * FROM "Admin" 
        WHERE "resetToken" = ${token} 
        AND "resetTokenExpiry" > NOW() 
        LIMIT 1
      `;
      
      return (result as any[])[0] as Admin || null;
    } catch (error) {
      console.error('Error finding admin by reset token:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }
}

// Export singleton instance
export const adminRepository = new AdminRepository();
