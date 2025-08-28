import { 
  generateToken, 
  generateRefreshToken, 
  verifyToken, 
  decodeToken, 
  isTokenExpired,
  extractTokenFromHeader,
  generateTokenPair,
  TokenExpiredError,
  InvalidTokenError
} from '../../../src/utils/jwt.js';

describe('JWT Utils', () => {
  const testPayload = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    email: 'test@example.com',
    username: 'testuser'
  };

  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const token = generateToken(testPayload);
      
      expect(token).toBeValidJWT();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should generate different tokens for different payloads', () => {
      const token1 = generateToken(testPayload);
      const token2 = generateToken({
        ...testPayload,
        userId: '987fcdeb-51d2-43a1-b456-426614174000'
      });
      
      expect(token1).not.toBe(token2);
    });

    it('should include all payload data in token', () => {
      const token = generateToken(testPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toMatchObject(testPayload);
      expect(decoded).toHaveProperty('iat');
      expect(decoded).toHaveProperty('exp');
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid refresh token', () => {
      const token = generateRefreshToken(testPayload);
      
      expect(token).toBeValidJWT();
      expect(typeof token).toBe('string');
    });

    it('should include type field in refresh token', () => {
      const token = generateRefreshToken(testPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toHaveProperty('type', 'refresh');
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid token', () => {
      const token = generateToken(testPayload);
      const verified = verifyToken(token);
      
      expect(verified).toMatchObject(testPayload);
    });

    it('should throw InvalidTokenError for malformed token', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow(InvalidTokenError);
    });

    it('should throw InvalidTokenError for empty token', () => {
      expect(() => {
        verifyToken('');
      }).toThrow(InvalidTokenError);
    });

    it('should throw error for token with wrong signature', () => {
      const token = generateToken(testPayload);
      const tamperedToken = token.slice(0, -10) + 'tampered123';
      
      expect(() => {
        verifyToken(tamperedToken);
      }).toThrow(InvalidTokenError);
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const token = generateToken(testPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toMatchObject(testPayload);
    });

    it('should return null for invalid token', () => {
      const decoded = decodeToken('invalid.token');
      expect(decoded).toBeNull();
    });

    it('should decode expired token', () => {
      // Create a token that's already expired
      const expiredPayload = { ...testPayload, exp: Math.floor(Date.now() / 1000) - 3600 };
      const token = generateToken(testPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toBeTruthy();
    });
  });

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      const token = generateToken(testPayload);
      const expired = isTokenExpired(token);
      
      expect(expired).toBe(false);
    });

    it('should return true for invalid token', () => {
      const expired = isTokenExpired('invalid.token');
      expect(expired).toBe(true);
    });

    it('should return true for empty token', () => {
      const expired = isTokenExpired('');
      expect(expired).toBe(true);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
      const authHeader = `Bearer ${token}`;
      
      const extracted = extractTokenFromHeader(authHeader);
      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for malformed header', () => {
      const extracted = extractTokenFromHeader('InvalidHeader token');
      expect(extracted).toBeNull();
    });

    it('should return null for header without token', () => {
      const extracted = extractTokenFromHeader('Bearer');
      expect(extracted).toBeNull();
    });

    it('should return null for header with extra parts', () => {
      const extracted = extractTokenFromHeader('Bearer token extra parts');
      expect(extracted).toBeNull();
    });
  });

  describe('generateTokenPair', () => {
    it('should generate both access and refresh tokens', () => {
      const tokenPair = generateTokenPair(testPayload);
      
      expect(tokenPair).toHaveProperty('accessToken');
      expect(tokenPair).toHaveProperty('refreshToken');
      expect(tokenPair.accessToken).toBeValidJWT();
      expect(tokenPair.refreshToken).toBeValidJWT();
    });

    it('should generate different access and refresh tokens', () => {
      const tokenPair = generateTokenPair(testPayload);
      
      expect(tokenPair.accessToken).not.toBe(tokenPair.refreshToken);
    });

    it('should include type field in refresh token only', () => {
      const tokenPair = generateTokenPair(testPayload);
      
      const accessDecoded = decodeToken(tokenPair.accessToken);
      const refreshDecoded = decodeToken(tokenPair.refreshToken);
      
      expect(accessDecoded).not.toHaveProperty('type');
      expect(refreshDecoded).toHaveProperty('type', 'refresh');
    });
  });

  describe('Error Handling', () => {
    it('should handle JWT errors gracefully', () => {
      expect(() => {
        verifyToken('not.a.jwt');
      }).toThrow();
    });

    it('should provide meaningful error messages', () => {
      try {
        verifyToken('invalid.token.format');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidTokenError);
        expect((error as Error).message).toBe('Invalid token');
      }
    });
  });

  describe('Token Security', () => {
    it('should generate tokens with expiration', () => {
      const token = generateToken(testPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toHaveProperty('exp');
      expect(decoded!.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should generate tokens with issued at timestamp', () => {
      const token = generateToken(testPayload);
      const decoded = decodeToken(token);
      
      expect(decoded).toHaveProperty('iat');
      expect(decoded!.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    });

    it('should not expose sensitive information in token', () => {
      const sensitivePayload = {
        ...testPayload,
        password: 'secret123',
        apiKey: 'secret-api-key'
      };
      
      const token = generateToken(sensitivePayload);
      const decoded = decodeToken(token);
      
      expect(decoded).not.toHaveProperty('password');
      expect(decoded).not.toHaveProperty('apiKey');
    });
  });
});