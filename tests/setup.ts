import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Global test setup
let prisma: PrismaClient;

beforeAll(async () => {
  // Initialize test database
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/lurnix_test'
      }
    }
  });

  // Connect to database
  await prisma.$connect();
  
  // Make prisma available globally for tests
  global.testPrisma = prisma;
});

afterAll(async () => {
  // Clean up database connection
  if (prisma) {
    await prisma.$disconnect();
  }
});

// Clean up database between tests
afterEach(async () => {
  if (prisma) {
    try {
      // Clean up test data in correct order (due to foreign key constraints)
      await prisma.user.deleteMany({});
    } catch (error) {
      console.warn('Failed to clean up test data:', error);
    }
  }
});

// Clean up database before all tests
beforeEach(async () => {
  if (prisma) {
    try {
      // Ensure clean state before each test
      await prisma.user.deleteMany({});
    } catch (error) {
      console.warn('Failed to clean up test data before test:', error);
    }
  }
});

// Mock email service for tests
jest.mock('../src/services/emailService', () => ({
  emailService: {
    sendWelcomeEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordChangedEmail: jest.fn().mockResolvedValue(undefined),
    sendAccountDeletedEmail: jest.fn().mockResolvedValue(undefined),
    sendEmail: jest.fn().mockResolvedValue(undefined),
    sendTemplateEmail: jest.fn().mockResolvedValue(undefined),
    testConnection: jest.fn().mockResolvedValue(true),
    getStatus: jest.fn().mockReturnValue({
      enabled: true,
      configured: true,
      domain: 'test.mailgun.org',
      fromEmail: 'test@lurnix.com'
    })
  }
}));

// Mock external services
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: jest.fn().mockResolvedValue({ id: 'test-message-id', status: 'sent' }),
  status: 200,
  statusText: 'OK'
} as any);

// Extend Jest matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toBeValidEmail(): R;
      toBeValidJWT(): R;
    }
  }
  
  var testPrisma: PrismaClient;
}

// Custom matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = uuidRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid UUID`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid UUID`,
        pass: false,
      };
    }
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = emailRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      };
    }
  },
  
  toBeValidJWT(received: string) {
    const jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = jwtRegex.test(received);
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid JWT`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid JWT`,
        pass: false,
      };
    }
  },
});

// Console override for cleaner test output
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  // Suppress console output during tests unless explicitly needed
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  // Restore console methods
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});