import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, paymentsTable, disputesTable } from '../db/schema';
import { type GetUserDisputesInput } from '../schema';
import { getUserDisputes } from '../handlers/get_user_disputes';

describe('getUserDisputes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let userId1: number;
  let userId2: number;
  let adminId: number;
  let paymentId1: number;
  let paymentId2: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable).values([
      {
        username: 'warga1',
        password_hash: 'hashed_password',
        role: 'warga',
        full_name: 'Test Warga 1',
        nik: '1234567890123456',
        no_kk: '1234567890123456',
        home_address: 'Jl. Test 1',
        rt: '001'
      },
      {
        username: 'warga2',
        password_hash: 'hashed_password',
        role: 'warga',
        full_name: 'Test Warga 2',
        nik: '2345678901234567',
        no_kk: '2345678901234567',
        home_address: 'Jl. Test 2',
        rt: '002'
      },
      {
        username: 'admin1',
        password_hash: 'hashed_password',
        role: 'admin_kelurahan',
        full_name: 'Test Admin',
        nik: '3456789012345678',
        no_kk: '3456789012345678',
        home_address: 'Jl. Admin',
        rt: '001'
      }
    ]).returning().execute();

    userId1 = users[0].id;
    userId2 = users[1].id;
    adminId = users[2].id;

    // Create test payments
    const payments = await db.insert(paymentsTable).values([
      {
        user_id: userId1,
        amount: '100000.00',
        payment_date: new Date('2024-01-15'),
        month: 1,
        year: 2024,
        receipt_photo_url: 'https://example.com/receipt1.jpg',
        recorded_by_admin_id: adminId
      },
      {
        user_id: userId2,
        amount: '150000.00',
        payment_date: new Date('2024-02-15'),
        month: 2,
        year: 2024,
        receipt_photo_url: 'https://example.com/receipt2.jpg',
        recorded_by_admin_id: adminId
      }
    ]).returning().execute();

    paymentId1 = payments[0].id;
    paymentId2 = payments[1].id;
  });

  it('should return disputes for a specific user', async () => {
    // Create test disputes
    await db.insert(disputesTable).values([
      {
        payment_id: paymentId1,
        user_id: userId1,
        dispute_reason: 'Payment amount incorrect',
        evidence_photo_url: 'https://example.com/evidence1.jpg',
        status: 'pending'
      },
      {
        payment_id: paymentId2,
        user_id: userId2,
        dispute_reason: 'Payment date wrong',
        evidence_photo_url: 'https://example.com/evidence2.jpg',
        status: 'approved'
      }
    ]).execute();

    const input: GetUserDisputesInput = {
      user_id: userId1
    };

    const result = await getUserDisputes(input);

    expect(result).toHaveLength(1);
    expect(result[0].user_id).toBe(userId1);
    expect(result[0].payment_id).toBe(paymentId1);
    expect(result[0].dispute_reason).toBe('Payment amount incorrect');
    expect(result[0].status).toBe('pending');
    expect(result[0].evidence_photo_url).toBe('https://example.com/evidence1.jpg');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should filter disputes by status', async () => {
    // Create multiple disputes with different statuses
    await db.insert(disputesTable).values([
      {
        payment_id: paymentId1,
        user_id: userId1,
        dispute_reason: 'First dispute',
        status: 'pending'
      },
      {
        payment_id: paymentId1,
        user_id: userId1,
        dispute_reason: 'Second dispute',
        status: 'approved'
      }
    ]).execute();

    const inputPending: GetUserDisputesInput = {
      user_id: userId1,
      status: 'pending'
    };

    const pendingResults = await getUserDisputes(inputPending);
    expect(pendingResults).toHaveLength(1);
    expect(pendingResults[0].status).toBe('pending');
    expect(pendingResults[0].dispute_reason).toBe('First dispute');

    const inputApproved: GetUserDisputesInput = {
      user_id: userId1,
      status: 'approved'
    };

    const approvedResults = await getUserDisputes(inputApproved);
    expect(approvedResults).toHaveLength(1);
    expect(approvedResults[0].status).toBe('approved');
    expect(approvedResults[0].dispute_reason).toBe('Second dispute');
  });

  it('should return empty array when user has no disputes', async () => {
    const input: GetUserDisputesInput = {
      user_id: userId1
    };

    const result = await getUserDisputes(input);
    expect(result).toHaveLength(0);
  });

  it('should return empty array when no disputes match status filter', async () => {
    // Create dispute with different status
    await db.insert(disputesTable).values({
      payment_id: paymentId1,
      user_id: userId1,
      dispute_reason: 'Test dispute',
      status: 'pending'
    }).execute();

    const input: GetUserDisputesInput = {
      user_id: userId1,
      status: 'rejected'
    };

    const result = await getUserDisputes(input);
    expect(result).toHaveLength(0);
  });

  it('should handle multiple disputes for same user', async () => {
    // Create multiple disputes for the same user
    await db.insert(disputesTable).values([
      {
        payment_id: paymentId1,
        user_id: userId1,
        dispute_reason: 'First dispute',
        status: 'pending'
      },
      {
        payment_id: paymentId1,
        user_id: userId1,
        dispute_reason: 'Second dispute',
        status: 'approved'
      },
      {
        payment_id: paymentId1,
        user_id: userId1,
        dispute_reason: 'Third dispute',
        status: 'rejected'
      }
    ]).execute();

    const input: GetUserDisputesInput = {
      user_id: userId1
    };

    const result = await getUserDisputes(input);
    expect(result).toHaveLength(3);
    
    // Verify all disputes belong to the correct user
    result.forEach(dispute => {
      expect(dispute.user_id).toBe(userId1);
    });

    // Verify different statuses are returned
    const statuses = result.map(d => d.status).sort();
    expect(statuses).toEqual(['approved', 'pending', 'rejected']);
  });

  it('should handle disputes with null optional fields', async () => {
    // Create dispute without optional fields
    await db.insert(disputesTable).values({
      payment_id: paymentId1,
      user_id: userId1,
      dispute_reason: 'Dispute without evidence',
      evidence_photo_url: null,
      status: 'pending'
    }).execute();

    const input: GetUserDisputesInput = {
      user_id: userId1
    };

    const result = await getUserDisputes(input);
    expect(result).toHaveLength(1);
    expect(result[0].evidence_photo_url).toBeNull();
    expect(result[0].admin_response).toBeNull();
    expect(result[0].resolved_by_admin_id).toBeNull();
  });
});