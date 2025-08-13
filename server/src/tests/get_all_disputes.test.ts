import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, paymentsTable, disputesTable } from '../db/schema';
import { type CreateUserInput, type CreatePaymentInput, type CreateDisputeInput } from '../schema';
import { getAllDisputes } from '../handlers/get_all_disputes';

// Test data
const adminUser: CreateUserInput = {
  username: 'admin_test',
  password: 'password123',
  role: 'admin_kelurahan',
  full_name: 'Admin User',
  nik: '1234567890123456',
  no_kk: '6543210987654321',
  home_address: 'Admin Address',
  rt: '001'
};

const regularUser: CreateUserInput = {
  username: 'user_test',
  password: 'password123',
  role: 'warga',
  full_name: 'Regular User',
  nik: '9876543210987654',
  no_kk: '1234567890123456',
  home_address: 'User Address',
  rt: '002'
};

const secondUser: CreateUserInput = {
  username: 'user_test_2',
  password: 'password123',
  role: 'warga',
  full_name: 'Second User',
  nik: '5555555555555555',
  no_kk: '4444444444444444',
  home_address: 'Second User Address',
  rt: '003'
};

describe('getAllDisputes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no disputes exist', async () => {
    const result = await getAllDisputes();
    expect(result).toEqual([]);
  });

  it('should return all disputes with correct structure', async () => {
    // Create prerequisite data
    const hashedPassword = 'mock_hashed_password';
    
    // Insert admin user
    const adminResult = await db.insert(usersTable)
      .values({
        ...adminUser,
        password_hash: hashedPassword
      })
      .returning()
      .execute();
    const admin = adminResult[0];

    // Insert regular user
    const userResult = await db.insert(usersTable)
      .values({
        ...regularUser,
        password_hash: hashedPassword
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Insert payment
    const paymentInput: CreatePaymentInput = {
      user_id: user.id,
      amount: 50000,
      payment_date: new Date('2024-01-15'),
      month: 1,
      year: 2024,
      receipt_photo_url: 'https://example.com/receipt.jpg',
      recorded_by_admin_id: admin.id
    };

    const paymentResult = await db.insert(paymentsTable)
      .values({
        ...paymentInput,
        amount: paymentInput.amount.toString()
      })
      .returning()
      .execute();
    const payment = paymentResult[0];

    // Insert dispute
    const disputeInput: CreateDisputeInput = {
      payment_id: payment.id,
      user_id: user.id,
      dispute_reason: 'Payment amount is incorrect',
      evidence_photo_url: 'https://example.com/evidence.jpg'
    };

    await db.insert(disputesTable)
      .values(disputeInput)
      .execute();

    // Test the handler
    const result = await getAllDisputes();

    expect(result).toHaveLength(1);
    
    const dispute = result[0];
    expect(dispute.id).toBeDefined();
    expect(dispute.payment_id).toEqual(payment.id);
    expect(dispute.user_id).toEqual(user.id);
    expect(dispute.dispute_reason).toEqual('Payment amount is incorrect');
    expect(dispute.evidence_photo_url).toEqual('https://example.com/evidence.jpg');
    expect(dispute.status).toEqual('pending');
    expect(dispute.admin_response).toBeNull();
    expect(dispute.resolved_by_admin_id).toBeNull();
    expect(dispute.created_at).toBeInstanceOf(Date);
    expect(dispute.updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple disputes from different users', async () => {
    // Create prerequisite data
    const hashedPassword = 'mock_hashed_password';
    
    // Insert admin user
    const adminResult = await db.insert(usersTable)
      .values({
        ...adminUser,
        password_hash: hashedPassword
      })
      .returning()
      .execute();
    const admin = adminResult[0];

    // Insert first user
    const firstUserResult = await db.insert(usersTable)
      .values({
        ...regularUser,
        password_hash: hashedPassword
      })
      .returning()
      .execute();
    const firstUser = firstUserResult[0];

    // Insert second user
    const secondUserResult = await db.insert(usersTable)
      .values({
        ...secondUser,
        password_hash: hashedPassword
      })
      .returning()
      .execute();
    const secondUserData = secondUserResult[0];

    // Insert payments for both users
    const firstPaymentResult = await db.insert(paymentsTable)
      .values({
        user_id: firstUser.id,
        amount: '50000',
        payment_date: new Date('2024-01-15'),
        month: 1,
        year: 2024,
        receipt_photo_url: 'https://example.com/receipt1.jpg',
        recorded_by_admin_id: admin.id
      })
      .returning()
      .execute();

    const secondPaymentResult = await db.insert(paymentsTable)
      .values({
        user_id: secondUserData.id,
        amount: '75000',
        payment_date: new Date('2024-02-15'),
        month: 2,
        year: 2024,
        receipt_photo_url: 'https://example.com/receipt2.jpg',
        recorded_by_admin_id: admin.id
      })
      .returning()
      .execute();

    // Insert disputes for both users
    await db.insert(disputesTable)
      .values({
        payment_id: firstPaymentResult[0].id,
        user_id: firstUser.id,
        dispute_reason: 'First dispute reason',
        evidence_photo_url: 'https://example.com/evidence1.jpg'
      })
      .execute();

    await db.insert(disputesTable)
      .values({
        payment_id: secondPaymentResult[0].id,
        user_id: secondUserData.id,
        dispute_reason: 'Second dispute reason',
        evidence_photo_url: 'https://example.com/evidence2.jpg'
      })
      .execute();

    // Test the handler
    const result = await getAllDisputes();

    expect(result).toHaveLength(2);
    
    // Check that both disputes are returned
    const disputeReasons = result.map(d => d.dispute_reason).sort();
    expect(disputeReasons).toEqual(['First dispute reason', 'Second dispute reason']);
    
    // Verify all disputes have required fields
    result.forEach(dispute => {
      expect(dispute.id).toBeDefined();
      expect(dispute.payment_id).toBeDefined();
      expect(dispute.user_id).toBeDefined();
      expect(dispute.dispute_reason).toBeDefined();
      expect(dispute.status).toEqual('pending');
      expect(dispute.created_at).toBeInstanceOf(Date);
      expect(dispute.updated_at).toBeInstanceOf(Date);
    });
  });

  it('should return disputes with different statuses', async () => {
    // Create prerequisite data
    const hashedPassword = 'mock_hashed_password';
    
    // Insert admin user
    const adminResult = await db.insert(usersTable)
      .values({
        ...adminUser,
        password_hash: hashedPassword
      })
      .returning()
      .execute();
    const admin = adminResult[0];

    // Insert regular user
    const userResult = await db.insert(usersTable)
      .values({
        ...regularUser,
        password_hash: hashedPassword
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Insert multiple payments
    const payment1Result = await db.insert(paymentsTable)
      .values({
        user_id: user.id,
        amount: '50000',
        payment_date: new Date('2024-01-15'),
        month: 1,
        year: 2024,
        receipt_photo_url: 'https://example.com/receipt1.jpg',
        recorded_by_admin_id: admin.id
      })
      .returning()
      .execute();

    const payment2Result = await db.insert(paymentsTable)
      .values({
        user_id: user.id,
        amount: '60000',
        payment_date: new Date('2024-02-15'),
        month: 2,
        year: 2024,
        receipt_photo_url: 'https://example.com/receipt2.jpg',
        recorded_by_admin_id: admin.id
      })
      .returning()
      .execute();

    // Insert disputes with different statuses
    await db.insert(disputesTable)
      .values({
        payment_id: payment1Result[0].id,
        user_id: user.id,
        dispute_reason: 'Pending dispute',
        evidence_photo_url: 'https://example.com/evidence1.jpg',
        status: 'pending'
      })
      .execute();

    await db.insert(disputesTable)
      .values({
        payment_id: payment2Result[0].id,
        user_id: user.id,
        dispute_reason: 'Approved dispute',
        evidence_photo_url: 'https://example.com/evidence2.jpg',
        status: 'approved',
        admin_response: 'Dispute approved - payment corrected',
        resolved_by_admin_id: admin.id
      })
      .execute();

    // Test the handler
    const result = await getAllDisputes();

    expect(result).toHaveLength(2);
    
    // Find disputes by status
    const pendingDispute = result.find(d => d.status === 'pending');
    const approvedDispute = result.find(d => d.status === 'approved');
    
    expect(pendingDispute).toBeDefined();
    expect(pendingDispute!.admin_response).toBeNull();
    expect(pendingDispute!.resolved_by_admin_id).toBeNull();
    
    expect(approvedDispute).toBeDefined();
    expect(approvedDispute!.admin_response).toEqual('Dispute approved - payment corrected');
    expect(approvedDispute!.resolved_by_admin_id).toEqual(admin.id);
  });

  it('should handle disputes without evidence photo', async () => {
    // Create prerequisite data
    const hashedPassword = 'mock_hashed_password';
    
    // Insert admin and user
    const adminResult = await db.insert(usersTable)
      .values({
        ...adminUser,
        password_hash: hashedPassword
      })
      .returning()
      .execute();
    const admin = adminResult[0];

    const userResult = await db.insert(usersTable)
      .values({
        ...regularUser,
        password_hash: hashedPassword
      })
      .returning()
      .execute();
    const user = userResult[0];

    // Insert payment
    const paymentResult = await db.insert(paymentsTable)
      .values({
        user_id: user.id,
        amount: '50000',
        payment_date: new Date('2024-01-15'),
        month: 1,
        year: 2024,
        receipt_photo_url: null,
        recorded_by_admin_id: admin.id
      })
      .returning()
      .execute();
    const payment = paymentResult[0];

    // Insert dispute without evidence photo
    await db.insert(disputesTable)
      .values({
        payment_id: payment.id,
        user_id: user.id,
        dispute_reason: 'Dispute without photo evidence',
        evidence_photo_url: null
      })
      .execute();

    // Test the handler
    const result = await getAllDisputes();

    expect(result).toHaveLength(1);
    expect(result[0].evidence_photo_url).toBeNull();
    expect(result[0].dispute_reason).toEqual('Dispute without photo evidence');
  });
});