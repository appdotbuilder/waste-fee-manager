import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type CreateUserInput } from '../schema';
import { updateUser } from '../handlers/update_user';
import { eq } from 'drizzle-orm';

// Test user data
const testUserInput: CreateUserInput = {
  username: 'testuser',
  password: 'password123',
  role: 'warga',
  full_name: 'Test User',
  nik: '1234567890123456',
  no_kk: '6543210987654321',
  home_address: 'Jl. Test No. 123',
  rt: '001'
};

const updatedUserData: UpdateUserInput = {
  id: 1, // Will be overridden in tests
  full_name: 'Updated Test User',
  nik: '1111222233334444',
  no_kk: '5555666677778888',
  home_address: 'Jl. Updated No. 456',
  rt: '002'
};

describe('updateUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUserId: number;

  beforeEach(async () => {
    // Create a test user before each test
    const result = await db.insert(usersTable)
      .values({
        username: testUserInput.username,
        password_hash: 'hashed_password_123',
        role: testUserInput.role,
        full_name: testUserInput.full_name,
        nik: testUserInput.nik,
        no_kk: testUserInput.no_kk,
        home_address: testUserInput.home_address,
        rt: testUserInput.rt
      })
      .returning()
      .execute();
    
    testUserId = result[0].id;
  });

  it('should update all user fields', async () => {
    const input = { ...updatedUserData, id: testUserId };
    const result = await updateUser(input);

    // Verify all updated fields
    expect(result.id).toEqual(testUserId);
    expect(result.full_name).toEqual('Updated Test User');
    expect(result.nik).toEqual('1111222233334444');
    expect(result.no_kk).toEqual('5555666677778888');
    expect(result.home_address).toEqual('Jl. Updated No. 456');
    expect(result.rt).toEqual('002');
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify unchanged fields remain the same
    expect(result.username).toEqual('testuser');
    expect(result.role).toEqual('warga');
  });

  it('should update only provided fields', async () => {
    const input: UpdateUserInput = {
      id: testUserId,
      full_name: 'Partially Updated Name',
      rt: '003'
    };

    const result = await updateUser(input);

    // Verify updated fields
    expect(result.full_name).toEqual('Partially Updated Name');
    expect(result.rt).toEqual('003');

    // Verify unchanged fields remain the same
    expect(result.nik).toEqual('1234567890123456');
    expect(result.no_kk).toEqual('6543210987654321');
    expect(result.home_address).toEqual('Jl. Test No. 123');
  });

  it('should update user in database', async () => {
    const input = { ...updatedUserData, id: testUserId };
    await updateUser(input);

    // Query database directly to verify update
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();

    expect(users).toHaveLength(1);
    const user = users[0];
    expect(user.full_name).toEqual('Updated Test User');
    expect(user.nik).toEqual('1111222233334444');
    expect(user.no_kk).toEqual('5555666677778888');
    expect(user.home_address).toEqual('Jl. Updated No. 456');
    expect(user.rt).toEqual('002');
    expect(user.updated_at).toBeInstanceOf(Date);
  });

  it('should update updated_at timestamp', async () => {
    // Get original timestamp
    const originalUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, testUserId))
      .execute();
    
    const originalTimestamp = originalUser[0].updated_at;

    // Wait a small amount to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const input: UpdateUserInput = {
      id: testUserId,
      full_name: 'Name with New Timestamp'
    };

    const result = await updateUser(input);

    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalTimestamp.getTime());
  });

  it('should throw error for non-existent user', async () => {
    const input: UpdateUserInput = {
      id: 99999, // Non-existent ID
      full_name: 'This should fail'
    };

    await expect(updateUser(input)).rejects.toThrow(/user not found/i);
  });

  it('should handle NIK uniqueness constraint violation', async () => {
    // Create another user with a different NIK
    await db.insert(usersTable)
      .values({
        username: 'anotheruser',
        password_hash: 'hashed_password_456',
        role: 'warga',
        full_name: 'Another User',
        nik: '9999888877776666',
        no_kk: '1111000022223333',
        home_address: 'Jl. Another No. 789',
        rt: '003'
      })
      .execute();

    // Try to update first user with the second user's NIK
    const input: UpdateUserInput = {
      id: testUserId,
      nik: '9999888877776666' // This NIK already exists
    };

    await expect(updateUser(input)).rejects.toThrow();
  });

  it('should validate RT format correctly', async () => {
    const input: UpdateUserInput = {
      id: testUserId,
      rt: '025' // Valid RT format
    };

    const result = await updateUser(input);
    expect(result.rt).toEqual('025');
  });

  it('should validate NIK format correctly', async () => {
    const input: UpdateUserInput = {
      id: testUserId,
      nik: '1234567890123456' // Valid 16-digit NIK
    };

    const result = await updateUser(input);
    expect(result.nik).toEqual('1234567890123456');
    expect(result.nik.length).toEqual(16);
  });

  it('should validate no_kk format correctly', async () => {
    const input: UpdateUserInput = {
      id: testUserId,
      no_kk: '9876543210987654' // Valid 16-digit no_kk
    };

    const result = await updateUser(input);
    expect(result.no_kk).toEqual('9876543210987654');
    expect(result.no_kk.length).toEqual(16);
  });
});