import { db } from '../db';
import { disputesTable, usersTable } from '../db/schema';
import { type ResolveDisputeInput, type Dispute } from '../schema';
import { eq, and } from 'drizzle-orm';

export async function resolveDispute(input: ResolveDisputeInput): Promise<Dispute> {
  try {
    // First, verify the admin user exists and has admin role
    const admin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.resolved_by_admin_id))
      .execute();

    if (admin.length === 0) {
      throw new Error('Admin user not found');
    }

    if (admin[0].role !== 'admin_kelurahan') {
      throw new Error('User is not authorized to resolve disputes');
    }

    // Get the existing dispute to validate it exists
    const existingDispute = await db.select()
      .from(disputesTable)
      .where(eq(disputesTable.id, input.id))
      .execute();

    if (existingDispute.length === 0) {
      throw new Error('Dispute not found');
    }

    // Update the dispute with resolution information
    const result = await db.update(disputesTable)
      .set({
        status: input.status,
        admin_response: input.admin_response,
        resolved_by_admin_id: input.resolved_by_admin_id,
        updated_at: new Date()
      })
      .where(eq(disputesTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Dispute resolution failed:', error);
    throw error;
  }
}