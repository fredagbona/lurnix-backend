import { userRepository, UserNotFoundError, DuplicateUserError } from '../../../src/repositories/userRepository.js';
import { createTestUser, testData } from '../../utils/testHelpers.js';
import { hashPassword } from '../../../src/utils/passwordUtils.js';

describe('UserRepository', () => {
  let testUser: any;

  beforeEach(async () => {
    testUser = await createTestUser(global.testPrisma);
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const userData = {
        username: 'newuser',
        fullname: 'New User',
        email: 'newuser@example.com',
        password_hash: await hashPassword('password123')
      };

      const user = await userRepository.create(userData);

      expect(user).toMatchObject({
        username: userData.username,
        fullname: userData.fullname,
        email: userData.email,
        isActive: true
      });
      expect(user.id).toBeValidUUID();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('should throw DuplicateUserError for duplicate email', async () => {
      const userData = {
        username: 'differentuser',
        fullname: 'Different User',
        email: testUser.email, // Same email
        password_hash: await hashPassword('password123')
      };

      await expect(userRepository.create(userData)).rejects.toThrow(DuplicateUserError);
    });

    it('should throw DuplicateUserError for duplicate username', async () => {
      const userData = {
        username: testUser.username, // Same username
        fullname: 'Different User',
        email: 'different@example.com',
        password_hash: await hashPassword('password123')
      };

      await expect(userRepository.create(userData)).rejects.toThrow(DuplicateUserError);
    });
  });

  describe('findById', () => {
    it('should find user by ID', async () => {
      const user = await userRepository.findById(testUser.id);

      expect(user).toMatchObject({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email
      });
    });

    it('should return null for non-existent ID', async () => {
      const user = await userRepository.findById('non-existent-id');
      expect(user).toBeNull();
    });

    it('should find inactive users', async () => {
      // Deactivate user
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      });

      const user = await userRepository.findById(testUser.id);
      expect(user).toBeTruthy();
      expect(user?.isActive).toBe(false);
    });
  });

  describe('findActiveById', () => {
    it('should find active user by ID', async () => {
      const user = await userRepository.findActiveById(testUser.id);

      expect(user).toMatchObject({
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        isActive: true
      });
    });

    it('should return null for inactive user', async () => {
      // Deactivate user
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      });

      const user = await userRepository.findActiveById(testUser.id);
      expect(user).toBeNull();
    });

    it('should return null for non-existent ID', async () => {
      const user = await userRepository.findActiveById('non-existent-id');
      expect(user).toBeNull();
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const user = await userRepository.findByEmail(testUser.email);

      expect(user).toMatchObject({
        id: testUser.id,
        email: testUser.email
      });
    });

    it('should be case insensitive', async () => {
      const user = await userRepository.findByEmail(testUser.email.toUpperCase());
      expect(user).toBeTruthy();
    });

    it('should return null for non-existent email', async () => {
      const user = await userRepository.findByEmail('nonexistent@example.com');
      expect(user).toBeNull();
    });
  });

  describe('findActiveByEmail', () => {
    it('should find active user by email', async () => {
      const user = await userRepository.findActiveByEmail(testUser.email);

      expect(user).toMatchObject({
        id: testUser.id,
        email: testUser.email,
        isActive: true
      });
    });

    it('should return null for inactive user', async () => {
      // Deactivate user
      await global.testPrisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false }
      });

      const user = await userRepository.findActiveByEmail(testUser.email);
      expect(user).toBeNull();
    });
  });

  describe('findByUsername', () => {
    it('should find user by username', async () => {
      const user = await userRepository.findByUsername(testUser.username);

      expect(user).toMatchObject({
        id: testUser.id,
        username: testUser.username
      });
    });

    it('should be case insensitive', async () => {
      const user = await userRepository.findByUsername(testUser.username.toUpperCase());
      expect(user).toBeTruthy();
    });

    it('should return null for non-existent username', async () => {
      const user = await userRepository.findByUsername('nonexistentuser');
      expect(user).toBeNull();
    });
  });

  describe('update', () => {
    it('should update user successfully', async () => {
      const updateData = {
        username: 'updateduser',
        fullname: 'Updated User',
        email: 'updated@example.com'
      };

      const updatedUser = await userRepository.update(testUser.id, updateData);

      expect(updatedUser).toMatchObject(updateData);
      expect(updatedUser.updatedAt.getTime()).toBeGreaterThan(testUser.updatedAt.getTime());
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      await expect(userRepository.update('non-existent-id', { fullname: 'Test' }))
        .rejects.toThrow(UserNotFoundError);
    });

    it('should throw DuplicateUserError for duplicate email', async () => {
      const otherUser = await createTestUser(global.testPrisma, {
        username: 'otheruser',
        email: 'other@example.com'
      });

      await expect(userRepository.update(testUser.id, { email: otherUser.email }))
        .rejects.toThrow(DuplicateUserError);
    });
  });

  describe('softDelete', () => {
    it('should soft delete user', async () => {
      await userRepository.softDelete(testUser.id);

      const deletedUser = await userRepository.findById(testUser.id);
      expect(deletedUser?.isActive).toBe(false);
      expect(deletedUser?.deletedAt).toBeInstanceOf(Date);
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      await expect(userRepository.softDelete('non-existent-id'))
        .rejects.toThrow(UserNotFoundError);
    });
  });

  describe('restore', () => {
    it('should restore soft-deleted user', async () => {
      // First soft delete the user
      await userRepository.softDelete(testUser.id);

      // Then restore
      const restoredUser = await userRepository.restore(testUser.id);

      expect(restoredUser.isActive).toBe(true);
      expect(restoredUser.deletedAt).toBeNull();
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      await expect(userRepository.restore('non-existent-id'))
        .rejects.toThrow(UserNotFoundError);
    });
  });

  describe('emailExists', () => {
    it('should return true for existing email', async () => {
      const exists = await userRepository.emailExists(testUser.email);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing email', async () => {
      const exists = await userRepository.emailExists('nonexistent@example.com');
      expect(exists).toBe(false);
    });

    it('should exclude specified user ID', async () => {
      const exists = await userRepository.emailExists(testUser.email, testUser.id);
      expect(exists).toBe(false);
    });
  });

  describe('usernameExists', () => {
    it('should return true for existing username', async () => {
      const exists = await userRepository.usernameExists(testUser.username);
      expect(exists).toBe(true);
    });

    it('should return false for non-existing username', async () => {
      const exists = await userRepository.usernameExists('nonexistentuser');
      expect(exists).toBe(false);
    });

    it('should exclude specified user ID', async () => {
      const exists = await userRepository.usernameExists(testUser.username, testUser.id);
      expect(exists).toBe(false);
    });
  });

  describe('getActiveUserCount', () => {
    it('should return count of active users', async () => {
      const count = await userRepository.getActiveUserCount();
      expect(count).toBe(1); // Only our test user

      // Create another user
      await createTestUser(global.testPrisma, {
        username: 'user2',
        email: 'user2@example.com'
      });

      const newCount = await userRepository.getActiveUserCount();
      expect(newCount).toBe(2);
    });

    it('should not count inactive users', async () => {
      // Deactivate user
      await userRepository.softDelete(testUser.id);

      const count = await userRepository.getActiveUserCount();
      expect(count).toBe(0);
    });
  });

  describe('findActiveUsers', () => {
    it('should return active users with pagination', async () => {
      // Create additional users
      await createTestUser(global.testPrisma, {
        username: 'user2',
        email: 'user2@example.com'
      });
      await createTestUser(global.testPrisma, {
        username: 'user3',
        email: 'user3@example.com'
      });

      const users = await userRepository.findActiveUsers(0, 2);
      expect(users).toHaveLength(2);
      expect(users.every(user => user.isActive)).toBe(true);
    });

    it('should skip inactive users', async () => {
      // Create and deactivate a user
      const inactiveUser = await createTestUser(global.testPrisma, {
        username: 'inactive',
        email: 'inactive@example.com'
      });
      await userRepository.softDelete(inactiveUser.id);

      const users = await userRepository.findActiveUsers();
      expect(users).toHaveLength(1);
      expect(users[0].id).toBe(testUser.id);
    });
  });

  describe('setResetToken', () => {
    it('should set reset token and expiry', async () => {
      const token = 'test-reset-token';
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await userRepository.setResetToken(testUser.id, token, expiresAt);

      const updatedUser = await userRepository.findById(testUser.id);
      expect(updatedUser?.resetToken).toBe(token);
      expect(updatedUser?.resetTokenExpiry).toEqual(expiresAt);
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      await expect(userRepository.setResetToken('non-existent-id', 'token', new Date()))
        .rejects.toThrow(UserNotFoundError);
    });
  });

  describe('clearResetToken', () => {
    it('should clear reset token and expiry', async () => {
      // First set a token
      await userRepository.setResetToken(testUser.id, 'token', new Date());

      // Then clear it
      await userRepository.clearResetToken(testUser.id);

      const updatedUser = await userRepository.findById(testUser.id);
      expect(updatedUser?.resetToken).toBeNull();
      expect(updatedUser?.resetTokenExpiry).toBeNull();
    });

    it('should throw UserNotFoundError for non-existent user', async () => {
      await expect(userRepository.clearResetToken('non-existent-id'))
        .rejects.toThrow(UserNotFoundError);
    });
  });

  describe('findByResetToken', () => {
    it('should find user by valid reset token', async () => {
      const token = 'test-reset-token';
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

      await userRepository.setResetToken(testUser.id, token, expiresAt);

      const foundUser = await userRepository.findByResetToken(token);
      expect(foundUser?.id).toBe(testUser.id);
    });

    it('should return null for expired token', async () => {
      const token = 'expired-token';
      const expiresAt = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

      await userRepository.setResetToken(testUser.id, token, expiresAt);

      const foundUser = await userRepository.findByResetToken(token);
      expect(foundUser).toBeNull();
    });

    it('should return null for non-existent token', async () => {
      const foundUser = await userRepository.findByResetToken('non-existent-token');
      expect(foundUser).toBeNull();
    });

    it('should return null for inactive user', async () => {
      const token = 'test-token';
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await userRepository.setResetToken(testUser.id, token, expiresAt);
      await userRepository.softDelete(testUser.id);

      const foundUser = await userRepository.findByResetToken(token);
      expect(foundUser).toBeNull();
    });
  });
});