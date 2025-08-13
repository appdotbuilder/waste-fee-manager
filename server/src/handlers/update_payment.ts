import { db } from '../db';
import { paymentsTable } from '../db/schema';
import { type UpdatePaymentInput, type Payment } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePayment = async (input: UpdatePaymentInput): Promise<Payment> => {
  try {
    // First, check if the payment exists
    const existingPayment = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, input.id))
      .execute();

    if (existingPayment.length === 0) {
      throw new Error('Payment not found');
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.amount !== undefined) {
      updateData.amount = input.amount.toString();
    }
    if (input.payment_date !== undefined) {
      updateData.payment_date = input.payment_date;
    }
    if (input.month !== undefined) {
      updateData.month = input.month;
    }
    if (input.year !== undefined) {
      updateData.year = input.year;
    }
    if (input.receipt_photo_url !== undefined) {
      updateData.receipt_photo_url = input.receipt_photo_url;
    }

    // Update the payment record
    const result = await db.update(paymentsTable)
      .set(updateData)
      .where(eq(paymentsTable.id, input.id))
      .returning()
      .execute();

    const updatedPayment = result[0];
    
    // Convert numeric fields back to numbers before returning
    return {
      ...updatedPayment,
      amount: parseFloat(updatedPayment.amount)
    };
  } catch (error) {
    console.error('Payment update failed:', error);
    throw error;
  }
};