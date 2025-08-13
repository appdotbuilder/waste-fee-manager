import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { paymentsTable, usersTable } from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import { createPayment } from '../handlers/create_payment';
import { eq } from 'drizzle-orm';

// Test data
const testUser = {
  username: 'test_user',
  password_hash: 'hashed_password',
  role: 'warga' as const,
  full_name: 'Test User',
  nik: '1234567890123456',
  no_kk: '6543210987654321',
  home_address: 'Test Address',
  rt: '001'
};

const testAdmin = {
  username: 'test_admin',
  password_hash: 'hashed_password',
  role: 'admin_kelurahan' as const,
  full_name: 'Test Admin',
  nik: '9876543210987654',
  no_kk: '1234567890123456',
  home_address: 'Admin Address',
  rt: '002'
};

// Test payment input
const basePaymentInput: Omit<CreatePaymentInput, 'user_id' | 'recorded_by_admin_id'> = {
  amount: 50000,
  payment_date: new Date('2024-01-15'),
  month: 1,
  year: 2024,
  receipt_photo_url: 'https://example.com/receipt.jpg'
};

describe('createPayment', () => {
  let userId: number;
  let adminId: number;

  beforeEach(async () => {
    await createDB();

    // Create test user
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    userId = userResult[0].id;

    // Create test admin
    const adminResult = await db.insert(usersTable)
      .values(testAdmin)
      .returning()
      .execute();
    adminId = adminResult[0].id;
  });

  afterEach(resetDB);

  it('should create a payment successfully', async () => {
    const input: CreatePaymentInput = {
      ...basePaymentInput,
      user_id: userId,
      recorded_by_admin_id: adminId
    };

    const result = await createPayment(input);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(userId);
    expect(result.amount).toEqual(50000);
    expect(typeof result.amount).toEqual('number');
    expect(result.payment_date).toEqual(new Date('2024-01-15'));
    expect(result.month).toEqual(1);
    expect(result.year).toEqual(2024);
    expect(result.receipt_photo_url).toEqual('https://example.com/receipt.jpg');
    expect(result.recorded_by_admin_id).toEqual(adminId);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save payment to database with correct numeric conversion', async () => {
    const input: CreatePaymentInput = {
      ...basePaymentInput,
      user_id: userId,
      recorded_by_admin_id: adminId
    };

    const result = await createPayment(input);

    // Query database to verify payment was saved
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, result.id))
      .execute();

    expect(payments).toHaveLength(1);
    const payment = payments[0];
    expect(payment.user_id).toEqual(userId);
    expect(parseFloat(payment.amount)).toEqual(50000);
    expect(payment.payment_date).toEqual(new Date('2024-01-15'));
    expect(payment.month).toEqual(1);
    expect(payment.year).toEqual(2024);
    expect(payment.receipt_photo_url).toEqual('https://example.com/receipt.jpg');
    expect(payment.recorded_by_admin_id).toEqual(adminId);
    expect(payment.created_at).toBeInstanceOf(Date);
    expect(payment.updated_at).toBeInstanceOf(Date);
  });

  it('should handle null receipt photo URL', async () => {
    const input: CreatePaymentInput = {
      ...basePaymentInput,
      user_id: userId,
      recorded_by_admin_id: adminId,
      receipt_photo_url: null
    };

    const result = await createPayment(input);

    expect(result.receipt_photo_url).toBeNull();
  });

  it('should throw error when user does not exist', async () => {
    const input: CreatePaymentInput = {
      ...basePaymentInput,
      user_id: 99999, // Non-existent user ID
      recorded_by_admin_id: adminId
    };

    await expect(createPayment(input)).rejects.toThrow(/User with ID 99999 not found/i);
  });

  it('should throw error when admin does not exist', async () => {
    const input: CreatePaymentInput = {
      ...basePaymentInput,
      user_id: userId,
      recorded_by_admin_id: 99999 // Non-existent admin ID
    };

    await expect(createPayment(input)).rejects.toThrow(/Admin with ID 99999 not found/i);
  });

  it('should throw error when recorded_by user is not an admin', async () => {
    // Create a regular user (not admin)
    const regularUser = await db.insert(usersTable)
      .values({
        ...testUser,
        username: 'regular_user',
        nik: '1111111111111111',
        no_kk: '2222222222222222'
      })
      .returning()
      .execute();

    const input: CreatePaymentInput = {
      ...basePaymentInput,
      user_id: userId,
      recorded_by_admin_id: regularUser[0].id // Regular user, not admin
    };

    await expect(createPayment(input)).rejects.toThrow(/is not an admin/i);
  });

  it('should handle different payment amounts correctly', async () => {
    const testAmounts = [100.50, 1000000, 25000.75];

    for (const amount of testAmounts) {
      const input: CreatePaymentInput = {
        ...basePaymentInput,
        user_id: userId,
        recorded_by_admin_id: adminId,
        amount: amount
      };

      const result = await createPayment(input);
      expect(result.amount).toEqual(amount);
      expect(typeof result.amount).toEqual('number');
    }
  });

  it('should handle different dates and times correctly', async () => {
    const testDate = new Date('2023-12-25T14:30:00Z');
    const input: CreatePaymentInput = {
      ...basePaymentInput,
      user_id: userId,
      recorded_by_admin_id: adminId,
      payment_date: testDate,
      month: 12,
      year: 2023
    };

    const result = await createPayment(input);

    expect(result.payment_date).toEqual(testDate);
    expect(result.month).toEqual(12);
    expect(result.year).toEqual(2023);
  });
});