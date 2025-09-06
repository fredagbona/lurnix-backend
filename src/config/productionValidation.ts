import { config } from './environment';

// Additional production environment validation
export function validateProductionEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate JWT secret in production
  if (config.JWT_SECRET === 'default-secret-key-change-in-production') {
    errors.push('JWT_SECRET must be set to a secure value in production');
  }
  
  // Validate email configuration if enabled
  if (config.EMAIL_ENABLED) {
    if (!config.EMAIL_HOST) {
      errors.push('EMAIL_HOST is required when EMAIL_ENABLED is true');
    }
    if (!config.EMAIL_PORT) {
      errors.push('EMAIL_PORT is required when EMAIL_ENABLED is true');
    }
    if (!config.EMAIL_USER) {
      errors.push('EMAIL_USER is required when EMAIL_ENABLED is true');
    }
    if (!config.EMAIL_PASSWORD) {
      errors.push('EMAIL_PASSWORD is required when EMAIL_ENABLED is true');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
