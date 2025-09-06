import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/utils/passwordUtils';
import { AdminRole } from '../src/types/auth';

const prisma = new PrismaClient();

async function seedAdmin() {
  try {
    console.log('Seeding admin user...');
    
    // Admin credentials
    const email = 'fredagbona@gmail.com';
    const password = 'Fred@lurnix2025!';
    const name = 'Fred Agbona';
    const role = AdminRole.SUPER_ADMIN;
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Check if admin already exists
    const existingAdmin = await prisma.$queryRaw`
      SELECT * FROM "Admin" WHERE email = ${email} LIMIT 1
    `;
    
    if ((existingAdmin as any[]).length > 0) {
      console.log(`Admin with email ${email} already exists.`);
      process.exit(0);
    }
    
    // Create admin using raw SQL
    await prisma.$executeRaw`
      INSERT INTO "Admin" (id, name, email, password_hash, role, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${name}, ${email}, ${passwordHash}, ${role}::"AdminRole", NOW(), NOW())
    `;
    
    console.log(`✅ Admin created successfully: ${email} (${role})`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed admin:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
