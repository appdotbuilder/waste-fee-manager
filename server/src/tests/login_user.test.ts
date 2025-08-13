import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput } from '../schema';
import { loginUser } from '../handlers/login_user';

// Test user data
const testUserData = {
  username: 'testuser',
  password: 'password123',
  role: 'warga' as const,
  full_name: 'Test User',
  nik: '1234567890123456',
  no_kk: '9876543210987654',
  home_address: 'Jl. Test No. 123',
  rt: '001'
};

const testAdminData = {
  username: 'admin',
  password: 'admin123',
  role: 'admin_kelurahan' as const,
  full_name: 'Admin User',
  nik: '1111222233334444',
  no_kk: '5555666677778888',
  home_address: 'Jl. Admin No. 456',
  rt: '002'
};

describe('loginUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should authenticate user with correct credentials', async () => {
    // Create test user
    const passwordHash = await Bun.password.hash(testUserData.password);
    const insertResult = await db.insert(usersTable)
      .values({
        username: testUserData.username,
        password_hash: passwordHash,
        role: testUserData.role,
        full_name: testUserData.full_name,
        nik: testUserData.nik,
        no_kk: testUserData.no_kk,
        home_address: testUserData.home_address,
        rt: testUserData.rt
      })
      .returning()
      .execute();

    const createdUser = insertResult[0];

    // Test login with correct credentials
    const loginInput: LoginInput = {
      username: testUserData.username,
      password: testUserData.password
    };

    const result = await loginUser(loginInput);

    expect(result).toBeTruthy();
    expect(result!.id).toEqual(createdUser.id);
    expect(result!.username).toEqual(testUserData.username);
    expect(result!.role).toEqual(testUserData.role);
    expect(result!.full_name).toEqual(testUserData.full_name);
    expect(result!.nik).toEqual(testUserData.nik);
    expect(result!.no_kk).toEqual(testUserData.no_kk);
    expect(result!.home_address).toEqual(testUserData.home_address);
    expect(result!.rt).toEqual(testUserData.rt);
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should authenticate admin with correct credentials', async () => {
    // Create test admin
    const passwordHash = await Bun.password.hash(testAdminData.password);
    await db.insert(usersTable)
      .values({
        username: testAdminData.username,
        password_hash: passwordHash,
        role: testAdminData.role,
        full_name: testAdminData.full_name,
        nik: testAdminData.nik,
        no_kk: testAdminData.no_kk,
        home_address: testAdminData.home_address,
        rt: testAdminData.rt
      })
      .returning()
      .execute();

    // Test login with correct credentials
    const loginInput: LoginInput = {
      username: testAdminData.username,
      password: testAdminData.password
    };

    const result = await loginUser(loginInput);

    expect(result).toBeTruthy();
    expect(result!.username).toEqual(testAdminData.username);
    expect(result!.role).toEqual('admin_kelurahan');
    expect(result!.full_name).toEqual(testAdminData.full_name);
  });

  it('should return null for non-existent username', async () => {
    const loginInput: LoginInput = {
      username: 'nonexistent',
      password: 'anypassword'
    };

    const result = await loginUser(loginInput);

    expect(result).toBeNull();
  });

  it('should return null for incorrect password', async () => {
    // Create test user
    const passwordHash = await Bun.password.hash(testUserData.password);
    await db.insert(usersTable)
      .values({
        username: testUserData.username,
        password_hash: passwordHash,
        role: testUserData.role,
        full_name: testUserData.full_name,
        nik: testUserData.nik,
        no_kk: testUserData.no_kk,
        home_address: testUserData.home_address,
        rt: testUserData.rt
      })
      .returning()
      .execute();

    // Test login with wrong password
    const loginInput: LoginInput = {
      username: testUserData.username,
      password: 'wrongpassword'
    };

    const result = await loginUser(loginInput);

    expect(result).toBeNull();
  });

  it('should handle empty credentials', async () => {
    const loginInput: LoginInput = {
      username: '',
      password: ''
    };

    const result = await loginUser(loginInput);

    expect(result).toBeNull();
  });

  it('should handle case-sensitive username', async () => {
    // Create test user
    const passwordHash = await Bun.password.hash(testUserData.password);
    await db.insert(usersTable)
      .values({
        username: testUserData.username.toLowerCase(),
        password_hash: passwordHash,
        role: testUserData.role,
        full_name: testUserData.full_name,
        nik: testUserData.nik,
        no_kk: testUserData.no_kk,
        home_address: testUserData.home_address,
        rt: testUserData.rt
      })
      .returning()
      .execute();

    // Test login with different case
    const loginInput: LoginInput = {
      username: testUserData.username.toUpperCase(),
      password: testUserData.password
    };

    const result = await loginUser(loginInput);

    // Should fail because username is case-sensitive
    expect(result).toBeNull();
  });

  it('should return user with all required fields', async () => {
    // Create test user
    const passwordHash = await Bun.password.hash(testUserData.password);
    await db.insert(usersTable)
      .values({
        username: testUserData.username,
        password_hash: passwordHash,
        role: testUserData.role,
        full_name: testUserData.full_name,
        nik: testUserData.nik,
        no_kk: testUserData.no_kk,
        home_address: testUserData.home_address,
        rt: testUserData.rt
      })
      .returning()
      .execute();

    const loginInput: LoginInput = {
      username: testUserData.username,
      password: testUserData.password
    };

    const result = await loginUser(loginInput);

    expect(result).toBeTruthy();
    
    // Verify all required User schema fields are present
    expect(typeof result!.id).toBe('number');
    expect(typeof result!.username).toBe('string');
    expect(typeof result!.password_hash).toBe('string');
    expect(['warga', 'admin_kelurahan'].includes(result!.role)).toBe(true);
    expect(typeof result!.full_name).toBe('string');
    expect(typeof result!.nik).toBe('string');
    expect(result!.nik).toMatch(/^\d{16}$/); // 16 digits
    expect(typeof result!.no_kk).toBe('string');
    expect(result!.no_kk).toMatch(/^\d{16}$/); // 16 digits
    expect(typeof result!.home_address).toBe('string');
    expect(typeof result!.rt).toBe('string');
    expect(result!.rt).toMatch(/^00\d{1,2}$/); // RT format
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should work with special characters in password', async () => {
    const specialPassword = 'P@ssw0rd!#$%';
    
    // Create test user with special password
    const passwordHash = await Bun.password.hash(specialPassword);
    await db.insert(usersTable)
      .values({
        username: testUserData.username,
        password_hash: passwordHash,
        role: testUserData.role,
        full_name: testUserData.full_name,
        nik: testUserData.nik,
        no_kk: testUserData.no_kk,
        home_address: testUserData.home_address,
        rt: testUserData.rt
      })
      .returning()
      .execute();

    const loginInput: LoginInput = {
      username: testUserData.username,
      password: specialPassword
    };

    const result = await loginUser(loginInput);

    expect(result).toBeTruthy();
    expect(result!.username).toEqual(testUserData.username);
  });
});