import { db } from '../db';
import { disputesTable } from '../db/schema';
import { type GetUserDisputesInput, type Dispute } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export async function getUserDisputes(input: GetUserDisputesInput): Promise<Dispute[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(disputesTable.user_id, input.user_id));

    // Add status filter if provided
    if (input.status) {
      conditions.push(eq(disputesTable.status, input.status));
    }

    // Build query with proper where clause
    const results = await db.select()
      .from(disputesTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();

    // Return results with proper date conversion
    return results;
  } catch (error) {
    console.error('Failed to get user disputes:', error);
    throw error;
  }
}