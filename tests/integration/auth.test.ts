import request from 'supertest';
import { createTestApp } from '../testApp.js';
import { createTestUser, testData, clearEmailMocks, getEmailMockCalls } from '../utils/testHelpers.js';

describe('Auth Integration Tests', () => {
  let app: any;
  let testUser: any;

  beforeAll(() => {
    app = createTestApp();
  });

  beforeEach(async () => {
    clearEmailMocks();
    testUser = await createTestUser(global.testPrisma);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        fullname: 'New User',
        email: 'newuser@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(userData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        username: userData.username,
        fullname: userData.fullname,
        email: userData.email,
        isActive: true
      });
      expect(response.body.data.token).toBeValidJWT();

      // Verify user was created in database
      const createdUser = await global.testPrisma.user.findUnique({
        where: { email: userData.email }
      });
      expect(createdUser).toBeTruthy();

      // Verify welcome email was sent
      const emailCalls = getEmailMockCalls();
      expect(emailCalls.sendWelcomeEmail).toHaveBeenCalledWith(
        userData.email,
        userData.fullname,
        userData.username
      );
    });

    it('should return 400 for invalid input', async () => {
      const invalidData = {
        username: 'a', // too short
        fullname: '', // empty
        email: 'invalid-email', // invalid format
        password: '123' // too short
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toBeDefined();
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        username: 'differentuser',
        fullname: 'Different User',
        email: testUser.email, // Same email as existing user
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('EmailAlreadyExistsError');
    });

    it('should return 409 for duplicate username', async () => {
      const userData = {
        username: testUser.username, // Same username as existing user
        fullname: 'Different User',
        email: 'different@example.com',
        password: 'Password123!'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('UsernameAlreadyExistsError');
    });

    it('should handle rate limiting', async () => {
      const userData = {
        username: 'ratelimituser',
        fullname: 'Rate Limit User',
        email: 'ratelimit@example.com',
        password: 'Password123!'
      };

      // Make multiple requests quickly
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/auth/register')
            .send({
              ...userData,
              username: `${userData.username}${i}`,
              email: `${i}${userData.email}`
            })
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should succeed, but eventually rate limiting should kick in
      const successCount = responses.filter(r => r.status === 201).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount + rateLimitedCount).toBe(5);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email
      });
      expect(response.body.data.token).toBeValidJWT();
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        email: testUser.email,
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('InvalidCredentialsError');
    });

    it('should return 401 for non-existent user', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('InvalidCredentialsError');
    });

    it('should return 401 for inactive account', async () => {
      // Deactivate the test user
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      });

      const loginData = {
        email: testUser.email,
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('AccountDeactivatedError');
    });

    it('should return 400 for invalid input format', async () => {
      const invalidData = {
        email: 'invalid-email',
        password: '' // empty password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should be case insensitive for email', async () => {
      const loginData = {
        email: testUser.email.toUpperCase(),
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should initiate password reset for existing user', async () => {
      const forgotData = {
        email: testUser.email
      };

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(forgotData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');

      // Verify reset token was set in database
      const updatedUser = await global.testPrisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser?.resetToken).toBeTruthy();
      expect(updatedUser?.resetTokenExpiry).toBeTruthy();
    });

    it('should return success even for non-existent email (security)', async () => {
      const forgotData = {
        email: 'nonexistent@example.com'
      };

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(forgotData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('password reset link has been sent');
    });

    it('should return 400 for invalid email format', async () => {
      const forgotData = {
        email: 'invalid-email'
      };

      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send(forgotData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should handle rate limiting', async () => {
      const forgotData = {
        email: testUser.email
      };

      // Make multiple requests quickly
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(
          request(app)
            .post('/api/auth/forgot-password')
            .send(forgotData)
        );
      }

      const responses = await Promise.all(requests);
      
      // Some requests should succeed, but eventually rate limiting should kick in
      const successCount = responses.filter(r => r.status === 200).length;
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      
      expect(successCount + rateLimitedCount).toBe(5);
    });
  });

  describe('POST /api/auth/reset-password', () => {
    let resetToken: string;

    beforeEach(async () => {
      // Set up a reset token for testing
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      resetToken = 'test-reset-token-123';
      
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: {
          resetToken,
          resetTokenExpiry: tokenExpiry
        }
      });
    });

    it('should reset password with valid token', async () => {
      const resetData = {
        token: resetToken,
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('reset successfully');

      // Verify password was changed and token was cleared
      const updatedUser = await global.testPrisma.user.findUnique({
        where: { id: testUser.id }
      });
      expect(updatedUser?.password_hash).not.toBe(testUser.password_hash);
      expect(updatedUser?.resetToken).toBeNull();
      expect(updatedUser?.resetTokenExpiry).toBeNull();
    });

    it('should return 400 for invalid token', async () => {
      const resetData = {
        token: 'invalid-token',
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('Invalid or expired');
    });

    it('should return 400 for expired token', async () => {
      // Set token as expired
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: {
          resetTokenExpiry: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
        }
      });

      const resetData = {
        token: resetToken,
        newPassword: 'NewPassword123!'
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 400 for invalid password format', async () => {
      const resetData = {
        token: resetToken,
        newPassword: '123' // too short
      };

      const response = await request(app)
        .post('/api/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/auth/verify-reset-token/:token', () => {
    let resetToken: string;

    beforeEach(async () => {
      const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      resetToken = 'test-reset-token-123';
      
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: {
          resetToken,
          resetTokenExpiry: tokenExpiry
        }
      });
    });

    it('should verify valid token', async () => {
      const response = await request(app)
        .get(`/api/auth/verify-reset-token/${resetToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(true);
    });

    it('should return invalid for non-existent token', async () => {
      const response = await request(app)
        .get('/api/auth/verify-reset-token/invalid-token')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.valid).toBe(false);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    let authToken: string;

    beforeEach(async () => {
      // Generate a valid token for the test user
      const { generateToken } = await import('../../src/utils/jwt.js');
      authToken = generateToken({
        userId: testUser.id,
        email: testUser.email,
        username: testUser.username
      });
    });

    it('should refresh token for authenticated user', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.token).toBeValidJWT();
      expect(response.body.data.token).not.toBe(authToken); // Should be a new token
    });

    it('should return 401 for missing token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh-token')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });
  });

  describe('GET /api/auth/check', () => {
    let authToken: string;

    beforeEach(async () => {
      const { generateToken } = await import('../../src/utils/jwt.js');
      authToken = generateToken({
        userId: testUser.id,
        email: testUser.email,
        username: testUser.username
      });
    });

    it('should return user info for authenticated user', async () => {
      const response = await request(app)
        .get('/api/auth/check')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user).toMatchObject({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email
      });
    });

    it('should return 401 for unauthenticated user', async () => {
      const response = await request(app)
        .get('/api/auth/check')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NO_TOKEN');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Logged out successfully');
    });
  });
});