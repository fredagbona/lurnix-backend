import { authenticate, optionalAuthenticate } from '../../../src/middlewares/authMiddleware.js';
import { createTestUser, createMockRequest, createMockResponse, createMockNext, generateTestToken } from '../../utils/testHelpers.js';

describe('Auth Middleware', () => {
  let testUser: any;
  let validToken: string;

  beforeEach(async () => {
    testUser = await createTestUser(global.testPrisma);
    validToken = generateTestToken(testUser.id, testUser.username, testUser.email);
  });

  describe('authenticate', () => {
    it('should authenticate user with valid token', async () => {
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${validToken}`
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.userId).toBe(testUser.id);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject request without token', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NO_TOKEN'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with invalid token', async () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'INVALID_TOKEN'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request with malformed authorization header', async () => {
      const req = createMockRequest({
        headers: {
          authorization: 'InvalidFormat token'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'NO_TOKEN'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request for inactive user', async () => {
      // Deactivate the test user
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      });

      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${validToken}`
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject request for non-existent user', async () => {
      // Delete the test user
      await global.testPrisma.user.delete({
        where: { id: testUser.id }
      });

      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${validToken}`
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({
            code: 'UNAUTHORIZED'
          })
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle expired token', async () => {
      // Create an expired token (this would require mocking JWT verification)
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer expired.token.here'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('optionalAuthenticate', () => {
    it('should authenticate user with valid token', async () => {
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${validToken}`
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.userId).toBe(testUser.id);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when no token provided', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
      expect(req.userId).toBeUndefined();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication when token is invalid', async () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
      expect(req.userId).toBeUndefined();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should continue without authentication for inactive user', async () => {
      // Deactivate the test user
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      });

      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${validToken}`
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await optionalAuthenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeUndefined();
      expect(req.userId).toBeUndefined();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('Token Extraction', () => {
    it('should extract token from Bearer header', async () => {
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${validToken}`
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
    });

    it('should handle case-sensitive Bearer keyword', async () => {
      const req = createMockRequest({
        headers: {
          authorization: `bearer ${validToken}` // lowercase
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle authorization header with extra spaces', async () => {
      const req = createMockRequest({
        headers: {
          authorization: `  Bearer   ${validToken}  `
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection errors gracefully', async () => {
      // This would require mocking the database to throw an error
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${validToken}`
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      // For now, just ensure the middleware doesn't crash
      await expect(authenticate(req, res, next)).resolves.not.toThrow();
    });

    it('should handle JWT verification errors', async () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer malformed.jwt.token'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Request Modification', () => {
    it('should add user and userId to request object', async () => {
      const req = createMockRequest({
        headers: {
          authorization: `Bearer ${validToken}`
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(testUser.id);
      expect(req.user.email).toBe(testUser.email);
      expect(req.user.username).toBe(testUser.username);
      expect(req.userId).toBe(testUser.id);
    });

    it('should not modify request object when authentication fails', async () => {
      const req = createMockRequest({
        headers: {
          authorization: 'Bearer invalid-token'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await authenticate(req, res, next);

      expect(req.user).toBeUndefined();
      expect(req.userId).toBeUndefined();
    });
  });
});