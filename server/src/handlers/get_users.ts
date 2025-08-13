import { db } from '../db';
import { usersTable } from '../db/schema';
import { type User } from '../schema';

export const getUsers = async (): Promise<User[]> => {
  try {
    // Fetch all users from database
    const results = await db.select()
      .from(usersTable)
      .execute();

    // Return users as-is (no numeric conversions needed for users table)
    return results;
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
  }
};