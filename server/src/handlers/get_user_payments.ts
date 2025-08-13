import { db } from '../db';
import { paymentsTable } from '../db/schema';
import { type GetUserPaymentsInput, type Payment } from '../schema';
import { eq, and, type SQL } from 'drizzle-orm';

export async function getUserPayments(input: GetUserPaymentsInput): Promise<Payment[]> {
  try {
    // Build conditions array
    const conditions: SQL<unknown>[] = [];
    
    // Always filter by user_id
    conditions.push(eq(paymentsTable.user_id, input.user_id));

    // Add year filter if provided
    if (input.year !== undefined) {
      conditions.push(eq(paymentsTable.year, input.year));
    }

    // Add month filter if provided
    if (input.month !== undefined) {
      conditions.push(eq(paymentsTable.month, input.month));
    }

    // Build and execute query in one step
    const results = await db.select()
      .from(paymentsTable)
      .where(conditions.length === 1 ? conditions[0] : and(...conditions))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Getting user payments failed:', error);
    throw error;
  }
}