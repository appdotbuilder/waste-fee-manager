import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, paymentsTable } from '../db/schema';
import { type GetUserPaymentsInput } from '../schema';
import { getUserPayments } from '../handlers/get_user_payments';

// Test data
const testUser1 = {
  username: 'warga001',
  password_hash: 'hashed_password',
  role: 'warga' as const,
  full_name: 'John Doe',
  nik: '1234567890123456',
  no_kk: '9876543210987654',
  home_address: 'Jl. Test No. 123',
  rt: '001'
};

const testUser2 = {
  username: 'warga002',
  password_hash: 'hashed_password',
  role: 'warga' as const,
  full_name: 'Jane Doe',
  nik: '6543210987654321',
  no_kk: '1234567890123456',
  home_address: 'Jl. Test No. 456',
  rt: '002'
};

const testAdmin = {
  username: 'admin001',
  password_hash: 'hashed_password',
  role: 'admin_kelurahan' as const,
  full_name: 'Admin User',
  nik: '9999999999999999',
  no_kk: '8888888888888888',
  home_address: 'Jl. Admin No. 1',
  rt: '001'
};

describe('getUserPayments', () => {
  let userId1: number;
  let userId2: number;
  let adminId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2, testAdmin])
      .returning()
      .execute();

    userId1 = users[0].id;
    userId2 = users[1].id;
    adminId = users[2].id;

    // Create test payments for user1
    await db.insert(paymentsTable)
      .values([
        {
          user_id: userId1,
          amount: '50000.00',
          payment_date: new Date('2024-01-15'),
          month: 1,
          year: 2024,
          receipt_photo_url: 'https://example.com/receipt1.jpg',
          recorded_by_admin_id: adminId
        },
        {
          user_id: userId1,
          amount: '75000.50',
          payment_date: new Date('2024-02-20'),
          month: 2,
          year: 2024,
          receipt_photo_url: null,
          recorded_by_admin_id: adminId
        },
        {
          user_id: userId1,
          amount: '60000.00',
          payment_date: new Date('2023-12-10'),
          month: 12,
          year: 2023,
          receipt_photo_url: 'https://example.com/receipt2.jpg',
          recorded_by_admin_id: adminId
        }
      ])
      .execute();

    // Create test payment for user2
    await db.insert(paymentsTable)
      .values({
        user_id: userId2,
        amount: '45000.00',
        payment_date: new Date('2024-01-25'),
        month: 1,
        year: 2024,
        receipt_photo_url: null,
        recorded_by_admin_id: adminId
      })
      .execute();
  });

  afterEach(resetDB);

  it('should get all payments for a user', async () => {
    const input: GetUserPaymentsInput = {
      user_id: userId1
    };

    const result = await getUserPayments(input);

    expect(result).toHaveLength(3);
    
    // Verify all payments belong to user1
    result.forEach(payment => {
      expect(payment.user_id).toEqual(userId1);
      expect(payment.recorded_by_admin_id).toEqual(adminId);
      expect(typeof payment.amount).toEqual('number'); // Verify numeric conversion
    });

    // Check specific payment details
    const payment1 = result.find(p => p.month === 1 && p.year === 2024);
    expect(payment1?.amount).toEqual(50000.00);
    expect(payment1?.receipt_photo_url).toEqual('https://example.com/receipt1.jpg');

    const payment2 = result.find(p => p.month === 2 && p.year === 2024);
    expect(payment2?.amount).toEqual(75000.50);
    expect(payment2?.receipt_photo_url).toBeNull();

    const payment3 = result.find(p => p.month === 12 && p.year === 2023);
    expect(payment3?.amount).toEqual(60000.00);
    expect(payment3?.receipt_photo_url).toEqual('https://example.com/receipt2.jpg');
  });

  it('should filter payments by year', async () => {
    const input: GetUserPaymentsInput = {
      user_id: userId1,
      year: 2024
    };

    const result = await getUserPayments(input);

    expect(result).toHaveLength(2);
    result.forEach(payment => {
      expect(payment.user_id).toEqual(userId1);
      expect(payment.year).toEqual(2024);
    });

    // Check amounts for 2024 payments
    const amounts = result.map(p => p.amount).sort();
    expect(amounts).toEqual([50000.00, 75000.50]);
  });

  it('should filter payments by month and year', async () => {
    const input: GetUserPaymentsInput = {
      user_id: userId1,
      month: 1,
      year: 2024
    };

    const result = await getUserPayments(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(userId1);
    expect(result[0].month).toEqual(1);
    expect(result[0].year).toEqual(2024);
    expect(result[0].amount).toEqual(50000.00);
    expect(result[0].receipt_photo_url).toEqual('https://example.com/receipt1.jpg');
  });

  it('should filter payments by month only', async () => {
    const input: GetUserPaymentsInput = {
      user_id: userId1,
      month: 1
    };

    const result = await getUserPayments(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(userId1);
    expect(result[0].month).toEqual(1);
    expect(result[0].year).toEqual(2024);
    expect(result[0].amount).toEqual(50000.00);
  });

  it('should return empty array for non-existent user', async () => {
    const input: GetUserPaymentsInput = {
      user_id: 99999
    };

    const result = await getUserPayments(input);

    expect(result).toHaveLength(0);
  });

  it('should return empty array when no payments match filters', async () => {
    const input: GetUserPaymentsInput = {
      user_id: userId1,
      year: 2025 // Future year with no payments
    };

    const result = await getUserPayments(input);

    expect(result).toHaveLength(0);
  });

  it('should only return payments for specified user', async () => {
    const input: GetUserPaymentsInput = {
      user_id: userId2
    };

    const result = await getUserPayments(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toEqual(userId2);
    expect(result[0].amount).toEqual(45000.00);
    expect(result[0].month).toEqual(1);
    expect(result[0].year).toEqual(2024);

    // Verify it doesn't include user1's payments
    result.forEach(payment => {
      expect(payment.user_id).not.toEqual(userId1);
    });
  });

  it('should handle payments with null receipt_photo_url', async () => {
    const input: GetUserPaymentsInput = {
      user_id: userId1,
      month: 2,
      year: 2024
    };

    const result = await getUserPayments(input);

    expect(result).toHaveLength(1);
    expect(result[0].receipt_photo_url).toBeNull();
    expect(result[0].amount).toEqual(75000.50);
  });

  it('should verify all required fields are present', async () => {
    const input: GetUserPaymentsInput = {
      user_id: userId1
    };

    const result = await getUserPayments(input);

    expect(result).toHaveLength(3);
    result.forEach(payment => {
      expect(payment.id).toBeDefined();
      expect(payment.user_id).toBeDefined();
      expect(payment.amount).toBeDefined();
      expect(payment.payment_date).toBeInstanceOf(Date);
      expect(payment.month).toBeDefined();
      expect(payment.year).toBeDefined();
      expect(payment.recorded_by_admin_id).toBeDefined();
      expect(payment.created_at).toBeInstanceOf(Date);
      expect(payment.updated_at).toBeInstanceOf(Date);
      // receipt_photo_url can be null, so just check it exists as a property
      expect(payment).toHaveProperty('receipt_photo_url');
    });
  });
});