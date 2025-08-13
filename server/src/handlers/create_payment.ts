import { db } from '../db';
import { paymentsTable, usersTable } from '../db/schema';
import { type CreatePaymentInput, type Payment } from '../schema';
import { eq } from 'drizzle-orm';

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
  try {
    // Validate that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with ID ${input.user_id} not found`);
    }

    // Validate that the admin exists and has admin role
    const admin = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.recorded_by_admin_id))
      .limit(1)
      .execute();

    if (admin.length === 0) {
      throw new Error(`Admin with ID ${input.recorded_by_admin_id} not found`);
    }

    if (admin[0].role !== 'admin_kelurahan') {
      throw new Error(`User with ID ${input.recorded_by_admin_id} is not an admin`);
    }

    // Insert payment record
    const result = await db.insert(paymentsTable)
      .values({
        user_id: input.user_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        payment_date: input.payment_date,
        month: input.month,
        year: input.year,
        receipt_photo_url: input.receipt_photo_url,
        recorded_by_admin_id: input.recorded_by_admin_id
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
}