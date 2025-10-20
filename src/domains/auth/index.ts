// Auth Domain - User authentication, OAuth, and user management
export * from './services';
export * from './controllers/authController';
export * from './controllers/userManagementController';
export * from './controllers/emailController';
export * from './repositories/userRepository';
export { default as authRoutes } from './routes/auth/authRoutes';
export { default as userManagementRoutes } from './routes/userManagementRoutes';
