import dotenv from 'dotenv';

// Load environment variables based on NODE_ENV
const env = process.env.NODE_ENV || 'production';

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
  EMAIL_HOST: string;
  EMAIL_PORT: number;
  EMAIL_SECURE: boolean;
  EMAIL_USER: string;
  EMAIL_PASSWORD: string;
  EMAIL_FROM_ADDRESS: string;
  EMAIL_FROM_NAME: string;
  LOGO_URL: string;
  
  // Frontend Configuration
  FRONTEND_URL: string;
  ALLOWED_ORIGINS: string[];
  API_BASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CALLBACK_URL: string;
  GITHUB_CALLBACK_URL: string;
  
  // Security Configuration
  BCRYPT_ROUNDS: number;
  RATE_LIMIT_WINDOW: number;
  RATE_LIMIT_MAX: number;
  
  // Admin Seed Configuration
  ADMIN_SEED_ENABLED: boolean;
  ADMIN_SEED_EMAIL: string;
  ADMIN_SEED_PASSWORD: string;
  ADMIN_SEED_NAME: string;
  
  // Monitoring Configuration
  LOG_LEVEL: string;
  ENABLE_REQUEST_LOGGING: boolean;
  ENABLE_ERROR_MONITORING: boolean;

  // Planner / AI Configuration
  PLANNER_PROVIDER: 'lmstudio' | 'groq';
  LMSTUDIO_BASE_URL: string;
  LMSTUDIO_MODEL: string;
  LMSTUDIO_TIMEOUT_MS: number;
  LMSTUDIO_MAX_TOKENS: number;
  GROQ_BASE_URL: string;
  GROQ_API_KEY: string;
  GROQ_MODEL: string;
  PLANNER_VERSION: string;
  PLANNER_REQUEST_TIMEOUT_MS: number;
  REVIEWER_PROVIDER: 'lmstudio' | 'groq';
  REVIEWER_LMSTUDIO_MODEL: string;
  REVIEWER_GROQ_MODEL: string;

  // Feature Requests Configuration
  FEATURE_REQUESTS_MAX_PER_DAY: number;
  FEATURE_REQUESTS_WINDOW_HOURS: number;
  FEATURE_REQUEST_DUPLICATE_THRESHOLD: number;
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
  EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.example.com',
  EMAIL_PORT: parseInt(process.env.EMAIL_PORT || '587', 10),
  EMAIL_SECURE: process.env.EMAIL_SECURE === 'true',
  EMAIL_USER: process.env.EMAIL_USER || '',
  EMAIL_PASSWORD: process.env.EMAIL_PASSWORD || '',
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS || 'noreply@lurnix.com',
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME || 'Lurnix',
  LOGO_URL: process.env.LOGO_URL || 'https://lurnix.com/logo.png',
  
  // Frontend Configuration
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:5050/api',
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || '',
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET || '',
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || `${process.env.API_BASE_URL || 'http://localhost:5050/api'}/auth/google/callback`,
  GITHUB_CALLBACK_URL: process.env.GITHUB_CALLBACK_URL || `${process.env.API_BASE_URL || 'http://localhost:5050/api'}/auth/github/callback`,
  
  // Security Configuration
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  
  // Admin Seed Configuration
  ADMIN_SEED_ENABLED: process.env.ADMIN_SEED_ENABLED === 'true',
  ADMIN_SEED_EMAIL: process.env.ADMIN_SEED_EMAIL || '',
  ADMIN_SEED_PASSWORD: process.env.ADMIN_SEED_PASSWORD || '',
  ADMIN_SEED_NAME: process.env.ADMIN_SEED_NAME || '',
  
  // Monitoring Configuration
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  ENABLE_REQUEST_LOGGING: process.env.ENABLE_REQUEST_LOGGING !== 'false',
  ENABLE_ERROR_MONITORING: process.env.ENABLE_ERROR_MONITORING !== 'false',

  // Planner / AI Configuration
  PLANNER_PROVIDER: (process.env.PLANNER_PROVIDER as 'lmstudio' | 'groq')
    || (env === 'production' ? 'groq' : 'lmstudio'),
  LMSTUDIO_BASE_URL: process.env.LMSTUDIO_BASE_URL || 'http://localhost:1234',
  LMSTUDIO_MODEL: process.env.LMSTUDIO_MODEL || 'llama-3.1-8b-instruct',
  GROQ_BASE_URL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1/chat/completions',
  GROQ_API_KEY: process.env.GROQ_API_KEY || '',
  GROQ_MODEL: process.env.GROQ_MODEL || 'llama-3.1-70b',
  PLANNER_VERSION: process.env.PLANNER_VERSION || '2024-09-profile-context',
  PLANNER_REQUEST_TIMEOUT_MS: parseInt(process.env.PLANNER_REQUEST_TIMEOUT_MS || '60000', 10),
  LMSTUDIO_TIMEOUT_MS: parseInt(
    process.env.LMSTUDIO_TIMEOUT_MS
      || process.env.PLANNER_REQUEST_TIMEOUT_MS
      || '60000',
    10
  ),
  LMSTUDIO_MAX_TOKENS: parseInt(process.env.LMSTUDIO_MAX_TOKENS || '4096', 10),
  REVIEWER_PROVIDER:
    (process.env.REVIEWER_PROVIDER as 'lmstudio' | 'groq')
    || (process.env.PLANNER_PROVIDER as 'lmstudio' | 'groq')
    || (env === 'production' ? 'groq' : 'lmstudio'),
  REVIEWER_LMSTUDIO_MODEL:
    process.env.REVIEWER_LMSTUDIO_MODEL
    || process.env.LMSTUDIO_MODEL
    || 'llama-3.1-8b-instruct',
  REVIEWER_GROQ_MODEL:
    process.env.REVIEWER_GROQ_MODEL
    || process.env.GROQ_MODEL
    || 'llama-3.1-70b',

  // Feature Requests Configuration
  FEATURE_REQUESTS_MAX_PER_DAY: parseInt(process.env.FEATURE_REQUESTS_MAX_PER_DAY || '1', 10),
  FEATURE_REQUESTS_WINDOW_HOURS: parseInt(process.env.FEATURE_REQUESTS_WINDOW_HOURS || '24', 10),
  FEATURE_REQUEST_DUPLICATE_THRESHOLD: parseFloat(process.env.FEATURE_REQUEST_DUPLICATE_THRESHOLD || '0.55'),
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
  
  // Validate admin seed configuration if enabled
  if (config.ADMIN_SEED_ENABLED) {
    if (!config.ADMIN_SEED_EMAIL) {
      errors.push('ADMIN_SEED_EMAIL is required when ADMIN_SEED_ENABLED is true');
    }
    if (!config.ADMIN_SEED_PASSWORD) {
      errors.push('ADMIN_SEED_PASSWORD is required when ADMIN_SEED_ENABLED is true');
    }
    if (!config.ADMIN_SEED_NAME) {
      errors.push('ADMIN_SEED_NAME is required when ADMIN_SEED_ENABLED is true');
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

  if (config.PLANNER_PROVIDER === 'groq' && !config.GROQ_API_KEY) {
    errors.push('GROQ_API_KEY is required when PLANNER_PROVIDER is set to groq');
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
    if (config.EMAIL_ENABLED) {
      console.log(`   EMAIL_HOST: ${config.EMAIL_HOST ? '✓ Configured' : '✗ Missing'}`);
      console.log(`   EMAIL_USER: ${config.EMAIL_USER ? '✓ Configured' : '✗ Missing'}`);
      console.log(`   EMAIL_PASSWORD: ${config.EMAIL_PASSWORD ? '✓ Configured' : '✗ Missing'}`);
    }
    console.log(`   ADMIN_SEED_ENABLED: ${config.ADMIN_SEED_ENABLED}`);
    if (config.ADMIN_SEED_ENABLED) {
      console.log(`   ADMIN_SEED_EMAIL: ${config.ADMIN_SEED_EMAIL ? '✓ Configured' : '✗ Missing'}`);
      console.log(`   ADMIN_SEED_NAME: ${config.ADMIN_SEED_NAME ? '✓ Configured' : '✗ Missing'}`);
      console.log(`   ADMIN_SEED_PASSWORD: ${config.ADMIN_SEED_PASSWORD ? '✓ Configured' : '✗ Missing'}`);
    }
    console.log(`   FRONTEND_URL: ${config.FRONTEND_URL}`);
    console.log(`   ALLOWED_ORIGINS: ${config.ALLOWED_ORIGINS.join(', ')}`);
    console.log(`   API_BASE_URL: ${config.API_BASE_URL}`);
    console.log(`   GOOGLE_CLIENT_ID: ${config.GOOGLE_CLIENT_ID ? '✓ Configured' : '✗ Missing'}`);
    console.log(`   GOOGLE_CLIENT_SECRET: ${config.GOOGLE_CLIENT_SECRET ? '✓ Configured' : '✗ Missing'}`);
    console.log(`   GOOGLE_CALLBACK_URL: ${config.GOOGLE_CALLBACK_URL}`);
    console.log(`   GITHUB_CLIENT_ID: ${config.GITHUB_CLIENT_ID ? '✓ Configured' : '✗ Missing'}`);
    console.log(`   GITHUB_CLIENT_SECRET: ${config.GITHUB_CLIENT_SECRET ? '✓ Configured' : '✗ Missing'}`);
    console.log(`   GITHUB_CALLBACK_URL: ${config.GITHUB_CALLBACK_URL}`);
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
  EMAIL_HOST,
  EMAIL_PORT,
  EMAIL_SECURE,
  EMAIL_USER,
  EMAIL_PASSWORD,
  EMAIL_FROM_ADDRESS,
  EMAIL_FROM_NAME,
  LOGO_URL,
  FRONTEND_URL,
  ALLOWED_ORIGINS,
  API_BASE_URL,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
  GITHUB_CALLBACK_URL,
  BCRYPT_ROUNDS,
  RATE_LIMIT_WINDOW,
  RATE_LIMIT_MAX,
  ADMIN_SEED_ENABLED,
  ADMIN_SEED_EMAIL,
  ADMIN_SEED_PASSWORD,
  ADMIN_SEED_NAME,
  LOG_LEVEL,
  ENABLE_REQUEST_LOGGING,
  ENABLE_ERROR_MONITORING,
  PLANNER_PROVIDER,
  LMSTUDIO_BASE_URL,
  LMSTUDIO_MODEL,
  GROQ_BASE_URL,
  GROQ_API_KEY,
  GROQ_MODEL,
  PLANNER_VERSION
} = config;
