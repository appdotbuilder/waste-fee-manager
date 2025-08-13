import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, paymentsTable, disputesTable } from '../db/schema';
import { type CreateDisputeInput } from '../schema';
import { createDispute } from '../handlers/create_dispute';
import { eq } from 'drizzle-orm';

describe('createDispute', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test setup data
  let testUser: any;
  let testAdmin: any;
  let testPayment: any;

  const setupTestData = async () => {
    // Create test user (warga)
    const userResult = await db.insert(usersTable)
      .values({
        username: 'testuser',
        password_hash: 'hashed_password',
        role: 'warga',
        full_name: 'Test User',
        nik: '1234567890123456',
        no_kk: '1234567890123456',
        home_address: 'Jl. Test No. 123',
        rt: '001'
      })
      .returning()
      .execute();
    testUser = userResult[0];

    // Create test admin
    const adminResult = await db.insert(usersTable)
      .values({
        username: 'testadmin',
        password_hash: 'hashed_password',
        role: 'admin_kelurahan',
        full_name: 'Test Admin',
        nik: '6543210987654321',
        no_kk: '6543210987654321',
        home_address: 'Jl. Admin No. 456',
        rt: '002'
      })
      .returning()
      .execute();
    testAdmin = adminResult[0];

    // Create test payment
    const paymentResult = await db.insert(paymentsTable)
      .values({
        user_id: testUser.id,
        amount: '50000.00',
        payment_date: new Date('2024-01-15'),
        month: 1,
        year: 2024,
        receipt_photo_url: 'https://example.com/receipt.jpg',
        recorded_by_admin_id: testAdmin.id
      })
      .returning()
      .execute();
    testPayment = paymentResult[0];
  };

  it('should create a dispute successfully', async () => {
    await setupTestData();

    const disputeInput: CreateDisputeInput = {
      payment_id: testPayment.id,
      user_id: testUser.id,
      dispute_reason: 'Payment amount is incorrect. I only paid 30,000 but it shows 50,000.',
      evidence_photo_url: 'https://example.com/evidence.jpg'
    };

    const result = await createDispute(disputeInput);

    // Validate basic fields
    expect(result.id).toBeDefined();
    expect(result.payment_id).toEqual(testPayment.id);
    expect(result.user_id).toEqual(testUser.id);
    expect(result.dispute_reason).toEqual(disputeInput.dispute_reason);
    expect(result.evidence_photo_url).toEqual(disputeInput.evidence_photo_url);
    expect(result.status).toEqual('pending');
    expect(result.admin_response).toBeNull();
    expect(result.resolved_by_admin_id).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save dispute to database', async () => {
    await setupTestData();

    const disputeInput: CreateDisputeInput = {
      payment_id: testPayment.id,
      user_id: testUser.id,
      dispute_reason: 'Payment date is wrong. I paid on January 20th, not 15th.',
      evidence_photo_url: 'https://example.com/date_proof.jpg'
    };

    const result = await createDispute(disputeInput);

    // Query the database to verify the dispute was saved
    const savedDisputes = await db.select()
      .from(disputesTable)
      .where(eq(disputesTable.id, result.id))
      .execute();

    expect(savedDisputes).toHaveLength(1);
    const savedDispute = savedDisputes[0];
    expect(savedDispute.payment_id).toEqual(testPayment.id);
    expect(savedDispute.user_id).toEqual(testUser.id);
    expect(savedDispute.dispute_reason).toEqual(disputeInput.dispute_reason);
    expect(savedDispute.evidence_photo_url).toEqual(disputeInput.evidence_photo_url);
    expect(savedDispute.status).toEqual('pending');
    expect(savedDispute.admin_response).toBeNull();
    expect(savedDispute.resolved_by_admin_id).toBeNull();
  });

  it('should create dispute without evidence photo', async () => {
    await setupTestData();

    const disputeInput: CreateDisputeInput = {
      payment_id: testPayment.id,
      user_id: testUser.id,
      dispute_reason: 'No receipt was provided but payment was recorded.',
      evidence_photo_url: null
    };

    const result = await createDispute(disputeInput);

    expect(result.evidence_photo_url).toBeNull();
    expect(result.dispute_reason).toEqual(disputeInput.dispute_reason);
    expect(result.status).toEqual('pending');
  });

  it('should throw error when payment does not exist', async () => {
    await setupTestData();

    const disputeInput: CreateDisputeInput = {
      payment_id: 99999, // Non-existent payment ID
      user_id: testUser.id,
      dispute_reason: 'This payment does not exist',
      evidence_photo_url: null
    };

    await expect(createDispute(disputeInput))
      .rejects
      .toThrow(/payment not found/i);
  });

  it('should throw error when payment does not belong to user', async () => {
    await setupTestData();

    // Create another user
    const anotherUserResult = await db.insert(usersTable)
      .values({
        username: 'anotheruser',
        password_hash: 'hashed_password',
        role: 'warga',
        full_name: 'Another User',
        nik: '9876543210123456',
        no_kk: '9876543210123456',
        home_address: 'Jl. Another No. 789',
        rt: '003'
      })
      .returning()
      .execute();
    const anotherUser = anotherUserResult[0];

    const disputeInput: CreateDisputeInput = {
      payment_id: testPayment.id, // Payment belongs to testUser
      user_id: anotherUser.id, // But trying to create dispute as anotherUser
      dispute_reason: 'This is not my payment',
      evidence_photo_url: null
    };

    await expect(createDispute(disputeInput))
      .rejects
      .toThrow(/payment does not belong to this user/i);
  });

  it('should create multiple disputes for the same payment', async () => {
    await setupTestData();

    const disputeInput1: CreateDisputeInput = {
      payment_id: testPayment.id,
      user_id: testUser.id,
      dispute_reason: 'First dispute: Amount is wrong',
      evidence_photo_url: 'https://example.com/evidence1.jpg'
    };

    const disputeInput2: CreateDisputeInput = {
      payment_id: testPayment.id,
      user_id: testUser.id,
      dispute_reason: 'Second dispute: Date is also wrong',
      evidence_photo_url: 'https://example.com/evidence2.jpg'
    };

    const dispute1 = await createDispute(disputeInput1);
    const dispute2 = await createDispute(disputeInput2);

    // Both disputes should be created successfully
    expect(dispute1.id).not.toEqual(dispute2.id);
    expect(dispute1.dispute_reason).toEqual(disputeInput1.dispute_reason);
    expect(dispute2.dispute_reason).toEqual(disputeInput2.dispute_reason);
    
    // Verify both exist in database
    const allDisputes = await db.select()
      .from(disputesTable)
      .where(eq(disputesTable.payment_id, testPayment.id))
      .execute();

    expect(allDisputes).toHaveLength(2);
  });
});