import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, paymentsTable } from '../db/schema';
import { type CreateUserInput, type CreatePaymentInput } from '../schema';
import { getAllPayments } from '../handlers/get_all_payments';

// Test users data
const testAdminUser: CreateUserInput = {
  username: 'admin_test',
  password: 'password123',
  role: 'admin_kelurahan',
  full_name: 'Test Admin',
  nik: '1234567890123456',
  no_kk: '6543210987654321',
  home_address: 'Test Admin Address',
  rt: '001'
};

const testWargaUser: CreateUserInput = {
  username: 'warga_test',
  password: 'password123',
  role: 'warga',
  full_name: 'Test Warga',
  nik: '9876543210123456',
  no_kk: '1234567890987654',
  home_address: 'Test Warga Address',
  rt: '002'
};

describe('getAllPayments', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no payments exist', async () => {
    const result = await getAllPayments();
    
    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all payments with correct data types', async () => {
    // Create test users first
    const [adminUser] = await db.insert(usersTable)
      .values({
        username: testAdminUser.username,
        password_hash: 'hashed_password',
        role: testAdminUser.role,
        full_name: testAdminUser.full_name,
        nik: testAdminUser.nik,
        no_kk: testAdminUser.no_kk,
        home_address: testAdminUser.home_address,
        rt: testAdminUser.rt
      })
      .returning()
      .execute();

    const [wargaUser] = await db.insert(usersTable)
      .values({
        username: testWargaUser.username,
        password_hash: 'hashed_password',
        role: testWargaUser.role,
        full_name: testWargaUser.full_name,
        nik: testWargaUser.nik,
        no_kk: testWargaUser.no_kk,
        home_address: testWargaUser.home_address,
        rt: testWargaUser.rt
      })
      .returning()
      .execute();

    // Create test payments
    const testPaymentData = {
      user_id: wargaUser.id,
      amount: '50000.50', // Store as string in database
      payment_date: new Date('2024-01-15'),
      month: 1,
      year: 2024,
      receipt_photo_url: 'https://example.com/receipt1.jpg',
      recorded_by_admin_id: adminUser.id
    };

    const [payment] = await db.insert(paymentsTable)
      .values(testPaymentData)
      .returning()
      .execute();

    const result = await getAllPayments();

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(payment.id);
    expect(result[0].user_id).toEqual(wargaUser.id);
    expect(result[0].amount).toEqual(50000.50);
    expect(typeof result[0].amount).toBe('number'); // Verify numeric conversion
    expect(result[0].payment_date).toBeInstanceOf(Date);
    expect(result[0].month).toEqual(1);
    expect(result[0].year).toEqual(2024);
    expect(result[0].receipt_photo_url).toEqual('https://example.com/receipt1.jpg');
    expect(result[0].recorded_by_admin_id).toEqual(adminUser.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple payments correctly ordered', async () => {
    // Create test users
    const [adminUser] = await db.insert(usersTable)
      .values({
        username: testAdminUser.username,
        password_hash: 'hashed_password',
        role: testAdminUser.role,
        full_name: testAdminUser.full_name,
        nik: testAdminUser.nik,
        no_kk: testAdminUser.no_kk,
        home_address: testAdminUser.home_address,
        rt: testAdminUser.rt
      })
      .returning()
      .execute();

    const [wargaUser] = await db.insert(usersTable)
      .values({
        username: testWargaUser.username,
        password_hash: 'hashed_password',
        role: testWargaUser.role,
        full_name: testWargaUser.full_name,
        nik: testWargaUser.nik,
        no_kk: testWargaUser.no_kk,
        home_address: testWargaUser.home_address,
        rt: testWargaUser.rt
      })
      .returning()
      .execute();

    // Create multiple test payments
    const paymentData1 = {
      user_id: wargaUser.id,
      amount: '25000.00',
      payment_date: new Date('2024-01-15'),
      month: 1,
      year: 2024,
      receipt_photo_url: 'https://example.com/receipt1.jpg',
      recorded_by_admin_id: adminUser.id
    };

    const paymentData2 = {
      user_id: wargaUser.id,
      amount: '30000.75',
      payment_date: new Date('2024-02-15'),
      month: 2,
      year: 2024,
      receipt_photo_url: null,
      recorded_by_admin_id: adminUser.id
    };

    const paymentData3 = {
      user_id: wargaUser.id,
      amount: '45000.25',
      payment_date: new Date('2024-03-15'),
      month: 3,
      year: 2024,
      receipt_photo_url: 'https://example.com/receipt3.jpg',
      recorded_by_admin_id: adminUser.id
    };

    await db.insert(paymentsTable)
      .values([paymentData1, paymentData2, paymentData3])
      .execute();

    const result = await getAllPayments();

    expect(result).toHaveLength(3);
    
    // Verify all payments have correct numeric conversion
    result.forEach(payment => {
      expect(typeof payment.amount).toBe('number');
      expect(payment.amount).toBeGreaterThan(0);
      expect(payment.user_id).toEqual(wargaUser.id);
      expect(payment.recorded_by_admin_id).toEqual(adminUser.id);
      expect(payment.created_at).toBeInstanceOf(Date);
      expect(payment.updated_at).toBeInstanceOf(Date);
    });

    // Check specific amounts
    const amounts = result.map(p => p.amount).sort();
    expect(amounts).toEqual([25000, 30000.75, 45000.25]);
  });

  it('should handle payments with null receipt_photo_url', async () => {
    // Create test users
    const [adminUser] = await db.insert(usersTable)
      .values({
        username: testAdminUser.username,
        password_hash: 'hashed_password',
        role: testAdminUser.role,
        full_name: testAdminUser.full_name,
        nik: testAdminUser.nik,
        no_kk: testAdminUser.no_kk,
        home_address: testAdminUser.home_address,
        rt: testAdminUser.rt
      })
      .returning()
      .execute();

    const [wargaUser] = await db.insert(usersTable)
      .values({
        username: testWargaUser.username,
        password_hash: 'hashed_password',
        role: testWargaUser.role,
        full_name: testWargaUser.full_name,
        nik: testWargaUser.nik,
        no_kk: testWargaUser.no_kk,
        home_address: testWargaUser.home_address,
        rt: testWargaUser.rt
      })
      .returning()
      .execute();

    // Create payment with null receipt_photo_url
    const paymentData = {
      user_id: wargaUser.id,
      amount: '15000.00',
      payment_date: new Date('2024-01-15'),
      month: 1,
      year: 2024,
      receipt_photo_url: null,
      recorded_by_admin_id: adminUser.id
    };

    await db.insert(paymentsTable)
      .values(paymentData)
      .execute();

    const result = await getAllPayments();

    expect(result).toHaveLength(1);
    expect(result[0].receipt_photo_url).toBeNull();
    expect(result[0].amount).toEqual(15000);
    expect(typeof result[0].amount).toBe('number');
  });

  it('should handle decimal amounts correctly', async () => {
    // Create test users
    const [adminUser] = await db.insert(usersTable)
      .values({
        username: testAdminUser.username,
        password_hash: 'hashed_password',
        role: testAdminUser.role,
        full_name: testAdminUser.full_name,
        nik: testAdminUser.nik,
        no_kk: testAdminUser.no_kk,
        home_address: testAdminUser.home_address,
        rt: testAdminUser.rt
      })
      .returning()
      .execute();

    const [wargaUser] = await db.insert(usersTable)
      .values({
        username: testWargaUser.username,
        password_hash: 'hashed_password',
        role: testWargaUser.role,
        full_name: testWargaUser.full_name,
        nik: testWargaUser.nik,
        no_kk: testWargaUser.no_kk,
        home_address: testWargaUser.home_address,
        rt: testWargaUser.rt
      })
      .returning()
      .execute();

    // Create payment with decimal amount
    const paymentData = {
      user_id: wargaUser.id,
      amount: '12345.67',
      payment_date: new Date('2024-01-15'),
      month: 1,
      year: 2024,
      receipt_photo_url: 'https://example.com/receipt.jpg',
      recorded_by_admin_id: adminUser.id
    };

    await db.insert(paymentsTable)
      .values(paymentData)
      .execute();

    const result = await getAllPayments();

    expect(result).toHaveLength(1);
    expect(result[0].amount).toEqual(12345.67);
    expect(typeof result[0].amount).toBe('number');
    // Verify precision is maintained
    expect(result[0].amount.toFixed(2)).toBe('12345.67');
  });
});