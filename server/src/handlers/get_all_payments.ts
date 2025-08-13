import { db } from '../db';
import { paymentsTable } from '../db/schema';
import { type Payment } from '../schema';

export const getAllPayments = async (): Promise<Payment[]> => {
  try {
    // Fetch all payment records from the database
    const results = await db.select()
      .from(paymentsTable)
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(payment => ({
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch all payments:', error);
    throw error;
  }
};