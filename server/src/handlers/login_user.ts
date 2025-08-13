import { eq } from 'drizzle-orm';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type LoginInput, type User } from '../schema';

export async function loginUser(input: LoginInput): Promise<User | null> {
  try {
    // Find user by username
    const result = await db.select()
      .from(usersTable)
      .where(eq(usersTable.username, input.username))
      .limit(1)
      .execute();

    if (result.length === 0) {
      return null; // User not found
    }

    const user = result[0];

    // Verify password using Bun's built-in password verification
    const isPasswordValid = await Bun.password.verify(input.password, user.password_hash);

    if (!isPasswordValid) {
      return null; // Invalid password
    }

    // Return user data (password hash excluded in the User type from schema)
    return {
      id: user.id,
      username: user.username,
      password_hash: user.password_hash,
      role: user.role,
      full_name: user.full_name,
      nik: user.nik,
      no_kk: user.no_kk,
      home_address: user.home_address,
      rt: user.rt,
      created_at: user.created_at,
      updated_at: user.updated_at
    };
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}