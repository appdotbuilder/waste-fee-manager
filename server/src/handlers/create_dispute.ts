import { db } from '../db';
import { disputesTable, paymentsTable } from '../db/schema';
import { type CreateDisputeInput, type Dispute } from '../schema';
import { eq } from 'drizzle-orm';

export async function createDispute(input: CreateDisputeInput): Promise<Dispute> {
  try {
    // Validate that the payment exists and belongs to the user
    const payment = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, input.payment_id))
      .execute();

    if (payment.length === 0) {
      throw new Error('Payment not found');
    }

    if (payment[0].user_id !== input.user_id) {
      throw new Error('Payment does not belong to this user');
    }

    // Insert dispute record
    const result = await db.insert(disputesTable)
      .values({
        payment_id: input.payment_id,
        user_id: input.user_id,
        dispute_reason: input.dispute_reason,
        evidence_photo_url: input.evidence_photo_url,
        status: 'pending' // Default status for new disputes
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Dispute creation failed:', error);
    throw error;
  }
}