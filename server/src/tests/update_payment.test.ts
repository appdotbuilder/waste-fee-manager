import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, paymentsTable } from '../db/schema';
import { type UpdatePaymentInput, type CreateUserInput, type CreatePaymentInput } from '../schema';
import { updatePayment } from '../handlers/update_payment';
import { eq } from 'drizzle-orm';

// Helper to create a test admin user
const createTestAdmin = async () => {
  const adminInput: CreateUserInput = {
    username: 'admin1',
    password: 'admin123',
    role: 'admin_kelurahan',
    full_name: 'Test Admin',
    nik: '1234567890123456',
    no_kk: '6543210987654321',
    home_address: 'Admin Street 1',
    rt: '001'
  };

  const result = await db.insert(usersTable)
    .values({
      username: adminInput.username,
      password_hash: 'hashed_admin123',
      role: adminInput.role,
      full_name: adminInput.full_name,
      nik: adminInput.nik,
      no_kk: adminInput.no_kk,
      home_address: adminInput.home_address,
      rt: adminInput.rt
    })
    .returning()
    .execute();

  return result[0];
};

// Helper to create a test user
const createTestUser = async () => {
  const userInput: CreateUserInput = {
    username: 'testuser',
    password: 'testpass',
    role: 'warga',
    full_name: 'Test User',
    nik: '1234567890123457',
    no_kk: '6543210987654322',
    home_address: 'Test Street 1',
    rt: '002'
  };

  const result = await db.insert(usersTable)
    .values({
      username: userInput.username,
      password_hash: 'hashed_testpass',
      role: userInput.role,
      full_name: userInput.full_name,
      nik: userInput.nik,
      no_kk: userInput.no_kk,
      home_address: userInput.home_address,
      rt: userInput.rt
    })
    .returning()
    .execute();

  return result[0];
};

// Helper to create a test payment
const createTestPayment = async (userId: number, adminId: number) => {
  const paymentInput: CreatePaymentInput = {
    user_id: userId,
    amount: 50000,
    payment_date: new Date('2024-01-15'),
    month: 1,
    year: 2024,
    receipt_photo_url: 'https://example.com/receipt.jpg',
    recorded_by_admin_id: adminId
  };

  const result = await db.insert(paymentsTable)
    .values({
      user_id: paymentInput.user_id,
      amount: paymentInput.amount.toString(),
      payment_date: paymentInput.payment_date,
      month: paymentInput.month,
      year: paymentInput.year,
      receipt_photo_url: paymentInput.receipt_photo_url,
      recorded_by_admin_id: paymentInput.recorded_by_admin_id
    })
    .returning()
    .execute();

  return result[0];
};

describe('updatePayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update a payment with all fields', async () => {
    // Create prerequisites
    const admin = await createTestAdmin();
    const user = await createTestUser();
    const payment = await createTestPayment(user.id, admin.id);

    const updateInput: UpdatePaymentInput = {
      id: payment.id,
      amount: 75000,
      payment_date: new Date('2024-02-20'),
      month: 2,
      year: 2024,
      receipt_photo_url: 'https://example.com/new-receipt.jpg'
    };

    const result = await updatePayment(updateInput);

    // Verify all fields are updated
    expect(result.id).toEqual(payment.id);
    expect(result.amount).toEqual(75000);
    expect(result.payment_date).toEqual(new Date('2024-02-20'));
    expect(result.month).toEqual(2);
    expect(result.year).toEqual(2024);
    expect(result.receipt_photo_url).toEqual('https://example.com/new-receipt.jpg');
    
    // Verify unchanged fields
    expect(result.user_id).toEqual(user.id);
    expect(result.recorded_by_admin_id).toEqual(admin.id);
    expect(result.created_at).toEqual(payment.created_at);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(payment.updated_at.getTime());
  });

  it('should update payment with partial fields', async () => {
    // Create prerequisites
    const admin = await createTestAdmin();
    const user = await createTestUser();
    const payment = await createTestPayment(user.id, admin.id);

    const originalAmount = parseFloat(payment.amount);
    const originalDate = payment.payment_date;

    const updateInput: UpdatePaymentInput = {
      id: payment.id,
      amount: 100000 // Only update amount
    };

    const result = await updatePayment(updateInput);

    // Verify only amount is updated
    expect(result.amount).toEqual(100000);
    expect(result.amount).not.toEqual(originalAmount);
    
    // Verify other fields remain unchanged
    expect(result.payment_date).toEqual(originalDate);
    expect(result.month).toEqual(payment.month);
    expect(result.year).toEqual(payment.year);
    expect(result.receipt_photo_url).toEqual(payment.receipt_photo_url);
    expect(result.user_id).toEqual(user.id);
    expect(result.recorded_by_admin_id).toEqual(admin.id);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update receipt_photo_url to null', async () => {
    // Create prerequisites
    const admin = await createTestAdmin();
    const user = await createTestUser();
    const payment = await createTestPayment(user.id, admin.id);

    const updateInput: UpdatePaymentInput = {
      id: payment.id,
      receipt_photo_url: null
    };

    const result = await updatePayment(updateInput);

    expect(result.receipt_photo_url).toBeNull();
    expect(result.amount).toEqual(parseFloat(payment.amount));
  });

  it('should save updated payment to database', async () => {
    // Create prerequisites
    const admin = await createTestAdmin();
    const user = await createTestUser();
    const payment = await createTestPayment(user.id, admin.id);

    const updateInput: UpdatePaymentInput = {
      id: payment.id,
      amount: 125000,
      month: 3
    };

    await updatePayment(updateInput);

    // Verify database was updated
    const updatedPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, payment.id))
      .execute();

    expect(updatedPayments).toHaveLength(1);
    const dbPayment = updatedPayments[0];
    expect(parseFloat(dbPayment.amount)).toEqual(125000);
    expect(dbPayment.month).toEqual(3);
    expect(dbPayment.year).toEqual(payment.year); // Unchanged
    expect(dbPayment.updated_at).toBeInstanceOf(Date);
    expect(dbPayment.updated_at.getTime()).toBeGreaterThan(payment.updated_at.getTime());
  });

  it('should verify numeric conversion works correctly', async () => {
    // Create prerequisites
    const admin = await createTestAdmin();
    const user = await createTestUser();
    const payment = await createTestPayment(user.id, admin.id);

    const updateInput: UpdatePaymentInput = {
      id: payment.id,
      amount: 99999.99
    };

    const result = await updatePayment(updateInput);

    // Verify numeric conversion
    expect(typeof result.amount).toBe('number');
    expect(result.amount).toEqual(99999.99);

    // Verify in database
    const dbPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, payment.id))
      .execute();

    expect(typeof dbPayments[0].amount).toBe('string'); // Stored as string
    expect(parseFloat(dbPayments[0].amount)).toEqual(99999.99);
  });

  it('should throw error for non-existent payment', async () => {
    const updateInput: UpdatePaymentInput = {
      id: 99999, // Non-existent ID
      amount: 50000
    };

    await expect(updatePayment(updateInput)).rejects.toThrow(/payment not found/i);
  });

  it('should handle date updates correctly', async () => {
    // Create prerequisites
    const admin = await createTestAdmin();
    const user = await createTestUser();
    const payment = await createTestPayment(user.id, admin.id);

    const newDate = new Date('2024-12-25');
    const updateInput: UpdatePaymentInput = {
      id: payment.id,
      payment_date: newDate,
      month: 12,
      year: 2024
    };

    const result = await updatePayment(updateInput);

    expect(result.payment_date).toEqual(newDate);
    expect(result.month).toEqual(12);
    expect(result.year).toEqual(2024);
  });
});