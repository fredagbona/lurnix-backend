import { adminRepository } from '../../repositories/adminRepository.js';
import { hashPassword } from '../../utils/passwordUtils.js';
import { AdminRole } from '../../types/auth';
import { config } from '../../config/environment.js';

export class AdminSeedService {
  /**
   * Seeds a default admin user if no admin exists in the database
   * Uses environment variables for admin credentials
   */
  async seedDefaultAdmin(): Promise<void> {
    try {
      // Check if admin seeding is enabled
      if (!config.ADMIN_SEED_ENABLED) {
        console.log('Admin seeding is disabled. Skipping...');
        return;
      }

      // Check if we have the required environment variables
      if (!config.ADMIN_SEED_EMAIL || !config.ADMIN_SEED_PASSWORD || !config.ADMIN_SEED_NAME) {
        console.warn('⚠️ Admin seeding is enabled but required credentials are missing. Skipping admin seed.');
        return;
      }

      // Check if any admin already exists
      const adminCount = await adminRepository.count();
      
      if (adminCount > 0) {
        console.log('👤 Admin users already exist. Skipping admin seed.');
        return;
      }

      // Create default admin
      const passwordHash = await hashPassword(config.ADMIN_SEED_PASSWORD);
      
      const admin = await adminRepository.create({
        name: config.ADMIN_SEED_NAME,
        email: config.ADMIN_SEED_EMAIL,
        password_hash: passwordHash,
        role: AdminRole.SUPER_ADMIN
      });

      console.log(`✅ Default admin created successfully: ${admin.email} (${admin.role})`);
    } catch (error) {
      console.error('❌ Failed to seed default admin:', error);
    }
  }
}

// Export singleton instance
export const adminSeedService = new AdminSeedService();
