import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, paymentsTable, disputesTable } from '../db/schema';
import { type ResolveDisputeInput } from '../schema';
import { resolveDispute } from '../handlers/resolve_dispute';
import { eq } from 'drizzle-orm';


describe('resolveDispute', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let adminUserId: number;
  let citizenUserId: number;
  let paymentId: number;
  let disputeId: number;

  beforeEach(async () => {
    // Create admin user
    const adminUser = await db.insert(usersTable)
      .values({
        username: 'admin1',
        password_hash: 'hashed_password_123',
        role: 'admin_kelurahan',
        full_name: 'Admin User',
        nik: '1234567890123456',
        no_kk: '1234567890123456',
        home_address: 'Jl. Admin No. 1',
        rt: '001'
      })
      .returning()
      .execute();
    adminUserId = adminUser[0].id;

    // Create citizen user
    const citizenUser = await db.insert(usersTable)
      .values({
        username: 'citizen1',
        password_hash: 'hashed_password_123',
        role: 'warga',
        full_name: 'Citizen User',
        nik: '9876543210987654',
        no_kk: '9876543210987654',
        home_address: 'Jl. Citizen No. 1',
        rt: '002'
      })
      .returning()
      .execute();
    citizenUserId = citizenUser[0].id;

    // Create payment
    const payment = await db.insert(paymentsTable)
      .values({
        user_id: citizenUserId,
        amount: '50000',
        payment_date: new Date('2024-01-15'),
        month: 1,
        year: 2024,
        receipt_photo_url: 'https://example.com/receipt.jpg',
        recorded_by_admin_id: adminUserId
      })
      .returning()
      .execute();
    paymentId = payment[0].id;

    // Create dispute
    const dispute = await db.insert(disputesTable)
      .values({
        payment_id: paymentId,
        user_id: citizenUserId,
        dispute_reason: 'Payment amount is incorrect',
        evidence_photo_url: 'https://example.com/evidence.jpg',
        status: 'pending'
      })
      .returning()
      .execute();
    disputeId = dispute[0].id;
  });

  it('should resolve dispute successfully when admin approves', async () => {
    const input: ResolveDisputeInput = {
      id: disputeId,
      status: 'approved',
      admin_response: 'Dispute is valid. Payment amount will be corrected.',
      resolved_by_admin_id: adminUserId
    };

    const result = await resolveDispute(input);

    expect(result.id).toBe(disputeId);
    expect(result.status).toBe('approved');
    expect(result.admin_response).toBe('Dispute is valid. Payment amount will be corrected.');
    expect(result.resolved_by_admin_id).toBe(adminUserId);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify database was updated
    const updatedDispute = await db.select()
      .from(disputesTable)
      .where(eq(disputesTable.id, disputeId))
      .execute();

    expect(updatedDispute[0].status).toBe('approved');
    expect(updatedDispute[0].admin_response).toBe('Dispute is valid. Payment amount will be corrected.');
    expect(updatedDispute[0].resolved_by_admin_id).toBe(adminUserId);
  });

  it('should resolve dispute successfully when admin rejects', async () => {
    const input: ResolveDisputeInput = {
      id: disputeId,
      status: 'rejected',
      admin_response: 'Evidence provided is insufficient. Payment record is correct.',
      resolved_by_admin_id: adminUserId
    };

    const result = await resolveDispute(input);

    expect(result.id).toBe(disputeId);
    expect(result.status).toBe('rejected');
    expect(result.admin_response).toBe('Evidence provided is insufficient. Payment record is correct.');
    expect(result.resolved_by_admin_id).toBe(adminUserId);

    // Verify database was updated
    const updatedDispute = await db.select()
      .from(disputesTable)
      .where(eq(disputesTable.id, disputeId))
      .execute();

    expect(updatedDispute[0].status).toBe('rejected');
    expect(updatedDispute[0].admin_response).toBe('Evidence provided is insufficient. Payment record is correct.');
    expect(updatedDispute[0].resolved_by_admin_id).toBe(adminUserId);
  });

  it('should allow null admin response', async () => {
    const input: ResolveDisputeInput = {
      id: disputeId,
      status: 'approved',
      admin_response: null,
      resolved_by_admin_id: adminUserId
    };

    const result = await resolveDispute(input);

    expect(result.admin_response).toBeNull();

    // Verify database was updated
    const updatedDispute = await db.select()
      .from(disputesTable)
      .where(eq(disputesTable.id, disputeId))
      .execute();

    expect(updatedDispute[0].admin_response).toBeNull();
  });

  it('should throw error when dispute does not exist', async () => {
    const input: ResolveDisputeInput = {
      id: 99999, // Non-existent dispute ID
      status: 'approved',
      admin_response: 'Test response',
      resolved_by_admin_id: adminUserId
    };

    await expect(resolveDispute(input)).rejects.toThrow(/dispute not found/i);
  });

  it('should throw error when admin user does not exist', async () => {
    const input: ResolveDisputeInput = {
      id: disputeId,
      status: 'approved',
      admin_response: 'Test response',
      resolved_by_admin_id: 99999 // Non-existent admin ID
    };

    await expect(resolveDispute(input)).rejects.toThrow(/admin user not found/i);
  });

  it('should throw error when user is not admin', async () => {
    const input: ResolveDisputeInput = {
      id: disputeId,
      status: 'approved',
      admin_response: 'Test response',
      resolved_by_admin_id: citizenUserId // Citizen user trying to resolve
    };

    await expect(resolveDispute(input)).rejects.toThrow(/not authorized to resolve disputes/i);
  });

  it('should preserve original dispute data while updating resolution fields', async () => {
    const input: ResolveDisputeInput = {
      id: disputeId,
      status: 'approved',
      admin_response: 'Approved with corrections',
      resolved_by_admin_id: adminUserId
    };

    const result = await resolveDispute(input);

    // Check that original dispute data is preserved
    expect(result.payment_id).toBe(paymentId);
    expect(result.user_id).toBe(citizenUserId);
    expect(result.dispute_reason).toBe('Payment amount is incorrect');
    expect(result.evidence_photo_url).toBe('https://example.com/evidence.jpg');
    expect(result.created_at).toBeInstanceOf(Date);

    // Check that resolution fields are updated
    expect(result.status).toBe('approved');
    expect(result.admin_response).toBe('Approved with corrections');
    expect(result.resolved_by_admin_id).toBe(adminUserId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should handle resolving already resolved dispute', async () => {
    // First resolution
    const firstInput: ResolveDisputeInput = {
      id: disputeId,
      status: 'approved',
      admin_response: 'First resolution',
      resolved_by_admin_id: adminUserId
    };

    await resolveDispute(firstInput);

    // Second resolution (changing decision)
    const secondInput: ResolveDisputeInput = {
      id: disputeId,
      status: 'rejected',
      admin_response: 'Changed decision after review',
      resolved_by_admin_id: adminUserId
    };

    const result = await resolveDispute(secondInput);

    expect(result.status).toBe('rejected');
    expect(result.admin_response).toBe('Changed decision after review');

    // Verify database reflects the latest resolution
    const finalDispute = await db.select()
      .from(disputesTable)
      .where(eq(disputesTable.id, disputeId))
      .execute();

    expect(finalDispute[0].status).toBe('rejected');
    expect(finalDispute[0].admin_response).toBe('Changed decision after review');
  });
});