import {
  validatePasswordStrength,
  isPasswordValid,
  getPasswordStrengthDescription,
  hashPassword,
  comparePassword,
  generateSecureToken,
  generateResetToken,
  isResetTokenExpired
} from '../../../src/utils/passwordUtils.js';

describe('Password Utils', () => {
  describe('validatePasswordStrength', () => {
    it('should validate strong password', () => {
      const result = validatePasswordStrength('StrongPass123!');
      
      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(result.feedback).toHaveLength(0);
    });

    it('should reject password too short', () => {
      const result = validatePasswordStrength('Short1!');
      
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Password must be at least 8 characters long');
    });

    it('should require lowercase letters', () => {
      const result = validatePasswordStrength('PASSWORD123!');
      
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Password must contain at least one lowercase letter');
    });

    it('should require uppercase letters', () => {
      const result = validatePasswordStrength('password123!');
      
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Password must contain at least one uppercase letter');
    });

    it('should require numbers', () => {
      const result = validatePasswordStrength('PasswordOnly!');
      
      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Password must contain at least one number');
    });

    it('should detect common patterns', () => {
      const commonPasswords = ['password123', 'Password123456', 'qwerty123'];
      
      commonPasswords.forEach(password => {
        const result = validatePasswordStrength(password);
        expect(result.score).toBeLessThan(3);
      });
    });

    it('should detect repeated characters', () => {
      const result = validatePasswordStrength('Passsssword123!');
      
      expect(result.feedback).toContain('Avoid common patterns and repeated characters');
    });

    it('should give bonus for special characters', () => {
      const withSpecial = validatePasswordStrength('Password123!');
      const withoutSpecial = validatePasswordStrength('Password123');
      
      expect(withSpecial.score).toBeGreaterThan(withoutSpecial.score);
    });

    it('should give bonus for longer passwords', () => {
      const short = validatePasswordStrength('Pass123!');
      const long = validatePasswordStrength('VeryLongPassword123!');
      
      expect(long.score).toBeGreaterThanOrEqual(short.score);
    });
  });

  describe('isPasswordValid', () => {
    it('should return true for valid password', () => {
      expect(isPasswordValid('ValidPass123!')).toBe(true);
    });

    it('should return false for invalid password', () => {
      expect(isPasswordValid('weak')).toBe(false);
    });
  });

  describe('getPasswordStrengthDescription', () => {
    it('should return correct descriptions', () => {
      expect(getPasswordStrengthDescription(0)).toBe('Weak');
      expect(getPasswordStrengthDescription(1)).toBe('Weak');
      expect(getPasswordStrengthDescription(2)).toBe('Fair');
      expect(getPasswordStrengthDescription(3)).toBe('Good');
      expect(getPasswordStrengthDescription(4)).toBe('Strong');
    });

    it('should handle invalid scores', () => {
      expect(getPasswordStrengthDescription(-1)).toBe('Unknown');
      expect(getPasswordStrengthDescription(5)).toBe('Unknown');
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testPassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      expect(hash).toBeDefined();
    });

    it('should handle special characters', async () => {
      const password = 'test!@#$%^&*()_+{}|:"<>?[]\\;\',./-=`~';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
    });
  });

  describe('comparePassword', () => {
    it('should return true for correct password', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(password, hash);
      
      expect(isMatch).toBe(true);
    });

    it('should return false for incorrect password', async () => {
      const password = 'testPassword123';
      const wrongPassword = 'wrongPassword123';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(wrongPassword, hash);
      
      expect(isMatch).toBe(false);
    });

    it('should handle empty password', async () => {
      const hash = await hashPassword('');
      const isMatch = await comparePassword('', hash);
      
      expect(isMatch).toBe(true);
    });

    it('should handle case sensitivity', async () => {
      const password = 'TestPassword123';
      const hash = await hashPassword(password);
      const isMatch = await comparePassword('testpassword123', hash);
      
      expect(isMatch).toBe(false);
    });
  });

  describe('generateSecureToken', () => {
    it('should generate token with default length', () => {
      const token = generateSecureToken();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBe(32);
    });

    it('should generate token with custom length', () => {
      const length = 64;
      const token = generateSecureToken(length);
      
      expect(token.length).toBe(length);
    });

    it('should generate different tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();
      
      expect(token1).not.toBe(token2);
    });

    it('should only contain valid characters', () => {
      const token = generateSecureToken();
      const validChars = /^[A-Za-z0-9]+$/;
      
      expect(validChars.test(token)).toBe(true);
    });
  });

  describe('generateResetToken', () => {
    it('should generate reset token with expiration', () => {
      const result = generateResetToken();
      
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('expiresAt');
      expect(typeof result.token).toBe('string');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.token.length).toBe(64);
    });

    it('should set expiration 1 hour in future', () => {
      const result = generateResetToken();
      const now = new Date();
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
      
      expect(result.expiresAt.getTime()).toBeCloseTo(oneHourLater.getTime(), -4); // Within 10 seconds
    });

    it('should generate unique tokens', () => {
      const result1 = generateResetToken();
      const result2 = generateResetToken();
      
      expect(result1.token).not.toBe(result2.token);
    });
  });

  describe('isResetTokenExpired', () => {
    it('should return false for future date', () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      const isExpired = isResetTokenExpired(futureDate);
      
      expect(isExpired).toBe(false);
    });

    it('should return true for past date', () => {
      const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const isExpired = isResetTokenExpired(pastDate);
      
      expect(isExpired).toBe(true);
    });

    it('should return true for current time', () => {
      const now = new Date(Date.now() - 1); // 1ms ago to ensure it's expired
      const isExpired = isResetTokenExpired(now);
      
      expect(isExpired).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should hash password in reasonable time', async () => {
      const start = Date.now();
      await hashPassword('testPassword123');
      const end = Date.now();
      
      // Should complete within 1 second
      expect(end - start).toBeLessThan(1000);
    });

    it('should compare password in reasonable time', async () => {
      const password = 'testPassword123';
      const hash = await hashPassword(password);
      
      const start = Date.now();
      await comparePassword(password, hash);
      const end = Date.now();
      
      // Should complete within 1 second
      expect(end - start).toBeLessThan(1000);
    });
  });

  describe('Error Handling', () => {
    it('should handle hash errors gracefully', async () => {
      // This test depends on implementation details
      // In a real scenario, you might mock bcrypt to throw an error
      await expect(hashPassword('test')).resolves.toBeDefined();
    });

    it('should handle compare errors gracefully', async () => {
      const hash = await hashPassword('test');
      await expect(comparePassword('test', hash)).resolves.toBeDefined();
    });
  });
});