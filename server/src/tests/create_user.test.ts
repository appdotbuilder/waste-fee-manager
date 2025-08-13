import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input for warga (citizen)
const testWargaInput: CreateUserInput = {
  username: 'test_warga',
  password: 'testpassword123',
  role: 'warga',
  full_name: 'Test Warga User',
  nik: '1234567890123456',
  no_kk: '6543210987654321',
  home_address: 'Jl. Test No. 123',
  rt: '001'
};

// Test input for admin
const testAdminInput: CreateUserInput = {
  username: 'test_admin',
  password: 'adminpassword456',
  role: 'admin_kelurahan',
  full_name: 'Test Admin User',
  nik: '9876543210987654',
  no_kk: '1234567890123456',
  home_address: 'Jl. Admin No. 456',
  rt: '010'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a warga user', async () => {
    const result = await createUser(testWargaInput);

    // Basic field validation
    expect(result.username).toEqual('test_warga');
    expect(result.role).toEqual('warga');
    expect(result.full_name).toEqual('Test Warga User');
    expect(result.nik).toEqual('1234567890123456');
    expect(result.no_kk).toEqual('6543210987654321');
    expect(result.home_address).toEqual('Jl. Test No. 123');
    expect(result.rt).toEqual('001');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Password should be hashed, not plain text
    expect(result.password_hash).not.toEqual('testpassword123');
    expect(result.password_hash).toMatch(/^\$argon2/); // Bun uses Argon2
  });

  it('should create an admin user', async () => {
    const result = await createUser(testAdminInput);

    expect(result.username).toEqual('test_admin');
    expect(result.role).toEqual('admin_kelurahan');
    expect(result.full_name).toEqual('Test Admin User');
    expect(result.nik).toEqual('9876543210987654');
    expect(result.no_kk).toEqual('1234567890123456');
    expect(result.home_address).toEqual('Jl. Admin No. 456');
    expect(result.rt).toEqual('010');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testWargaInput);

    // Query from database to verify persistence
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    const savedUser = users[0];
    
    expect(savedUser.username).toEqual('test_warga');
    expect(savedUser.role).toEqual('warga');
    expect(savedUser.full_name).toEqual('Test Warga User');
    expect(savedUser.nik).toEqual('1234567890123456');
    expect(savedUser.no_kk).toEqual('6543210987654321');
    expect(savedUser.home_address).toEqual('Jl. Test No. 123');
    expect(savedUser.rt).toEqual('001');
    expect(savedUser.created_at).toBeInstanceOf(Date);
    expect(savedUser.updated_at).toBeInstanceOf(Date);
  });

  it('should hash password correctly', async () => {
    const result = await createUser(testWargaInput);
    
    // Verify password was hashed
    expect(result.password_hash).not.toEqual('testpassword123');
    
    // Verify password can be verified with Bun's password verify
    const isValid = await Bun.password.verify('testpassword123', result.password_hash);
    expect(isValid).toBe(true);
    
    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', result.password_hash);
    expect(isInvalid).toBe(false);
  });

  it('should reject duplicate username', async () => {
    // Create first user
    await createUser(testWargaInput);
    
    // Try to create second user with same username
    const duplicateInput = { ...testAdminInput, username: 'test_warga' };
    
    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should reject duplicate NIK', async () => {
    // Create first user
    await createUser(testWargaInput);
    
    // Try to create second user with same NIK
    const duplicateInput = { 
      ...testAdminInput, 
      username: 'different_username',
      nik: '1234567890123456' // Same NIK as first user
    };
    
    await expect(createUser(duplicateInput)).rejects.toThrow(/duplicate key value violates unique constraint/i);
  });

  it('should handle different RT formats correctly', async () => {
    // Test various valid RT formats
    const rtFormats = ['001', '010', '025', '099'];
    
    for (let i = 0; i < rtFormats.length; i++) {
      const input: CreateUserInput = {
        username: `test_rt_${i}`,
        password: 'testpassword',
        role: 'warga',
        full_name: `Test User ${i}`,
        nik: `123456789012345${i}`,
        no_kk: `654321098765432${i}`,
        home_address: `Jl. RT Test No. ${i}`,
        rt: rtFormats[i]
      };
      
      const result = await createUser(input);
      expect(result.rt).toEqual(rtFormats[i]);
    }
  });

  it('should create users with different roles', async () => {
    const warga = await createUser(testWargaInput);
    const admin = await createUser(testAdminInput);
    
    expect(warga.role).toEqual('warga');
    expect(admin.role).toEqual('admin_kelurahan');
    
    // Verify both users exist in database
    const allUsers = await db.select().from(usersTable).execute();
    expect(allUsers).toHaveLength(2);
    
    const roles = allUsers.map(user => user.role).sort();
    expect(roles).toEqual(['admin_kelurahan', 'warga']);
  });
});