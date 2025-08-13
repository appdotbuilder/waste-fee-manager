import { db } from '../db';
import { disputesTable, usersTable, paymentsTable } from '../db/schema';
import { type Dispute } from '../schema';
import { eq } from 'drizzle-orm';

export const getAllDisputes = async (): Promise<Dispute[]> => {
  try {
    // Query disputes with related user and payment information via joins
    const results = await db.select()
      .from(disputesTable)
      .innerJoin(usersTable, eq(disputesTable.user_id, usersTable.id))
      .innerJoin(paymentsTable, eq(disputesTable.payment_id, paymentsTable.id))
      .execute();

    // Transform the joined results back to Dispute objects
    // Note: After joins, data is nested in result objects
    return results.map(result => ({
      id: result.disputes.id,
      payment_id: result.disputes.payment_id,
      user_id: result.disputes.user_id,
      dispute_reason: result.disputes.dispute_reason,
      evidence_photo_url: result.disputes.evidence_photo_url,
      status: result.disputes.status,
      admin_response: result.disputes.admin_response,
      resolved_by_admin_id: result.disputes.resolved_by_admin_id,
      created_at: result.disputes.created_at,
      updated_at: result.disputes.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch all disputes:', error);
    throw error;
  }
};