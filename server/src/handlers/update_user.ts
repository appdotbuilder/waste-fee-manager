import { db } from '../db';
import { usersTable } from '../db/schema';
import { type UpdateUserInput, type User } from '../schema';
import { eq } from 'drizzle-orm';

export const updateUser = async (input: UpdateUserInput): Promise<User> => {
  try {
    // Check if user exists first
    const existingUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.id))
      .execute();

    if (existingUser.length === 0) {
      throw new Error('User not found');
    }

    // Build update object with only provided fields
    const updateData: Partial<typeof usersTable.$inferInsert> = {
      updated_at: new Date()
    };

    if (input.full_name !== undefined) {
      updateData.full_name = input.full_name;
    }
    if (input.nik !== undefined) {
      updateData.nik = input.nik;
    }
    if (input.no_kk !== undefined) {
      updateData.no_kk = input.no_kk;
    }
    if (input.home_address !== undefined) {
      updateData.home_address = input.home_address;
    }
    if (input.rt !== undefined) {
      updateData.rt = input.rt;
    }

    // Update the user record
    const result = await db.update(usersTable)
      .set(updateData)
      .where(eq(usersTable.id, input.id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('User update failed:', error);
    throw error;
  }
};