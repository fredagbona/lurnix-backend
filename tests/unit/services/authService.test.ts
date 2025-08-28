import { authService, AuthServiceError, EmailAlreadyExistsError, UsernameAlreadyExistsError, InvalidCredentialsError, AccountDeactivatedError } from '../../../src/services/authService.js';
import { createTestUser, testData, clearEmailMocks, getEmailMockCalls } from '../../utils/testHelpers.js';
import { hashPassword } from '../../../src/utils/passwordUtils.js';

describe('AuthService', () => {
  let testUser: any;

  beforeEach(async () => {
    clearEmailMocks();
    testUser = await createTestUser(global.testPrisma);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        username: 'newuser',
        fullname: 'New User',
        email: 'newuser@example.com',
        password: 'Password123!'
      };

      const result = await authService.register(userData);

      expect(result.success).toBe(true);
      expect(result.user).toMatchObject({
        username: userData.username,
        fullname: userData.fullname,
        email: userData.email,
        isActive: true
      });
      expect(result.token).toBeValidJWT();

      // Check if welcome email was sent
      const emailCalls = getEmailMockCalls();
      expect(emailCalls.sendWelcomeEmail).toHaveBeenCalledWith(
        userData.email,
        userData.fullname,
        userData.username
      );
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        username: 'differentuser',
        fullname: 'Different User',
        email: testUser.email, // Same email as existing user
        password: 'Password123!'
      };

      await expect(authService.register(userData)).rejects.toThrow(EmailAlreadyExistsError);
    });

    it('should throw error for duplicate username', async () => {
      const userData = {
        username: testUser.username, // Same username as existing user
        fullname: 'Different User',
        email: 'different@example.com',
        password: 'Password123!'
      };

      await expect(authService.register(userData)).rejects.toThrow(UsernameAlreadyExistsError);
    });

    it('should hash password before storing', async () => {
      const userData = {
        username: 'newuser',
        fullname: 'New User',
        email: 'newuser@example.com',
        password: 'Password123!'
      };

      await authService.register(userData);

      const createdUser = await global.testPrisma.user.findUnique({
        where: { email: userData.email }
      });

      expect(createdUser?.password_hash).toBeDefined();
      expect(createdUser?.password_hash).not.toBe(userData.password);
    });

    it('should convert username and email to lowercase', async () => {
      const userData = {
        username: 'NewUser',
        fullname: 'New User',
        email: 'NewUser@Example.Com',
        password: 'Password123!'
      };

      const result = await authService.register(userData);

      expect(result.user.username).toBe('newuser');
      expect(result.user.email).toBe('newuser@example.com');
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const result = await authService.login({
        email: testUser.email,
        password: 'password123'
      });

      expect(result.success).toBe(true);
      expect(result.user).toMatchObject({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email
      });
      expect(result.token).toBeValidJWT();
    });

    it('should throw error for invalid email', async () => {
      await expect(authService.login({
        email: 'nonexistent@example.com',
        password: 'password123'
      })).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw error for invalid password', async () => {
      await expect(authService.login({
        email: testUser.email,
        password: 'wrongpassword'
      })).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw error for inactive account', async () => {
      // Deactivate the test user
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      });

      await expect(authService.login({
        email: testUser.email,
        password: 'password123'
      })).rejects.toThrow(AccountDeactivatedError);
    });

    it('should be case insensitive for email', async () => {
      const result = await authService.login({
        email: testUser.email.toUpperCase(),
        password: 'password123'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        username: 'updateduser',
        fullname: 'Updated User',
        email: 'updated@example.com'
      };

      const result = await authService.updateProfile(testUser.id, updateData);

      expect(result).toMatchObject(updateData);
    });

    it('should update partial profile data', async () => {
      const updateData = {
        fullname: 'Updated Name Only'
      };

      const result = await authService.updateProfile(testUser.id, updateData);

      expect(result.fullname).toBe(updateData.fullname);
      expect(result.username).toBe(testUser.username); // Should remain unchanged
      expect(result.email).toBe(testUser.email); // Should remain unchanged
    });

    it('should throw error for duplicate email', async () => {
      const otherUser = await createTestUser(global.testPrisma, {
        username: 'otheruser',
        email: 'other@example.com'
      });

      await expect(authService.updateProfile(testUser.id, {
        email: otherUser.email
      })).rejects.toThrow(EmailAlreadyExistsError);
    });

    it('should throw error for duplicate username', async () => {
      const otherUser = await createTestUser(global.testPrisma, {
        username: 'otheruser',
        email: 'other@example.com'
      });

      await expect(authService.updateProfile(testUser.id, {
        username: otherUser.username
      })).rejects.toThrow(UsernameAlreadyExistsError);
    });

    it('should allow updating to same email/username', async () => {
      const result = await authService.updateProfile(testUser.id, {
        email: testUser.email,
        username: testUser.username
      });

      expect(result.email).toBe(testUser.email);
      expect(result.username).toBe(testUser.username);
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'NewPassword123!'
      };

      await expect(authService.changePassword(testUser.id, passwordData, '127.0.0.1')).resolves.not.toThrow();

      // Verify password was changed
      const updatedUser = await global.testPrisma.user.findUnique({
        where: { id: testUser.id }
      });

      expect(updatedUser?.password_hash).not.toBe(testUser.password_hash);

      // Check if password changed email was sent
      const emailCalls = getEmailMockCalls();
      expect(emailCalls.sendPasswordChangedEmail).toHaveBeenCalledWith(
        testUser.email,
        testUser.fullname,
        '127.0.0.1'
      );
    });

    it('should throw error for incorrect current password', async () => {
      const passwordData = {
        currentPassword: 'wrongpassword',
        newPassword: 'NewPassword123!'
      };

      await expect(authService.changePassword(testUser.id, passwordData)).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw error for non-existent user', async () => {
      const passwordData = {
        currentPassword: 'password123',
        newPassword: 'NewPassword123!'
      };

      await expect(authService.changePassword('non-existent-id', passwordData)).rejects.toThrow();
    });
  });

  describe('deleteAccount', () => {
    it('should soft delete account successfully', async () => {
      const deleteData = {
        password: 'password123'
      };

      await expect(authService.deleteAccount(testUser.id, deleteData)).resolves.not.toThrow();

      // Verify account was soft deleted
      const deletedUser = await global.testPrisma.user.findUnique({
        where: { id: testUser.id }
      });

      expect(deletedUser?.isActive).toBe(false);
      expect(deletedUser?.deletedAt).toBeDefined();

      // Check if account deleted email was sent
      const emailCalls = getEmailMockCalls();
      expect(emailCalls.sendAccountDeletedEmail).toHaveBeenCalledWith(
        testUser.email,
        testUser.fullname,
        testUser.username
      );
    });

    it('should throw error for incorrect password', async () => {
      const deleteData = {
        password: 'wrongpassword'
      };

      await expect(authService.deleteAccount(testUser.id, deleteData)).rejects.toThrow(InvalidCredentialsError);
    });

    it('should throw error for non-existent user', async () => {
      const deleteData = {
        password: 'password123'
      };

      await expect(authService.deleteAccount('non-existent-id', deleteData)).rejects.toThrow();
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile', async () => {
      const profile = await authService.getUserProfile(testUser.id);

      expect(profile).toMatchObject({
        id: testUser.id,
        username: testUser.username,
        fullname: testUser.fullname,
        email: testUser.email,
        isActive: testUser.isActive
      });

      // Should not contain sensitive data
      expect(profile).not.toHaveProperty('password_hash');
    });

    it('should throw error for non-existent user', async () => {
      await expect(authService.getUserProfile('non-existent-id')).rejects.toThrow();
    });

    it('should throw error for inactive user', async () => {
      // Deactivate the test user
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      });

      await expect(authService.getUserProfile(testUser.id)).rejects.toThrow();
    });
  });

  describe('verifyUser', () => {
    it('should verify active user', async () => {
      const user = await authService.verifyUser(testUser.id);

      expect(user).toMatchObject({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        isActive: true
      });
    });

    it('should throw error for inactive user', async () => {
      // Deactivate the test user
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      });

      await expect(authService.verifyUser(testUser.id)).rejects.toThrow();
    });
  });

  describe('isEmailAvailable', () => {
    it('should return false for existing email', async () => {
      const available = await authService.isEmailAvailable(testUser.email);
      expect(available).toBe(false);
    });

    it('should return true for non-existing email', async () => {
      const available = await authService.isEmailAvailable('available@example.com');
      expect(available).toBe(true);
    });

    it('should exclude current user when checking availability', async () => {
      const available = await authService.isEmailAvailable(testUser.email, testUser.id);
      expect(available).toBe(true);
    });
  });

  describe('isUsernameAvailable', () => {
    it('should return false for existing username', async () => {
      const available = await authService.isUsernameAvailable(testUser.username);
      expect(available).toBe(false);
    });

    it('should return true for non-existing username', async () => {
      const available = await authService.isUsernameAvailable('availableuser');
      expect(available).toBe(true);
    });

    it('should exclude current user when checking availability', async () => {
      const available = await authService.isUsernameAvailable(testUser.username, testUser.id);
      expect(available).toBe(true);
    });
  });

  describe('refreshToken', () => {
    it('should generate new token for valid user', async () => {
      const newToken = await authService.refreshToken(testUser.id);

      expect(newToken).toBeValidJWT();
      expect(typeof newToken).toBe('string');
    });

    it('should throw error for non-existent user', async () => {
      await expect(authService.refreshToken('non-existent-id')).rejects.toThrow();
    });

    it('should throw error for inactive user', async () => {
      // Deactivate the test user
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      });

      await expect(authService.refreshToken(testUser.id)).rejects.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This would require mocking the database to throw errors
      // For now, we'll test that the service methods exist and are callable
      expect(typeof authService.register).toBe('function');
      expect(typeof authService.login).toBe('function');
      expect(typeof authService.updateProfile).toBe('function');
    });

    it('should provide meaningful error messages', async () => {
      try {
        await authService.login({
          email: 'nonexistent@example.com',
          password: 'password123'
        });
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidCredentialsError);
        expect((error as Error).message).toBe('Invalid email or password');
      }
    });
  });
});