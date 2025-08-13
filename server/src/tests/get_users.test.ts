import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { getUsers } from '../handlers/get_users';
import { eq } from 'drizzle-orm';

// Test user inputs
const testWarga: CreateUserInput = {
  username: 'test_warga',
  password: 'password123',
  role: 'warga',
  full_name: 'Test Warga User',
  nik: '1234567890123456',
  no_kk: '6543210987654321',
  home_address: 'Jl. Test No. 123',
  rt: '001'
};

const testAdmin: CreateUserInput = {
  username: 'test_admin',
  password: 'admin123',
  role: 'admin_kelurahan',
  full_name: 'Test Admin User',
  nik: '9876543210987654',
  no_kk: '1234567890123456',
  home_address: 'Jl. Admin No. 456',
  rt: '002'
};

const testWarga2: CreateUserInput = {
  username: 'another_warga',
  password: 'password456',
  role: 'warga',
  full_name: 'Another Test User',
  nik: '1111222233334444',
  no_kk: '5555666677778888',
  home_address: 'Jl. Another No. 789',
  rt: '010'
};

describe('getUsers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no users exist', async () => {
    const result = await getUsers();

    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return all users from database', async () => {
    // Create test users directly in database
    await db.insert(usersTable)
      .values([
        {
          username: testWarga.username,
          password_hash: 'hashed_password_1',
          role: testWarga.role,
          full_name: testWarga.full_name,
          nik: testWarga.nik,
          no_kk: testWarga.no_kk,
          home_address: testWarga.home_address,
          rt: testWarga.rt
        },
        {
          username: testAdmin.username,
          password_hash: 'hashed_password_2',
          role: testAdmin.role,
          full_name: testAdmin.full_name,
          nik: testAdmin.nik,
          no_kk: testAdmin.no_kk,
          home_address: testAdmin.home_address,
          rt: testAdmin.rt
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(2);
    
    // Sort by username for consistent testing
    const sortedResult = result.sort((a, b) => a.username.localeCompare(b.username));

    // Verify first user (admin comes first alphabetically)
    expect(sortedResult[0].username).toEqual('test_admin');
    expect(sortedResult[0].role).toEqual('admin_kelurahan');
    expect(sortedResult[0].full_name).toEqual('Test Admin User');
    expect(sortedResult[0].nik).toEqual('9876543210987654');
    expect(sortedResult[0].no_kk).toEqual('1234567890123456');
    expect(sortedResult[0].home_address).toEqual('Jl. Admin No. 456');
    expect(sortedResult[0].rt).toEqual('002');
    expect(sortedResult[0].id).toBeDefined();
    expect(sortedResult[0].created_at).toBeInstanceOf(Date);
    expect(sortedResult[0].updated_at).toBeInstanceOf(Date);

    // Verify second user (warga)
    expect(sortedResult[1].username).toEqual('test_warga');
    expect(sortedResult[1].role).toEqual('warga');
    expect(sortedResult[1].full_name).toEqual('Test Warga User');
    expect(sortedResult[1].nik).toEqual('1234567890123456');
    expect(sortedResult[1].no_kk).toEqual('6543210987654321');
    expect(sortedResult[1].home_address).toEqual('Jl. Test No. 123');
    expect(sortedResult[1].rt).toEqual('001');
  });

  it('should return users with correct data types', async () => {
    // Create a single test user
    await db.insert(usersTable)
      .values({
        username: testWarga.username,
        password_hash: 'hashed_password_test',
        role: testWarga.role,
        full_name: testWarga.full_name,
        nik: testWarga.nik,
        no_kk: testWarga.no_kk,
        home_address: testWarga.home_address,
        rt: testWarga.rt
      })
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(1);
    const user = result[0];

    // Verify data types
    expect(typeof user.id).toBe('number');
    expect(typeof user.username).toBe('string');
    expect(typeof user.password_hash).toBe('string');
    expect(typeof user.role).toBe('string');
    expect(typeof user.full_name).toBe('string');
    expect(typeof user.nik).toBe('string');
    expect(typeof user.no_kk).toBe('string');
    expect(typeof user.home_address).toBe('string');
    expect(typeof user.rt).toBe('string');
    expect(user.created_at).toBeInstanceOf(Date);
    expect(user.updated_at).toBeInstanceOf(Date);

    // Verify enum values
    expect(['warga', 'admin_kelurahan']).toContain(user.role);
  });

  it('should return multiple users with different roles and RT values', async () => {
    // Create users with different roles and RT formats
    await db.insert(usersTable)
      .values([
        {
          username: testWarga.username,
          password_hash: 'hashed_password_warga1',
          role: testWarga.role,
          full_name: testWarga.full_name,
          nik: testWarga.nik,
          no_kk: testWarga.no_kk,
          home_address: testWarga.home_address,
          rt: testWarga.rt
        },
        {
          username: testAdmin.username,
          password_hash: 'hashed_password_admin',
          role: testAdmin.role,
          full_name: testAdmin.full_name,
          nik: testAdmin.nik,
          no_kk: testAdmin.no_kk,
          home_address: testAdmin.home_address,
          rt: testAdmin.rt
        },
        {
          username: testWarga2.username,
          password_hash: 'hashed_password_warga2',
          role: testWarga2.role,
          full_name: testWarga2.full_name,
          nik: testWarga2.nik,
          no_kk: testWarga2.no_kk,
          home_address: testWarga2.home_address,
          rt: testWarga2.rt
        }
      ])
      .execute();

    const result = await getUsers();

    expect(result).toHaveLength(3);

    // Count users by role
    const wargaUsers = result.filter(user => user.role === 'warga');
    const adminUsers = result.filter(user => user.role === 'admin_kelurahan');

    expect(wargaUsers).toHaveLength(2);
    expect(adminUsers).toHaveLength(1);

    // Verify different RT formats
    const rtValues = result.map(user => user.rt).sort();
    expect(rtValues).toEqual(['001', '002', '010']);
  });

  it('should maintain data consistency with database', async () => {
    // Create user via handler test
    const insertResult = await db.insert(usersTable)
      .values({
        username: testWarga.username,
        password_hash: 'test_hashed_password',
        role: testWarga.role,
        full_name: testWarga.full_name,
        nik: testWarga.nik,
        no_kk: testWarga.no_kk,
        home_address: testWarga.home_address,
        rt: testWarga.rt
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Fetch via handler
    const handlerResult = await getUsers();

    expect(handlerResult).toHaveLength(1);
    const handlerUser = handlerResult[0];

    // Verify data matches
    expect(handlerUser.id).toEqual(createdUser.id);
    expect(handlerUser.username).toEqual(createdUser.username);
    expect(handlerUser.password_hash).toEqual(createdUser.password_hash);
    expect(handlerUser.role).toEqual(createdUser.role);
    expect(handlerUser.full_name).toEqual(createdUser.full_name);
    expect(handlerUser.nik).toEqual(createdUser.nik);
    expect(handlerUser.no_kk).toEqual(createdUser.no_kk);
    expect(handlerUser.home_address).toEqual(createdUser.home_address);
    expect(handlerUser.rt).toEqual(createdUser.rt);

    // Verify direct database query returns same data
    const directQuery = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, createdUser.id))
      .execute();

    expect(directQuery).toHaveLength(1);
    expect(directQuery[0]).toEqual(handlerUser);
  });
});