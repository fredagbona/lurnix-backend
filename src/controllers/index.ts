export * from './authController.js';
export * from './userManagementController.js';
// adminController moved to domains/admin/controllers/
export { adminController } from '../domains/admin/controllers/adminController';
export * from './emailController.js';
// healthController moved to domains/infrastructure/health/controllers/
export { healthController } from '../domains/infrastructure/health/controllers/healthController';