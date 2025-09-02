import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'development';

// Load the appropriate .env file
if (env === 'test') {
  dotenv.config({ path: '.env.test' });
} else if (env === 'production') {
  dotenv.config({ path: '.env.production' });
} else {
  dotenv.config(); // Default to .env
}

// Environment configuration interface
export interface EnvironmentConfig {
  // Server Configuration
  NODE_ENV: string;
  PORT: number;
  
  // Database Configuration
  DATABASE_URL: string;
  
  // JWT Configuration
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  
  // Email Configuration
  EMAIL_ENABLED: boolean;
  MAILZEET_API_KEY: string;
  MAILZEET_API_URL: string;
  FROM_EMAIL: string;
  FROM_NAME: string;
  
  // Frontend Configuration
  FRONTEND_URL: string;
  ALLOWED_ORIGINS: string[];
  
  // Security Configuration
  BCRYPT_ROUNDS: number;
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX: number;
  
  // Monitoring Configuration
  LOG_LEVEL: string;
  ENABLE_REQUEST_LOGGING: boolean;
  ENABLE_ERROR_MONITORING: boolean;
}

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET'
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0 && env !== 'test') {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(envVar => {
    console.error(`   - ${envVar}`);
  });
  process.exit(1);
}

// Environment configuration object
export const config: EnvironmentConfig = {
  // Server Configuration
  NODE_ENV: env,
  PORT: parseInt(process.env.PORT || '5050', 10),
  
  // Database Configuration
  DATABASE_URL: process.env.DATABASE_URL || '',
  
  // JWT Configuration
  JWT_SECRET: process.env.JWT_SECRET || 'default-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  
  // Email Configuration
  EMAIL_ENABLED: process.env.EMAIL_ENABLED !== 'false',
  MAILZEET_API_KEY: process.env.MAILZEET_API_KEY || '',
  MAILZEET_API_URL: process.env.MAILZEET_API_URL || 'https://api.mailzeet.com/v1/mails',
  FROM_EMAIL: process.env.FROM_EMAIL || 'noreply@lurnix.com',
  FROM_NAME: process.env.FROM_NAME || 'Lurnix',
  
  // Frontend Configuration
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  
  // Security Configuration
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  
  // Monitoring Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',
  ENABLE_ERROR_MONITORING: process.env.ENABLE_ERROR_MONITORING !== 'false',
};

// Environment validation
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Validate JWT secret in production
  if (config.NODE_ENV === 'production' && config.JWT_SECRET === 'default-secret-key-change-in-production') {
    errors.push('JWT_SECRET must be set to a secure value in production');
  }
  
  // Validate JWT secret length
  if (config.JWT_SECRET.length < 32) {
    errors.push('JWT_SECRET should be at least 32 characters long');
  }
  
  // Validate database URL format
  if (config.DATABASE_URL && !config.DATABASE_URL.startsWith('postgresql://')) {
    errors.push('DATABASE_URL must be a valid PostgreSQL connection string');
  }
  
  // Validate email configuration if enabled
  if (config.EMAIL_ENABLED) {
    if (!config.MAILZEET_API_KEY) {
      errors.push('MAILZEET_API_KEY is required when EMAIL_ENABLED is true');
    }
    if (!config.MAILZEET_API_URL) {
      errors.push('MAILZEET_API_URL is required when EMAIL_ENABLED is true');
    }
  }
  
  // Validate port range
  if (config.PORT < 1 || config.PORT > 65535) {
    errors.push('PORT must be between 1 and 65535');
  }
  
  // Validate bcrypt rounds
  if (config.BCRYPT_ROUNDS < 10 || config.BCRYPT_ROUNDS > 15) {
    errors.push('BCRYPT_ROUNDS should be between 10 and 15');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// Log configuration on startup
export function logConfiguration(): void {
  if (config.NODE_ENV === 'development') {
    console.log('🔧 Environment Configuration:');
    console.log(`   NODE_ENV: ${config.NODE_ENV}`);
    console.log(`   PORT: ${config.PORT}`);
    console.log(`   DATABASE_URL: ${config.DATABASE_URL ? '✓ Configured' : '✗ Missing'}`);
    console.log(`   JWT_SECRET: ${config.JWT_SECRET ? '✓ Configured' : '✗ Missing'}`);
    console.log(`   EMAIL_ENABLED: ${config.EMAIL_ENABLED}`);
    console.log(`   FRONTEND_URL: ${config.FRONTEND_URL}`);
    console.log(`   ALLOWED_ORIGINS: ${config.ALLOWED_ORIGINS.join(', ')}`);
  }
}

// Get environment info for health checks
export function getEnvironmentInfo() {
  return {
    nodeEnv: config.NODE_ENV,
    nodeVersion: process.version,
    platform: process.platform,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    features: {
      emailEnabled: config.EMAIL_ENABLED,
      errorMonitoringEnabled: config.ENABLE_ERROR_MONITORING,
      requestLoggingEnabled: config.ENABLE_REQUEST_LOGGING,
    },
  };
}

// Export individual config values for convenience
export const {
  NODE_ENV,
  PORT,
  DATABASE_URL,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN,
  EMAIL_ENABLED,
  MAILZEET_API_KEY,
  MAILZEET_API_URL,
  FROM_EMAIL,
  FROM_NAME,
  FRONTEND_URL,
  ALLOWED_ORIGINS,
  BCRYPT_ROUNDS,
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX,
  LOG_LEVEL,
  ENABLE_REQUEST_LOGGING,
  ENABLE_ERROR_MONITORING
} = config;