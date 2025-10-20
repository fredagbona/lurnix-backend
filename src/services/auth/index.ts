// Auth Services - Re-exports from new domain structure
// This file maintains backward compatibility during migration
export { authService, AuthServiceError, EmailNotVerifiedError, InvalidCredentialsError } from '../../domains/auth/services/authService';
export { passwordResetService, PasswordResetError } from '../../domains/auth/services/passwordResetService';
// Admin auth services moved to admin domain
export { adminAuthService, type AdminLoginRequest, type AdminRegisterRequest } from '../../domains/admin/services/adminAuthService';
export { adminPasswordResetService } from '../../domains/admin/services/adminPasswordResetService';
