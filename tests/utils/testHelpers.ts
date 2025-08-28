import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../src/utils/passwordUtils.js';
import { generateToken } from '../../src/utils/jwt.js';

// Test user data factory
export const createTestUser = async (prisma: PrismaClient, overrides: any = {}) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  const uniqueId = `${timestamp}_${random}`;
  
  const defaultUser = {
    username: `testuser_${uniqueId}`,
    fullname: 'Test User',
    email: `test_${uniqueId}@example.com`,
    password_hash: await hashPassword('password123'),
    isActive: true,
    ...overrides
  };

  return await prisma.user.create({
    data: defaultUser
  });
};

// Create multiple test users
export const createTestUsers = async (prisma: PrismaClient, count: number = 3) => {
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const user = await createTestUser(prisma, {
      username: `testuser${i}`,
      fullname: `Test User ${i}`,
      email: `test${i}@example.com`
    });
    users.push(user);
  }
  
  return users;
};

// Generate test JWT token
export const generateTestToken = (userId: string, username: string = 'testuser', email: string = 'test@example.com') => {
  return generateToken({
    userId,
    username,
    email
  });
};

// Create authenticated request headers
export const createAuthHeaders = (token: string) => ({
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
});

// Test data generators
export const testData = {
  validUser: {
    username: 'validuser',
    fullname: 'Valid User',
    email: 'valid@example.com',
    password: 'ValidPass123!'
  },
  
  invalidUser: {
    username: 'a', // too short
    fullname: '', // empty
    email: 'invalid-email', // invalid format
    password: '123' // too short
  },
  
  updateData: {
    username: 'updateduser',
    fullname: 'Updated User',
    email: 'updated@example.com'
  },
  
  passwordChange: {
    currentPassword: 'password123',
    newPassword: 'NewPassword123!'
  },
  
  invalidPasswordChange: {
    currentPassword: 'wrongpassword',
    newPassword: '123' // too short
  }
};

// API response validators
export const validateApiResponse = (response: any, expectSuccess: boolean = true) => {
  expect(response).toHaveProperty('success');
  expect(response).toHaveProperty('timestamp');
  expect(response.success).toBe(expectSuccess);
  
  if (expectSuccess) {
    expect(response).toHaveProperty('data');
  } else {
    expect(response).toHaveProperty('error');
    expect(response.error).toHaveProperty('code');
    expect(response.error).toHaveProperty('message');
  }
};

// Validate user profile response
export const validateUserProfile = (user: any) => {
  expect(user).toHaveProperty('id');
  expect(user).toHaveProperty('username');
  expect(user).toHaveProperty('fullname');
  expect(user).toHaveProperty('email');
  expect(user).toHaveProperty('isActive');
  expect(user).toHaveProperty('createdAt');
  
  // Should not contain sensitive data
  expect(user).not.toHaveProperty('password_hash');
  expect(user).not.toHaveProperty('resetToken');
  expect(user).not.toHaveProperty('resetTokenExpiry');
  
  // Validate data types
  expect(user.id).toBeValidUUID();
  expect(user.email).toBeValidEmail();
  expect(typeof user.username).toBe('string');
  expect(typeof user.fullname).toBe('string');
  expect(typeof user.isActive).toBe('boolean');
};

// Validate authentication response
export const validateAuthResponse = (response: any) => {
  validateApiResponse(response, true);
  
  expect(response.data).toHaveProperty('user');
  expect(response.data).toHaveProperty('token');
  
  validateUserProfile(response.data.user);
  expect(response.data.token).toBeValidJWT();
};

// Database cleanup helpers
export const cleanupDatabase = async (prisma: PrismaClient) => {
  await prisma.user.deleteMany({});
};

// Wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock request object
export const createMockRequest = (overrides: any = {}) => ({
  body: {},
  params: {},
  query: {},
  headers: {},
  ip: '127.0.0.1',
  connection: { remoteAddress: '127.0.0.1' },
  get: jest.fn().mockReturnValue('test-user-agent'),
  ...overrides
});

// Mock response object
export const createMockResponse = () => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    removeHeader: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    headersSent: false
  };
  return res;
};

// Mock next function
export const createMockNext = () => jest.fn();

// Error testing helpers
export const expectToThrowAsync = async (fn: () => Promise<any>, errorClass?: any) => {
  let error;
  try {
    await fn();
  } catch (e) {
    error = e;
  }
  
  expect(error).toBeDefined();
  if (errorClass) {
    expect(error).toBeInstanceOf(errorClass);
  }
  
  return error;
};

// Rate limiting test helper
export const testRateLimit = async (
  requestFn: () => Promise<any>,
  maxRequests: number,
  windowMs: number
) => {
  const requests = [];
  
  // Make requests up to the limit
  for (let i = 0; i < maxRequests; i++) {
    requests.push(await requestFn());
  }
  
  // Next request should be rate limited
  const rateLimitedResponse = await requestFn();
  expect(rateLimitedResponse.status).toBe(429);
  
  return { successfulRequests: requests, rateLimitedResponse };
};

// Email mock helpers
export const getEmailMockCalls = () => {
  const emailService = require('../../src/services/emailService').emailService;
  return {
    sendWelcomeEmail: emailService.sendWelcomeEmail,
    sendPasswordResetEmail: emailService.sendPasswordResetEmail,
    sendPasswordChangedEmail: emailService.sendPasswordChangedEmail,
    sendAccountDeletedEmail: emailService.sendAccountDeletedEmail
  };
};

// Clear email mocks
export const clearEmailMocks = () => {
  const emailService = require('../../src/services/emailService').emailService;
  emailService.sendWelcomeEmail.mockClear();
  emailService.sendPasswordResetEmail.mockClear();
  emailService.sendPasswordChangedEmail.mockClear();
  emailService.sendAccountDeletedEmail.mockClear();
};

// Performance testing helper
export const measurePerformance = async (fn: () => Promise<any>, iterations: number = 100) => {
  const startTime = Date.now();
  const results = [];
  
  for (let i = 0; i < iterations; i++) {
    const iterationStart = Date.now();
    await fn();
    const iterationEnd = Date.now();
    results.push(iterationEnd - iterationStart);
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const averageTime = results.reduce((sum, time) => sum + time, 0) / results.length;
  const minTime = Math.min(...results);
  const maxTime = Math.max(...results);
  
  return {
    totalTime,
    averageTime,
    minTime,
    maxTime,
    iterations,
    results
  };
};